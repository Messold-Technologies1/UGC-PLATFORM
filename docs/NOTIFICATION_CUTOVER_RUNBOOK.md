# Notification cutover runbook

**Applies to:** the change that moves sending from the legacy `mail/` +
`whatsapp/` notifiers to the notification engine.
**Plan:** `docs/NOTIFICATION_SYSTEM_PLAN.md` (P4).

> **Nothing in this system has run against a real database yet.** The migration
> is unapplied, the seeders are verified by dry run and unit tests only, and no
> queue job has ever executed. Work through this on staging first.

---

## How the switch works

One flag decides which path sends: **`NOTIFICATIONS_SENDING_ENABLED`**.

| Value | Legacy notifiers | Engine |
|---|---|---|
| unset / `false` (default) | **send**, exactly as today | runs and records what it *would* send |
| `true` | **stand down** | **sends** |

Both paths are deployed together and read the same flag, so the cutover is a
config change and the rollback is the same change reversed. No deploy either way.

Only the exact string `true` switches over — `TRUE` and `1` leave the legacy
path in charge, which is deliberate.

---

## 1 · Deploy (no behaviour change)

Deploy with the flag unset. At this point:

- The registry sync writes the ~31 events into `NotificationEvent` at boot.
- `emit()` runs alongside every legacy `notify*` call.
- The engine resolves recipients, renders and logs — then stops, recording
  `SKIPPED / sending_disabled` instead of calling a provider.
- Users see no change.

```bash
npx prisma migrate deploy          # the notification tables
```

**No seeding step.** `NotificationBootstrapService` runs on every boot: it syncs
the event catalog, then imports the bundled `.hbs` files, splits the two stage
templates, links each event to its template, and creates one immediate schedule
row per event carrying **both** channels — reproducing today's behaviour, where
every email fires its WhatsApp twin.

It was a manual script, and the manual step is exactly what got missed: the
admin template list came up empty on the first deploy while the renderer quietly
fell back to the files on disk. Working, but uneditable.

The import is idempotent and protects admin edits: a template with
`updatedByUserId` set is never overwritten, and event links and schedule rows
are only ever created, never rewritten. Both the API and the worker boot it, so
it runs under a transaction-scoped advisory lock — whichever process arrives
first does the work.

`npm run prisma:seed:notification-templates` still exists for running the import
by hand against a database the app is not pointed at. It shares its logic with
the boot path, so the two cannot drift.

**Check:** 37 templates, 31 events, and a schedule row per event.

```sql
SELECT count(*) FROM "NotificationTemplate";                  -- 37
SELECT count(*) FROM "NotificationEvent" WHERE NOT deprecated; -- 31
SELECT count(*) FROM "NotificationSchedule";                   -- 36
```

*(34 rather than 31: the two drips carry 4 and 3 rows.)*

---

## 2 · Watch shadow mode

Leave it for a day of real traffic, then compare what the engine decided
against what the legacy path actually sent.

```sql
-- What would have gone out, by event.
SELECT "eventKey", channel, count(*)
FROM "NotificationLog"
WHERE "queuedAt" > now() - interval '24 hours'
GROUP BY 1, 2 ORDER BY 3 DESC;

-- Anything the engine decided NOT to send, and why. Read this carefully:
-- 'sending_disabled' is expected; everything else is a real difference.
SELECT "skippedReason", count(*)
FROM "NotificationLog"
WHERE status = 'SKIPPED' AND "queuedAt" > now() - interval '24 hours'
GROUP BY 1 ORDER BY 2 DESC;
```

**What to look for**

| Reason | Meaning |
|---|---|
| `sending_disabled` | Expected — shadow mode. Should dominate. |
| `opted_out` | Fine. The legacy path skips these too. |
| `suppressed` | Fine. Bounced address. |
| `entity_gone`, `no_recipient` | Investigate — the resolver may be wrong. |
| `user_inactive` | **New behaviour.** The legacy path *did* mail suspended and deactivated accounts; the engine does not. |
| `row_removed`, `event_inactive` | Someone turned it off in admin. |

Also compare the counts against your SES and WhatsApp dashboards for the same
window. A materially lower engine count means an event is not emitting.

---

## 3 · Backfill the drip history — **do not skip this**

The two reminder drips are mid-flight for real creators. Both paths measure
offsets from the same clock, so a creator three days into the completion drip
has already had the 30min, 24h and 3d emails — and the engine's rows for those
offsets are unclaimed.

**Without this step, flipping the flag re-sends every stage they have already
received.**

```bash
npm run prisma:backfill:notification-drip-log -- --dry-run   # counts only
npm run prisma:backfill:notification-drip-log
```

It turns each `completionReminder*At` and `resubmitReminder*At` stamp into a
`SENT` log row at the matching offset, which the claim then refuses. Idempotent —
re-running writes nothing new.

**Check:** no creator with stamps is missing log rows.

```sql
SELECT count(*) FROM "NotificationLog"
WHERE "eventKey" = 'creator-profile-completion-reminder' AND status = 'SENT';
```

---

## 4 · Flip it

```bash
NOTIFICATIONS_SENDING_ENABLED=true
```

Restart the API and the worker. From this moment the engine sends and the legacy
notifiers no-op.

**Watch for the first hour**

```sql
-- Should be SENT, not SKIPPED / sending_disabled.
SELECT status, count(*) FROM "NotificationLog"
WHERE "queuedAt" > now() - interval '1 hour' GROUP BY 1;

-- Failures, with the provider's own message.
SELECT "eventKey", channel, "errorMessage", count(*)
FROM "NotificationLog"
WHERE status = 'FAILED' AND "queuedAt" > now() - interval '1 hour'
GROUP BY 1, 2, 3;
```

**Specifically confirm:**

- An order event produces **two** rows (email + WhatsApp), both `SENT`.
- WhatsApp rows get a `providerMessageId` (a `wamid.…`), then move to
  `DELIVERED` as Meta's webhook lands.
- No `FAILED` row mentioning a template name — that means a WhatsApp template
  name does not match what is approved in WhatsApp Manager.

---

## Rollback

```bash
NOTIFICATIONS_SENDING_ENABLED=false   # and restart
```

The legacy notifiers resume immediately. Nothing else needs undoing: log rows
written by the engine are inert once it stops sending, and the backfill rows
stay correct for the next attempt.

---

## Known behaviour changes

These are intended, but they are changes — confirm each is wanted before step 4.

1. **Suspended and deactivated accounts stop receiving mail.** Nothing checked
   `User.status` before; the engine skips with `user_inactive`.
2. **A suppressed email address no longer mutes the WhatsApp message.** The
   legacy path threw before reaching the WhatsApp call, so both were lost. The
   engine sends each channel independently.
3. **Password reset stays on the legacy path** and is unaffected by the flag.
   Only the token's hash is stored, so a send-time resolve cannot rebuild the
   reset link. Its template is still editable in admin.
4. **`creator-profile-rejected` has no caller** — in either path. The event and
   template exist and are configurable, but nothing emits it, so the rejection
   email does not send today and will not after the cutover. Wiring it up is a
   product decision, not part of this migration.

---

## The completion-reminder catch-up

New signups are handled automatically: signup emits, and the drip runs from
delayed jobs.

Creators who signed up **before** any of this existed were never emitted for, so
they will never hear from it. Reaching them is a button on the event page, not
something that happens on its own:

**Admin → Notifications → Events → creator-profile-completion-reminder →
Send to older profiles → Check how many are waiting**

It reports the count and sends nothing until you confirm. Each creator receives
**one** email — the latest stage they have passed, not every stage at once.

This is deliberately manual. On a backlog of any size it is the largest send
this platform will have done, and it should be a decision taken with the number
in front of you rather than a cron firing at 10am.

**Before confirming**, consider unticking WhatsApp on those rows until the
backlog has drained. A backlog above your WhatsApp 24h conversation cap will not
queue — the excess **fails**, and those failures hurt the quality rating that
also governs order notifications. Email goes through the bulk lane at 120/min,
so a 10k backlog drains over roughly 90 minutes without touching transactional
sends.

---

## After it has held

P5 deletes the legacy path: the three notifiers, `whatsapp-bridge.util.ts`,
`EmailTemplateKey`, the disk template fallback, the reminder job set and its
columns. **Keep the disk fallback for at least as long as the longest offset
(7 days)** after the flip, so delayed jobs enqueued under the old system have
fully drained.
