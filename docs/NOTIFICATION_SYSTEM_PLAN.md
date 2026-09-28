# Admin-Configurable Notification System — Technical Plan

**Status:** Draft for review · **Date:** 2026-09-28 · **Scope:** `server/` + `client/app/admin`

Replaces the hardcoded `mail/` + `whatsapp/` notifier layer with a small admin-configurable engine:
**code declares the events, admin owns the templates, channels and timing.**

---

## 1. What this is

| | |
|---|---|
| **Events** | Declared in code. Synced to a DB table on boot so the admin list is always current. |
| **Templates** | Email templates live in the DB and are editable in admin. WhatsApp copy stays in WhatsApp Manager — only the template *name* is stored here. |
| **Naming** | Template names default to the event key. `order-brief-submitted-for-creator` → email template of the same name, WhatsApp template `order_brief_submitted_for_creator`. Overridable. |
| **Timing** | Per event, a list of send rows: `0` = now, then any minutes / hours / days. |
| **Channels** | Chosen **per row** — email only, WhatsApp only, or both. This breaks today's lockstep. |
| **On/off** | Active toggle per event and per row. |

### Explicitly out of scope

Marketing campaigns and broadcast sends, audience segments, `marketingOptOut` / unsubscribe,
quiet hours, per-entity variable providers, admin-defined cancel rules, sequence-run tables,
a WhatsApp template table, and a runtime settings table. Cut deliberately — see §10.

### Decisions locked

| # | Decision |
|---|---|
| 1 | `notifications/` module inside `server/src/`, run as a **separate process** via a second entry point + `BULLMQ_WORKER_ENABLED` |
| 2 | Code-declared event catalog, synced to DB; admin configures templates, channels, timing |
| 3 | WhatsApp = Meta template **name only**; copy authored in WhatsApp Manager |
| 4 | Event key is the default template name for both channels |
| 5 | Timing = a list of offsets; **each row picks its own channels**. 30 of 32 events are a single `0` row — send immediately on trigger (§3.3) |
| 6 | Keep: `stillRelevant` guard, delivery log, template validation, template version history |
| 7 | Cut: campaigns, segments, quiet hours, entity providers, admin cancel rules |
| 8 | **Only `password-reset` bypasses the opt-in booleans.** Every other event respects them |
| 9 | Stage-switching templates are **split into one template per schedule row** (§3.3) |
| 10 | The completion reminder sweeps **all** building profiles, batched — no time window (§3.6) |
| 11 | **Log everything**, no pruning |

---

## 2. Current state audit

### 2.1 Email

- `mail/mail.types.ts` — **32 hardcoded `EmailTemplateKey` enum members.**
- `mail/templates/` — 3 Handlebars files per key (`.subject.hbs`, `.html.hbs`, `.text.hbs`) =
  **96 files**, plus `_partials/email-shell.html.hbs` and `_partials/action-button.html.hbs`.
- `mail/template-renderer.service.ts` — compiles all templates at boot into an in-memory `Map`.
- `mail/mail.service.ts` — the send gate chain:
  `empty recipient → isEnabled() → canSendToProfile() → suppression → render → SES (timeout-wrapped)`.
- `isTransactionalTemplate()` hardcodes one exception: `PASSWORD_RESET` bypasses the opt-in gate.
- `mail/email-suppression.service.ts` + `EmailSuppression` — SES bounce/complaint list, fed by
  `POST /api/webhooks/ses`.

### 2.2 WhatsApp

- `whatsapp/whatsapp.service.ts` mirrors `MailService`'s gate chain. Meta Cloud API.
- **`mail/whatsapp-bridge.util.ts` is the coupling this plan removes.**
  `whatsAppTemplateNameForEmail()` derives the WA name from the email key by `-` → `_`, so
  **every email automatically fires a WhatsApp** (all but `PASSWORD_RESET`) and neither channel can
  be configured alone.
- `whatsapp.service.ts` keeps a **bounded in-memory `Map`** (`outbound`, max 5,000) of
  `wamid → {template, to}` for the status webhook. Explicitly lossy: a restart or second replica
  loses it and logs `template=?`. The delivery log (§4) fixes this.

### 2.3 Event firing

~20 imperative fire-and-forget call sites: `orders/orders.service.ts` (brief submitted L1880,
brief accepted L2001, cancelled-by-support L2232, product shipped L2300, revision requested L2724,
dispute opened L4710, refunded L5046, …), `watermark/watermark.service.ts` L215, and
`jobs/creator-reminder.service.ts` L221/L470.

Each `notify*` method builds its own context; the shared `orderMailInclude` select spans
Order → Brand → Agency → Creator → User.

### 2.4 The existing drip

`jobs/creator-reminder.service.ts` already implements, for creators only, the mechanics this plan
generalises:

- Completion stages at **30 min / 24 h / 3 d / 7 d**; resubmit at 30 min / 24 h / 48 h.
- One **delayed BullMQ job per stage**, with the delay measured from the **sequence clock**
  (`completionReminderStartedAt`), not from enqueue time — so a late-enqueued job still lands on
  schedule. *This plan keeps that arithmetic.*
- **Idempotency via conditional UPDATE**: each stage stamps a nullable column
  (`completionReminder30mAt`, `…24hAt`, `…72hAt`, `…168hAt`) only if still null.
- **Exit conditions re-checked at fire time**, not at schedule time.
- A low-frequency **DB-truth backstop sweep** for jobs lost to a Redis restart or eviction,
  deliberately infrequent so the Neon compute endpoint can autosuspend.

> **Note for §3.3:** the four completion stages share **one** template
> (`CREATOR_PROFILE_COMPLETION_REMINDER`) and switch copy inside it with `isStage1`…`isStage4`
> booleans (`creator-profile-mail.notifier.ts:140`). The design must handle per-row copy.

### 2.5 Pre-existing bug found during this audit

`template-renderer.service.ts` compiles from a hand-maintained `ALL_TEMPLATE_KEYS` array, and
`render()` throws `Unknown email template: <key>` for anything missing from it — there is no lazy
compile. Two enum members are absent although their `.hbs` files exist:

- `ORDER_EXTRA_REVISIONS_PURCHASED_FOR_BRAND` — used at `order-mail.notifier.ts:205`
- `SOCIAL_CONNECTION_EXPIRED` — used at `creator-profile-mail.notifier.ts:228`

Both are live paths. `mail.send()` throws inside `render()`; the notifier's `run()` helper catches
it into a single `logger.warn` (`order-mail.notifier.ts:531`); and **the
`await sendWhatsAppForEmail(...)` on the next line never executes**
(`creator-profile-mail.notifier.ts:239`).

Net effect: a brand buying extra revisions, and a creator whose Instagram connection expires,
receive **nothing on either channel**, with only a warn line as evidence.

**Fixed** ahead of this plan: `ALL_TEMPLATE_KEYS` is now derived from the enum
(`Object.values(EmailTemplateKey)`) rather than hand-listed, so the drift class is gone — a new
enum member without template files now fails loudly at boot instead of silently at send time. A
regression test renders every key.

### 2.6 Infrastructure already present

`bullmq` + `ioredis`, `handlebars`, `@nestjs/schedule`, `jobs/bullmq-redis.connection.ts`,
`jobs/bullmq-watchdog.util.ts`, and **`BULLMQ_WORKER_ENABLED`**
(`creator-reminder-queue.service.ts:81`, already logging *"queue only (no worker on this
process)"*). `legal-pages` provides a working draft/version/revert admin pattern.
`auth/guards/admin.guard.ts` provides the admin controller pattern.

---

## 3. Design

### 3.1 Event catalog

One typed const in `server/src/notifications/catalog/event-catalog.ts`. Keys keep today's naming so
template names carry over unchanged.

```ts
export const NOTIFICATION_EVENTS = defineEvents({
  'order-brief-submitted-for-creator': {
    label: 'Brief submitted — to creator',
    description: 'Brand submitted the creative brief; creator must accept or reject.',
    recipient: 'creator',
    alwaysSend: false,        // true ONLY on password-reset; everything else respects opt-in

    /// Shown in the admin variable picker; validated against on template save.
    vars: {
      creatorName:      { type: 'string', example: 'Ananya R' },
      brandName:        { type: 'string', example: 'Acme Beauty' },
      packageName:      { type: 'string', example: 'Standard — 3 reels' },
      orderId:          { type: 'string', example: 'ord_8f21…' },
      briefSubmittedAt: { type: 'date',   example: '28 Sep 2026' },
      actionUrl:        { type: 'url',    example: '/creator/orders/ord_8f21/brief' },
    },

    /// Re-read at SEND time — a 7-day reminder renders current data, not a snapshot.
    /// A direct port of the body of today's notifyBriefSubmitted().
    /// Returns null when the entity or recipient is gone — `| null` is in the
    /// signature so the case cannot be forgotten (§12 B3).
    resolve: async (ctx, entityId): Promise<ResolvedVars | null> => { /* … */ },

    /// Only consulted for rows with offsetMinutes > 0. OMIT ENTIRELY for send-now-only
    /// events — which is 30 of the 32 (§3.3). Its presence sets `supportsDelay`,
    /// and its absence makes the API refuse delayed rows (§12 B1). For a delayed
    /// send with genuinely no condition, opt in explicitly with `stillRelevant: ALWAYS`.
    stillRelevant: async (ctx, entityId) =>
      (await ctx.prisma.order.findUnique(…))?.status === 'BRIEF_SUBMITTED',
  },
  // … one entry per event
})
```

`resolve()` is a **direct port** of the corresponding `notifyX` method minus the send — the Prisma
select and context object already exist in `order-mail.notifier.ts`.

**Boot sync** upserts the catalog into `NotificationEvent`:

- **Code-owned** (overwritten each sync): `label`, `description`, `recipient`, `vars`, `alwaysSend`.
- **Admin-owned** (never touched): `isActive`, `emailTemplateId`, `whatsappTemplateName`, schedule rows.
- Keys that disappear from code are marked `deprecated`, **never deleted**.

> `alwaysSend` is deliberately code-owned. If admin could set it, someone could make any event
> bypass every opt-out.

### 3.2 Emission

```ts
// before
this.orderMail.notifyBriefSubmitted(order.id, now)
// after
this.events.emit('order-brief-submitted-for-creator', { entityId: order.id })

// repeatable events pass a discriminator so occurrence N is not mistaken for occurrence 1
this.events.emit('order-revision-requested-for-creator', {
  entityId: order.id,
  occurrenceKey: String(newRevisionNumber),   // §12 A1
})
```

`emit()` writes one BullMQ job and returns. It is the **only** public export of the module, and it
must be called **after** the surrounding transaction commits — which is what today's code already
does (`orders.service.ts:2724`).

### 3.3 Timing and channels

Per event, a list of rows. Each row = one offset + its own channels.

```
Event: order-brief-submitted-for-creator              [ Active ]

  Email     order-brief-submitted-for-creator   ▾     (default: event key)
  WhatsApp  order_brief_submitted_for_creator   ▾     (approved in WhatsApp Manager)

  Send at                     Channels              Template override
  ┌──────────────────────────────────────────────────────────────────┐
  │ [ 0    ] now        ✓    ☑ Email  ☐ WhatsApp    —                │
  │ [ 30   ] minutes    ✓    ☑ Email  ☑ WhatsApp    —                │
  │ [ 24   ] hours      ✓    ☐ Email  ☑ WhatsApp    —                │
  │ [ 7    ] days       ✓    ☑ Email  ☐ WhatsApp    —                │
  └──────────────────────────────────────────────────────────────────┘
  + add row
```

Offsets are stored as **minutes** (`0`, `30`, `1440`, `10080`, `20160`) and measured **from the
triggering event**, never from the previous row — the `buildCompletionReminderJobs` arithmetic.

**Per-row template override (one nullable column).** §2.4 found that the completion drip ships
**one file containing four different emails**, gated by `{{#if isStage1}}`…`{{#if isStage4}}` —
subject line included.

**Decided: split it into one template per schedule row**, each pointed at by `templateOverrideId`.
Someone editing the day-3 copy then opens a file containing only the day-3 email, instead of a
100-line file with four nested conditionals they must not break.

Names are offset-based, so the list reads in order and is self-describing:

| Row | Email template name | Subject (existing copy) |
|---|---|---|
| +30 min | `creator-profile-completion-reminder-30m` | Your {{platformName}} profile is almost ready 👀 |
| +24 h | `creator-profile-completion-reminder-24h` | You started it. Don't leave it halfway 👀 |
| +3 d | `creator-profile-completion-reminder-3d` | What if a brand is looking for someone like you? |
| +7 d | `creator-profile-completion-reminder-7d` | Still want to be listed on {{platformName}}? |

The resubmit drip splits the same way:

| Row | Email template name |
|---|---|
| +30 min | `creator-profile-resubmit-reminder-30m` |
| +24 h | `creator-profile-resubmit-reminder-24h` |
| +48 h | `creator-profile-resubmit-reminder-48h` |

**32 template keys become 37 templates** (2 stage-switching files replaced by 7). The P1 seeder
performs the split automatically by extracting each `{{#if isStageN}}` block — including the
matching segment of the one-line subject — into its own row.

The name is a **label, not a binding**: rows reference templates by id, so re-timing a row from 3 d
to 5 d does not break anything. Rename the template too if you want the list to stay tidy.

#### Most events have exactly one row, at 0

**This is the normal case.** An event that just fires when it happens has a single row,
`offsetMinutes = 0`, both channels ticked. No interval, no drip, no predicate.

```
Event: order-content-delivered-for-brand              [ Active ]

  Email     order-content-delivered-for-brand   ▾
  WhatsApp  order_content_delivered_for_brand   ▾

  Send at                     Channels
  │ [ 0    ] now        ✓    ☑ Email  ☑ WhatsApp    │
  + add row
```

Of the 32 events, **30 are exactly this** — every order event (brief submitted/accepted/rejected,
product shipped/received, revision requested, extra revisions and usage rights purchased, content
delivered/accepted, completed, rejected, cancelled, cancelled by support, refunded, dispute
opened/resolved), both creator-profile decisions, the social-connection expiry, the brand welcome,
and the password reset.

**Only two events carry intervals:**

| Event | Rows |
|---|---|
| `creator-profile-completion-reminder` | 30 min · 24 h · 3 d · 7 d — population-swept (§3.4) |
| `creator-profile-resubmit-reminder` | 30 min · 24 h · 48 h |

Three consequences worth stating plainly:

1. **`stillRelevant` is only consulted for rows with `offsetMinutes > 0`.** So 30 of the 32 events
   need no predicate written at all — there is nothing to re-check when the send is instantaneous.
2. **A `0` row still goes through the queue** with zero delay, exactly matching today's
   fire-and-forget `void this.run(...)`. The API request does not wait on SES or Meta.
3. **Admin can add an interval row to any of those 30 later, with no code change.** Wanting a
   "brief still not accepted after 24 h" nudge becomes one row plus a template — and *that* is
   where a `stillRelevant` predicate would then need adding in code, since the new row has an
   offset > 0.

The P1 seeder creates exactly one `0` row per event with both channels, so day one behaviour is
byte-for-byte what ships today. `password-reset` is the sole email-only row, matching
`whatsAppTemplateNameForEmail` returning null for it.

#### WhatsApp per row

`whatsappTemplateOverride` on the schedule row mirrors `templateOverrideId`, so a row can name its
own Meta template. Null means the event's.

**Leave it null for now.** Today all four completion stages send the *same* WhatsApp message
(`sendWhatsAppForEmail` passes one `emailKey` regardless of stage, with `bodyVars: [recipientName]`),
so keeping the event-level name preserves current behaviour exactly and needs **no new Meta
approvals**. Per-stage WhatsApp copy would mean submitting 7 new templates to WhatsApp Manager and
waiting on approval — worth doing later, not a launch blocker.

`stepIndex` and `stepOffsetMinutes` are still injected into every render context, so a
conditional template remains possible where it genuinely helps.

### 3.4 Population events — the completion reminder

Most events are **emitted**: something happens to one order, `emit()` fires, the schedule rows run.

The completion reminder is different. Nothing "happens" — a profile simply stays unfinished. Today
that is handled by `runBackstopSweep`, restricted by `CREATOR_COMPLETION_REMINDER_BACKFILL_DAYS`
(default 10, floored at day-7 + 2) so **only creators who signed up in roughly the last week are
ever reached**. That window is being removed: the reminder must reach **every** building profile.

So the catalog supports a second kind of event, declared with a `population` block instead of
relying on `emit()`:

```ts
'creator-profile-completion-reminder': {
  label: 'Creator profile incomplete',
  recipient: 'creator',
  vars: { recipientName, actionUrl, … },
  resolve: async (ctx, profileId) => { /* … */ },
  stillRelevant: async (ctx, profileId) =>
    !(await ctx.prisma.creatorProfile.findUnique(…))?.completeProfile,

  /// Swept on a cron instead of emitted. No time window — every matching row is
  /// considered, paged in batches.
  population: {
    cron: '0 10 * * *',                         // once daily
    clockField: 'completionReminderStartedAt',  // offsets are measured from here
    where: { completeProfile: false, /* … */ },
    highestDueOnly: true,                       // see below
  },
}
```

Everything downstream is unchanged: the same schedule rows, the same templates, the same channel
selection, the same `StepWorker`. Only the *producer* differs — a cron instead of `emit()`.

#### `highestDueOnly` — why a 6-month-old profile gets one email, not four

Offsets are measured from `clockField`. For a creator who registered long ago, **all four rows are
already due**, so a naive sweep would send four emails at once.

Your current code already solved this — *"Only the highest stage a profile has crossed is sent"*.
That rule carries over: the sweep sends only the latest due row and writes the earlier ones to
`NotificationLog` as `SKIPPED`, reason `superseded`.

| Creator | Rows due | Sent |
|---|---|---|
| registered 45 min ago | 30 min | the 30-min email |
| registered 2 days ago | 30 min, 24 h | the 24-h email; 30-min logged `superseded` |
| registered 8 months ago | all four | the 7-day email; the other three logged `superseded` |

New signups still get the full 30 min → 24 h → 3 d → 7 d drip, because their delayed jobs fire as
each row comes due. The sweep is the catch-up and the safety net.

#### Each stage sends at most once, ever

The `NotificationLog` unique constraint means a profile that has received a row never receives it
again, however often the sweep runs. So the backlog gets **one** catch-up email, not a daily nudge.

**To re-nudge later, add schedule rows** — `30 d`, `60 d`, `90 d`. No new mechanism: they are due
for anyone who has been building that long, and `highestDueOnly` keeps it to one message. Long-dormant
profiles receive the newest row once and then go quiet again.

#### Batching

This is the one place batching matters, and it is why `reenroll-completion-reminders.ts` is no
longer needed — the sweep does its job continuously and for everyone.

1. **Page the population** by keyset (`WHERE id > :lastId ORDER BY id`), ~500 rows per batch.
   Never `OFFSET` — it degrades quadratically, and on Neon that is real money. Never
   `findMany()` the whole set.
2. **Enqueue with `queue.addBulk()`** per batch, not one `add()` per profile — one pipelined Redis
   command instead of hundreds of round-trips.
   `jobId = ${eventKey}-${profileId}-${rowId}` makes a re-enqueue a no-op.
3. **Enqueue onto `notif-bulk`, never `notif-step`** — this is what keeps the sweep from
   delaying real-time notifications (§3.6):
   ```ts
   new Worker(QUEUE.bulk, handler, {
     connection, concurrency: 5,
     limiter: { max: 120, duration: 60_000 },   // stay inside the SES quota
   })
   ```
   A production SES account commonly starts near **14 emails/second**; exceeding it returns
   `Throttling` errors that count against your reputation. 120/min is deliberately conservative.

Provider calls are **not** batched. `ses-mail.transport.ts` uses `SendEmailCommand` with
`Content.Simple` — HTML rendered locally through your shell and partials. SESv2's
`SendBulkEmailCommand` requires a template *stored in SES* with its own limited syntax, which would
mean abandoning `email-shell.html.hbs`, the `actionButton` partial and the `concat` helper, and
maintaining templates in two places. WhatsApp Cloud has no bulk endpoint at all.

> **WhatsApp caution on this event.** Meta caps *unique business-initiated conversations per rolling
> 24 hours* by messaging tier (commonly 250 → 1K → 10K → …). A first sweep across a large backlog of
> building profiles can exceed it — the excess does not queue, it **fails**, and failures hurt the
> quality rating that also governs your order notifications. Run the first catch-up with the
> WhatsApp channel unchecked on those rows, then enable it once the backlog is drained.

### 3.5 Rendering

`TemplateRendererService` changes from boot-compiled disk map to **DB-first with disk fallback**:

1. Resolve the row's `templateOverrideId`, else the event's `emailTemplateId`, else fall back to the
   legacy key → disk `.hbs` lookup. **The fallback is what makes the migration non-breaking.**
2. Compile with Handlebars, cache by `${templateId}:${version}` — a publish bumps `version`, which
   invalidates the entry, so an edit goes live without a restart.
3. Wrap in `_partials/email-shell.html.hbs`; `{{> actionButton}}` stays available. Partials remain
   on disk — they are layout, not copy.
4. Plain text: use `textHbs` when set, else derive from the rendered HTML with `node-html-parser`
   (already a dependency).

**Validation on save** (chosen in §1.6). A template cannot be saved until:

- subject, HTML and text all **compile** as Handlebars;
- every `{{variable}}` exists in `vars` for every event referencing the template — unknown variables
  are a hard error, not a silent blank;
- a **test render against the `example` values** produces a non-empty subject and body;
- only allowlisted helpers are used (`concat` today).

### 3.6 Dispatch

**Three queues**, on the existing `jobs/bullmq-redis.connection.ts` with the same
`attempts: 3` / exponential-backoff / `removeOnComplete` defaults the reminder queue uses.

| Queue | Carries | Config |
|---|---|---|
| `notif-event` | one job per `emit()`; fans out to schedule rows | `concurrency: 5` |
| `notif-step` | transactional sends + delayed drip rows | `concurrency: 10`, **no limiter** |
| `notif-bulk` | population-sweep sends only (§3.4) | `concurrency: 5`, `limiter: 120/min` |

**`notif-step` and `notif-bulk` run the same handler.** The split exists purely to stop the sweep
delaying real-time notifications.

> **Why not one queue.** A BullMQ limiter is **per queue**. With everything on one queue, a 10,000
> profile completion sweep draining at 120/min would put a brand's brief-accepted confirmation
> behind it — **over an hour late**. Head-of-line blocking that only appears once the sweep is
> switched on. Transactional sends therefore get their own unlimited queue; the sweep is the only
> thing that generates enough volume to need the SES rate cap anyway.

`notif-event` → **EventDispatcher**
1. Load the event; skip if `deprecated` or `!isActive`.
2. Resolve the recipient.
3. For each active schedule row, enqueue a job carrying
   `{ eventKey, entityId, occurrenceKey, offsetMinutes }` — **the offset, not the row id** (§12 B4) —
   with `jobId = ${eventKey}-${entityId}-${occurrenceKey}-${offsetMinutes}` and
   `delay = max(offsetMinutes×60000 − elapsed, 0)`.
   Immediate rows (`offsetMinutes = 0`) go to `notif-step`; sweep-produced rows go to `notif-bulk`.

`notif-step` → **StepWorker**
1. **Claim** — `INSERT … ON CONFLICT DO NOTHING` on `NotificationLog`, stamping `claimedAt`.
   No row returned → read the existing one: a terminal status skips, a stale `QUEUED` row is taken
   over, a freshly-claimed one means another worker has it (§12 A2).
2. Event / row still active? → skip.
3. `offsetMinutes > 0` → run **`stillRelevant()`**. False → log `SKIPPED`, reason `not_relevant`.
4. `resolve()` — a **fresh** Prisma read.
5. Per channel in the row, **independently** (a WhatsApp failure must not block the email):
   - opt-in gate (`emailNotificationsEnabled` / `whatsappNotificationsEnabled`), bypassed when
     `alwaysSend`. Reuses the existing `canSendToProfile` logic.
   - recipient `User.status` must be `ACTIVE` — otherwise skip, `user_inactive` (§12 B3).
   - email: suppression check. WhatsApp: phone normalises to ≥ 8 digits, and every `bodyVar` has
     whitespace collapsed (§12 D).
   - render → send → update the log row with `providerMessageId`.
   - **classify failures** (§12 B6): transient → throw and retry; permanent → throw
     `UnrecoverableError` so it burns one attempt, not three.


#### Worked example — 5 briefs accepted at once

```
t=0ms    5 requests → emit('order-brief-accepted-for-brand', { entityId })
         5 jobs into notif-event. Redis is single-threaded, so the writes
         serialize with no contention (~1ms each). All 5 responses return.

t=~5ms   Dispatcher (concurrency 5) → all 5 in parallel.
         Each: load event → resolve brand → 1 row at offset 0
             → enqueue 1 notif-step job, delay 0.
         jobId = order-brief-accepted-for-brand-<orderId>-<rowId>
         5 distinct orderIds → 5 distinct jobIds → no collision.

t=~20ms  Step worker (concurrency 10) → all 5 in parallel.
         Each: INSERT NotificationLog (distinct entityId → all succeed)
             → resolve() fresh read → opt-in gate → render → send.
         offsetMinutes = 0, so stillRelevant is never consulted.
         Both channels ticked → 10 provider calls: 5 SES + 5 Meta.
```

Nothing serialises and nothing collides — five independent rows, five independent sends.

**Failures are isolated.** One job's SES error retries on its own schedule (3 attempts, exponential
backoff) while the other four proceed; the error lands on that job's log row.

**A double-accept is rejected twice over.** A repeated `emit()` for the same order is refused by
BullMQ on the deterministic `jobId`; were it to get past that, the `NotificationLog` unique
constraint refuses the insert and the job returns without sending.

**Connection pool.** Running a second process means a **second Prisma pool**, and the two do not
know about each other while drawing on the same database budget. `PrismaService extends
PrismaClient`, so there is one pool per process, and Prisma's default size is
`num_physical_cpus × 2 + 1` — **3 on a 1-vCPU container, 5 on 2 vCPU.**

Two opposite failure modes:

| | Symptom |
|---|---|
| **Pool too small** | `P2024: Timed out fetching a new connection from the connection pool` after the 10s default `pool_timeout`. Jobs fail, retry, back off; notifications go slow and flaky. The likelier of the two. |
| **Pool too large** | `FATAL: remaining connection slots are reserved`. **The API cannot get a connection either**, so every user request 500s — a background worker takes the live site down. |

**Concurrency does not equal connections.** A connection is held for the Prisma read (~10 ms) and
the log write (~5 ms), but **not** during the SES or Meta call (~300 ms), which is the slow part.
A pool of ~10 comfortably serves the 20 concurrent jobs above.

> **Rule: never hold a Prisma transaction across a provider HTTP call.** Read, release, send, then
> write the log row. A `$transaction` spanning the send pins a connection for the whole call, and
> 20 concurrent jobs then really do need 20 connections.

**Configuration.** The schema already has the right shape —
`url = env("DATABASE_URL")` + `directUrl = env("DIRECT_URL")`. Set `connection_limit` explicitly
per process rather than relying on CPU inference, since the worker and API containers may differ
and burstable vCPUs report unreliably:

```
API     DATABASE_URL=postgresql://…-pooler.neon.tech/db?pgbouncer=true&connection_limit=10
worker  DATABASE_URL=postgresql://…-pooler.neon.tech/db?pgbouncer=true&connection_limit=10
        DIRECT_URL=postgresql://…neon.tech/db     # direct — migrations only
```

- `-pooler` is Neon's PgBouncer in transaction mode, multiplexing many client connections onto few
  real ones. This is what makes two processes safe.
- `?pgbouncer=true` makes Prisma disable prepared statements; without it you get intermittent
  `prepared statement "s0" already exists` errors.
- `DIRECT_URL` stays direct: `prisma migrate` needs real sessions and advisory locks, which
  transaction-mode pooling breaks.

**Backstop sweep.** A low-frequency cron finds log rows stuck in `QUEUED` past their due time and
retries them — covering a Redis restart or eviction dropping a delayed job. Same rationale and
cadence as today's `runBackstopSweep`, so Neon can still autosuspend.

**Delivery status webhooks.** `POST /api/webhooks/ses` and `POST /api/webhooks/whatsapp` look the
log row up by `providerMessageId` and update `status`. This replaces the lossy in-memory Map in
`whatsapp.service.ts:37`.

---

## 4. Data model

Five tables.

```prisma
enum NotificationChannel        { EMAIL WHATSAPP }
enum NotificationRecipientRole  { CREATOR BRAND USER }
enum NotificationLogStatus      { QUEUED SENT DELIVERED READ FAILED SKIPPED BOUNCED COMPLAINED }

/// Code-owned catalog row, synced on boot. Admin owns only the marked fields.
model NotificationEvent {
  key                  String @id                      // 'order-brief-submitted-for-creator'
  label                String
  description          String?
  recipient            NotificationRecipientRole
  vars                 Json                            // { name: { type, example } }
  alwaysSend           Boolean @default(false)         // true ONLY on password-reset (§1.8)
  /// Derived at sync from whether the catalog entry defines stillRelevant.
  /// False ⇒ the API rejects any schedule row with offsetMinutes > 0 (§12 B1).
  supportsDelay        Boolean @default(false)
  deprecated           Boolean @default(false)
  syncedAt             DateTime @updatedAt

  // ---- admin-owned ----
  isActive             Boolean @default(true)
  emailTemplateId      String? @db.Uuid                // default: template named after the key
  whatsappTemplateName String?                         // default: key with '-' → '_'
  schedule             NotificationSchedule[]
}

/// One send in an event's timeline. offsetMinutes is measured from the TRIGGERING EVENT.
model NotificationSchedule {
  id                 String @id @default(uuid()) @db.Uuid
  eventKey           String
  event              NotificationEvent @relation(fields: [eventKey], references: [key], onDelete: Cascade)
  offsetMinutes      Int                               // 0 = immediately
  channels           NotificationChannel[]             // [EMAIL] | [WHATSAPP] | both
  templateOverrideId String? @db.Uuid                  // null → the event's emailTemplateId
  whatsappTemplateOverride String?                     // null → the event's whatsappTemplateName
  isActive           Boolean @default(true)
  sortOrder          Int     @default(0)

  @@unique([eventKey, offsetMinutes])
}

model NotificationTemplate {
  id              String @id @default(uuid()) @db.Uuid
  name            String @unique                       // matches an event key by default
  description     String?
  subjectHbs      String
  htmlHbs         String  @db.Text
  textHbs         String? @db.Text                     // null → derived from html at render
  isActive        Boolean @default(true)
  version         Int     @default(1)
  updatedByUserId String? @db.Uuid
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  versions        NotificationTemplateVersion[]
}

/// Mirrors the LegalPage / LegalPageVersion pattern already in the codebase.
model NotificationTemplateVersion {
  id              String @id @default(uuid()) @db.Uuid
  templateId      String @db.Uuid
  template        NotificationTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  version         Int
  subjectHbs      String
  htmlHbs         String  @db.Text
  textHbs         String? @db.Text
  note            String?
  createdByUserId String? @db.Uuid
  createdAt       DateTime @default(now())

  @@unique([templateId, version])
}

/// Idempotency AND audit in one table. The unique constraint is what stops a
/// double-send; the columns are what answer "did they get it, and why not".
model NotificationLog {
  id                   String @id @default(uuid()) @db.Uuid
  eventKey             String
  entityId             String
  /// Discriminates repeat occurrences of the same event on the same entity —
  /// revisionNumber, delivery id, reset-token id. Defaults to entityId.
  /// Test sends use `test:<uuid>` so they never collide (§12 A1, A3).
  occurrenceKey        String
  scheduleId           String? @db.Uuid
  offsetMinutes        Int
  channel              NotificationChannel
  status               NotificationLogStatus @default(QUEUED)

  recipientUserId      String? @db.Uuid
  recipientProfileType String?                         // 'creator' | 'brand'
  recipientProfileId   String? @db.Uuid
  toAddress            String                          // email address or E.164 digits

  templateId           String? @db.Uuid
  renderedSubject      String?
  providerMessageId    String?                         // SES messageId or WhatsApp wamid
  errorMessage         String?
  skippedReason        String?                         // opted_out | suppressed | no_phone |
                                                       // not_relevant | event_inactive
  queuedAt             DateTime @default(now())
  /// Set when a worker takes the row. A QUEUED row with a stale claimedAt is
  /// re-claimable, so a crash between claim and send cannot lose it (§12 A2).
  claimedAt            DateTime?
  sentAt               DateTime?
  deliveredAt          DateTime?

  /// THE idempotency guarantee. A duplicate insert loses the race and no send happens.
  @@unique([eventKey, entityId, occurrenceKey, recipientUserId, channel, offsetMinutes])
  @@index([providerMessageId])
  @@index([recipientUserId, queuedAt])
  @@index([eventKey, queuedAt])
  @@index([status, queuedAt])
}
```

**No changes** to `emailNotificationsEnabled` / `whatsappNotificationsEnabled` on
`CreatorProfile` / `BrandProfile` — the existing gate logic is reused as-is.

**Skipped sends are logged.** Today a skip is only a `logger.warn`; "why didn't the creator get the
WhatsApp?" has to be answerable from the database.

**Retention: keep everything, no pruning** (§1.11). The four indexes above keep queries cheap
regardless of size, and the heaviest single contributor is the one-off completion-reminder catch-up
(one row per building profile per stage). Revisit only if the table reaches the tens of millions —
at which point archive rather than delete, since this is the audit trail for everything the
platform has ever sent.

---

## 5. Admin API

Under `JwtAuthGuard + AdminGuard`, following `admin-legal-pages.controller.ts`.

```
GET    /api/admin/notifications/events                 list + template names + row counts
GET    /api/admin/notifications/events/:key            detail + vars + schedule
PATCH  /api/admin/notifications/events/:key            isActive, emailTemplateId, whatsappTemplateName

PUT    /api/admin/notifications/events/:key/schedule   replace all rows, in ONE transaction (§12 B4)
POST   /api/admin/notifications/events/:key/backfill    apply a new row to recent entities (§12 B5)
POST   /api/admin/notifications/events/:key/test       send a test using a real entity id

GET    /api/admin/notifications/templates
POST   /api/admin/notifications/templates              create
PUT    /api/admin/notifications/templates/:id          save (runs validation; bumps version)
POST   /api/admin/notifications/templates/:id/preview  render with example or real data
POST   /api/admin/notifications/templates/:id/test-send
GET    /api/admin/notifications/templates/:id/versions
POST   /api/admin/notifications/templates/:id/revert/:v

GET    /api/admin/notifications/logs                   filter: user, event, channel, status, date
```

---

## 6. Admin UI

Under `client/app/admin/notifications/`.

| Screen | Contents |
|---|---|
| **Events** | Table: key, label, recipient, email template, WhatsApp template, row count, Active toggle. |
| **Event detail** | Template pickers for both channels, plus the schedule editor from §3.3 — offset value + unit, channel checkboxes, optional template override, per-row active. Variable list for this event shown alongside. |
| **Templates** | List with last-edited. Editor: subject, HTML/Handlebars code editor, **variable picker sidebar from the event's `vars`**, live preview, save (validates), version history with revert. |
| **Logs** | Searchable: recipient, event, channel, status, timestamp, error / skip reason. |

WhatsApp template names are a free-text field with the `^[a-z0-9_]+$` rule enforced, defaulted from
the event key. No sync from Meta — you confirm approval in WhatsApp Manager yourself.

---

## 7. Migration

Strangler. Nothing breaks at any point, because the renderer falls back to the existing disk
templates until a DB row exists.

| Phase | Contents | User-visible |
|---|---|---|
| **P1** | Prisma migration (§4), event catalog (~32 events, `resolve()` ported from the notifiers), boot sync, DB-first renderer **with disk fallback**, seeder importing the 96 `.hbs` files into `NotificationTemplate` | None |
| **P2** | Two queues, EventDispatcher, StepWorker, delivery log, webhook rewiring. `emit()` added **alongside** existing `notify*` calls with sends disabled — log-only shadow mode to compare | None |
| **P3** | Admin API + UI. Seed one schedule row per event reproducing **exactly** today's behaviour | Admin can view/edit; sends still on the old path |
| **P4** | **Cutover.** Enable the new path, remove the `notify*` calls, delete `whatsapp-bridge.util.ts`, migrate the creator drips | The real switch |
| **P5** | Delete the old notifiers, the disk fallback, `EmailTemplateKey`, the reminder columns | None |

The worker process can be split out any time after P2: add `main.worker.ts`, deploy a second target
running `start:worker`, set `BULLMQ_WORKER_ENABLED=false` on the API. Until then everything runs
in-process, which is also how local development stays.

### 7.1 Code layout

`server/src/notifications/` — the surviving pieces of `mail/` and `whatsapp/` move in, so by P5
both old folders are gone.

```
server/src/notifications/
├── notifications.module.ts          # admin controllers + emit()
├── notifications.worker.module.ts   # queues + workers
├── catalog/        define-events.ts · event-catalog.ts · registry-sync.service.ts
├── rendering/      template-renderer.service.ts · template-validator.service.ts
│                   partials/ (moved) · legacy-templates/ (moved, deleted at P5)
├── channels/
│   ├── email/      email-sender.service.ts · ses.transport.ts · email-suppression.service.ts
│   └── whatsapp/   whatsapp-sender.service.ts · whatsapp-cloud.transport.ts
│                   whatsapp-webhook.controller.ts
├── dispatch/       notification-events.service.ts (emit — ONLY public export)
│                   event-dispatcher.worker.ts · step.worker.ts · backstop-sweep.service.ts
├── log/            notification-log.service.ts
├── admin/          controllers + dto
└── queues/         notification-queues.ts

server/src/main.worker.ts            # worker entry, /health only
```

Keep extraction cheap with an ESLint `no-restricted-imports` rule: nothing outside
`src/notifications/**` may import from it except `NotificationEventsService`.

### 7.2 File disposition

**Deleted (P5) — ~2,400 lines**

| File | Lines |
|---|---:|
| `mail/order-mail.notifier.ts` | 707 |
| `mail/creator-profile-mail.notifier.ts` | 306 |
| `mail/brand-profile-mail.notifier.ts` | 109 |
| `mail/whatsapp-bridge.util.ts` — **the lockstep** | 61 |
| `mail/mail.types.ts` (`EmailTemplateKey`) | 57 |
| `mail/mail.module.ts` · `whatsapp/whatsapp.module.ts` | 51 |
| `jobs/creator-reminder*.ts` (5 files) | 1,119 |
| `mail/templates/*.hbs` (96 files, partials excepted) | — |

**Moved and kept — ~860 lines.** Same-package file moves; imports change only by relative path.

| File | Lines | Change |
|---|---:|---|
| `mail/ses-mail.transport.ts` | 73 | **none** |
| `mail/email-suppression.service.ts` | 51 | **none** |
| `mail/brand-mail.recipient.ts` | 25 | used by brand-recipient resolution |
| `mail/mail.service.ts` | 146 | gate chain kept; renderer lookup swapped |
| `whatsapp/whatsapp-cloud.transport.ts` | 138 | **none** |
| `whatsapp/whatsapp.service.ts` | 238 | gate chain kept; **in-memory `outbound` Map deleted** |
| `whatsapp/whatsapp-webhook.controller.ts` | 154 | status written to the log |
| `mail/templates/_partials/*` | — | moved, still on disk |

> **Do not rewrite the transports.** Both are working, timeout-wrapped provider clients with no
> business logic. They move verbatim.

**Rewritten:** `mail/template-renderer.service.ts` (162) — boot-compiled disk `Map` → DB-first with
disk fallback and an LRU. Shell / partial / `concat`-helper logic survives; its 133-line spec is
extended, not replaced.

**Call sites to migrate (P4):** `auth/password.service.ts`, `brand-profile/brand-profile.service.ts`,
`creator-profile/creator-profile.service.ts`, `orders/orders.service.ts`,
`social-connections/social-connections.service.ts`, `watermark/watermark.service.ts`, and
`jobs/creator-reminder.service.ts` (which then dies). `webhooks/webhooks.module.ts` imports
`MailModule` only for suppression — it just repoints.

**Also deleted:** `scripts/reenroll-completion-reminders.ts` and its two `package.json` scripts
(`reenroll:completion-reminders`, `…:dev`). **No replacement is needed** — the script existed to
drag creators back inside the `BACKFILL_DAYS` window, and §3.4 removes that window. The sweep now
covers every building profile continuously.

---

## 8. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **Removing the lockstep silently stops WhatsApp.** Today every email auto-fires a WA message; afterwards WA only fires where a row says so, and a missed row means silence with no error. | P3 seeds every event with a row carrying **both** channels. A migration test asserts: for each of the 31 WA-twinned keys, a schedule row exists with `WHATSAPP` in `channels`. |
| **R2** | **Double-send during the creator-drip cutover.** `CreatorReminderService` and the new schedule rows would both fire. | Single atomic cutover: disable `CREATOR_COMPLETION_REMINDERS_ENABLED` in the same deploy that activates the rows. Backfill `NotificationLog` rows from the existing `completionReminder*At` columns so sent stages are never repeated. Keep the old columns until P5. |
| **R3** | **A bad template breaks live email** — a typo'd variable renders blank, silently. | Validation on save (§3.4) plus version history and one-click revert. |
| **R4** | **WhatsApp template names are free text.** A typo means Meta rejects every send for that event. | `^[a-z0-9_]+$` enforced, defaulted from the event key, and the test-send button surfaces Meta's error before the event goes live. |
| **R5** | **Lost emit if Redis is down.** `emit()` enqueues; an outage drops the event. Today's `void this.run(...)` has the same weakness, so this is not a regression. | The backstop sweep covers rows already logged. A transactional outbox would close it fully — noted, not scoped. |
| **R6** | **Delayed sends fire at 3am.** Quiet hours were cut. | Accepted: every event here is transactional or lifecycle, where timeliness beats politeness. Revisit if WhatsApp block rates rise. |
| **R7** | **The first completion sweep is the largest send this platform has ever done.** Every building profile at once, across both channels. | `highestDueOnly` caps it at one email per creator, not four (§3.4). Run the first sweep with WhatsApp unchecked to avoid the Meta tier ceiling. Rate-limited at 120/min, so a 10k backlog drains over ~90 minutes rather than hitting SES in a burst. Verify the recipient count with a dry run before enabling the cron. |
| **R8** | **The sweep starving transactional sends.** A BullMQ limiter is per queue, so a shared queue would put an order confirmation behind 10,000 sweep emails. | Separate `notif-step` (unlimited) and `notif-bulk` (rate-limited) queues, §3.6. Assert in review that the sweep producer never targets `notif-step`. |
| **R9** | **The worker exhausting database connections takes the API down**, since the two processes hold separate Prisma pools against one budget. | Explicit per-process `connection_limit`, Neon's pooled endpoint with `?pgbouncer=true`, `DIRECT_URL` reserved for migrations, and no transaction held across a provider HTTP call (§3.6). |
| **R10** | **Log table growth**, since nothing is pruned (§1.11). | The four indexes keep queries cheap at any size. Archive rather than delete if it ever matters — this is the audit trail for every message the platform has sent. |

---

## 9. Open questions

All prior questions are resolved (§1.8–§1.11). Two items remain, neither blocking:

1. **Per-stage WhatsApp copy.** Launch keeps one WhatsApp template per event, matching today
   (§3.3). Submitting 7 stage-specific templates to WhatsApp Manager is a later improvement —
   `whatsappTemplateOverride` is already in the schema for it.
2. **Re-nudge cadence.** The backlog gets one catch-up email per §3.4. If dormant profiles should be
   nudged again, add `30 d` / `60 d` / `90 d` schedule rows — no code change. Worth deciding once
   the first sweep's numbers are in.

## 10. What was cut, and why

| Cut | Reason |
|---|---|
| Campaigns, segments, batching, `marketingOptOut`, unsubscribe | Not needed. This is an event-driven system; broadcast is a separate product. Removes 3 tables, the segment builder, the campaign UI and the WhatsApp tier problem. **−5 to −7 days.** |
| Sequence-run and step-run tables | The `NotificationLog` unique constraint does the same job in one table. |
| Admin-defined cancel-on-event rules | The code `stillRelevant` guard covers the real cases without a rules UI. |
| Per-entity variable providers + lazy AST resolution | Existed to support admin-created events, which are out of scope. Per-event `resolve()` is a direct port of code that already exists. |
| Quiet hours + runtime settings table | `MAIL_ENABLED` / `WHATSAPP_ENABLED` already exist as kill switches. See R6. |
| WhatsApp template table + Meta sync | The name is one string on the event; approval is confirmed in WhatsApp Manager. |
| Template draft/publish states | Save + validate + version history is enough. Publishing is just saving. |

---

## 12. Edge cases

Worked through after the design settled. **A1–A3 break the plan as written** and their fixes are
folded into §3 and §4 above; the rest are behaviours to implement deliberately or accept knowingly.

### A. Design-breaking — fixed

- **A1 · Repeatable events were being permanently blocked.** The idempotency key
  `(eventKey, entityId, recipientUserId, channel, offsetMinutes)` assumed one occurrence per entity.
  **False for several live events.** `orders.service.ts:2724` fires `notifyRevisionRequested` on
  *every* revision (revision 2, 3, … all share one `orderId`), and `password-reset` is repeatable by
  definition — the second reset email a user requests would **never arrive**. Same for
  extra-revisions/usage-rights purchases, repeat content deliveries after a revision, and repeat
  disputes.
  **Fix:** `emit()` takes an `occurrenceKey`, defaulting to the entity id. Events that repeat pass a
  discriminator — `revisionNumber`, the delivery id, the reset-token id. It joins the unique tuple.
- **A2 · A crash between claiming and sending lost the notification forever.** Claiming by inserting
  the log row meant a process dying after the insert but before the SES call left a `QUEUED` row;
  the retry hit the unique violation and skipped. Silent permanent loss.
  **Fix:** `INSERT … ON CONFLICT DO NOTHING`. If no row is returned, read the existing one — a
  terminal status (`SENT`/`DELIVERED`/`READ`) skips, while a `QUEUED` row whose `claimedAt` is older
  than the stale threshold is **taken over**. Adds `claimedAt` to `NotificationLog`.
  *Accepted trade-off:* a crash after SES accepts but before we record it sends a duplicate on
  retry. **At-least-once is the deliberate choice** — a rare duplicate beats a silent loss.
- **A3 · Test sends would consume the real send's slot.** An admin testing
  `order-content-delivered-for-brand` against a real order would write the log row that then blocks
  the genuine notification.
  **Fix:** test sends use `occurrenceKey = test:${uuid}`, so they can never collide. No partial
  index needed, and they stay visible in the log as tests.

### B. Scheduling and delivery — mechanisms, not warnings

Each of these is closed structurally. A warning nobody reads is not a fix.

#### B1 · Delayed rows on events with no relevance check → **rejected by the API, not warned about**

The catalog derives a code-owned flag: `supportsDelay = typeof stillRelevant === 'function'`, synced
onto `NotificationEvent`. `PUT /events/:key/schedule` returns **422** for any row with
`offsetMinutes > 0` on an event where it is false:

```
"order-content-delivered-for-brand can only send immediately. A delayed row needs a
 stillRelevant check in the event catalog, otherwise it would notify people who have
 already acted. Add one in code, then this row can be saved."
```

The UI disables the offset field rather than letting someone reach the error. For a delayed send
that genuinely has no condition, the developer opts in explicitly with `stillRelevant: ALWAYS` — an
exported constant, one line, and self-documenting in review.

#### B2 · `emit()` inside a transaction → **lint rule**

Your code already gets this right (`orders.service.ts:2724` fires after the block closes), so this
guards the future rather than fixing the present:

```jsonc
// .eslintrc — no-restricted-syntax
{
  "selector": "CallExpression[callee.property.name='$transaction'] CallExpression[callee.property.name='emit']",
  "message": "emit() must run after the transaction commits — a rollback would notify about something that never happened."
}
```

The proper fix is a transactional outbox (write the intent in the same transaction, drain it with a
poller), which would also close **R5**, lost emits when Redis is down. Deferred: it adds a table, a
poller and latency to immediate sends, and today's `void this.run(...)` carries the same exposure —
so this is not a regression. Revisit if a lost notification is ever actually observed.

#### B3 · Missing entities and inactive users → **the type signature forces handling**

```ts
resolve: (ctx, entityId) => Promise<ResolvedVars | null>
```

`null` is in the return type, so a developer cannot forget the case — the step worker logs `SKIPPED`,
reason `entity_gone`, and never throws.

While here, a related gate that belongs with it: a recipient whose `User.status` is not `ACTIVE`
(`SUSPENDED` / `DEACTIVATED`) is skipped with reason `user_inactive`. Nothing today checks this, so
a deactivated account still receives order mail.

#### B4 · Rows deleted or retimed mid-flight → **offset is the identity, not the row id**

The root cause was jobs carrying `scheduleId`, which orphans them when the row is replaced. Fixed by
making the job payload `{ eventKey, entityId, occurrenceKey, offsetMinutes }` and resolving the row
at fire time by `(eventKey, offsetMinutes)`:

- **Row deleted** → no active row matches → skip, reason `row_removed`.
- **Row retimed** → the old job finds no match and skips; future events use the new offset.
- **`@@unique([eventKey, offsetMinutes])` conflicts** disappear, because
  `PUT /events/:key/schedule` replaces the whole set in **one transaction** — upsert by offset,
  delete the rest. There is no intermediate state in which 24 h and 48 h both exist, so re-timing a
  row can no longer collide with its neighbour.

This also matches the log's unique key, which already uses `offsetMinutes` rather than a row id.

#### B5 · New rows are not retro-applied → **an explicit backfill action, driven by the log**

Default stays "applies to events from here on", stated plainly in the UI next to the row.

But the log already records every entity that fired this event, so a backfill is nearly free:

```
Added a +7 d row. 143 orders fired this event in the last 7 days.
[ Apply to those 143 ]   [ Only new events ]
```

Implementation: select distinct `entityId` from `NotificationLog` where `eventKey` matches and
`offsetMinutes = 0` within the window, then enqueue the new row with
`delay = max(offsetMinutes − (now − queuedAt), 0)` — the same sequence-clock arithmetic as
everything else. Idempotency falls out of the existing unique key. Roughly 30 lines, and it removes
the "why did nothing happen" support question entirely.

#### B6 · Retries burning rate-limiter slots → **classify failures; only retry transient ones**

The waste is mostly permanent failures retrying three times. BullMQ's `UnrecoverableError` stops
retries immediately, so the sender classifies before throwing:

| Outcome | Examples | Behaviour |
|---|---|---|
| **Transient** | SES `Throttling`, `ServiceUnavailable`, 5xx, timeouts | Retry, 3 attempts, exponential backoff |
| **Permanent** | SES `MessageRejected`, `MailFromDomainNotVerified`; Meta parameter-count mismatch, invalid template, undeliverable number | `throw new UnrecoverableError(...)` → one attempt, log `FAILED` with the provider's message |

A bad template name then costs one slot per recipient instead of three, and the log shows the real
reason instead of three identical failures. Headroom covers the rest: 120/min against an SES quota
commonly near 840/min.

### C. Admin actions

- **Deleting or deactivating a template that an event still references.** FK `restrict`, and the UI
  names what uses it. A deactivated-but-referenced template must fall back to disk rather than throw.
- **One template shared by several events.** Validation must check `{{variables}}` against the
  **intersection** of every referencing event's `vars`, not just the one being edited.
- **A subject that renders empty.** Validation catches it against example data, but live data can
  still produce it (a null `brandName`). Guard at render: an empty subject falls back to the
  template name rather than letting SES reject the message.
- **Renaming a WhatsApp template in Meta.** The stored string silently stops matching and every send
  for that event fails. The test-send button is the only cheap detection — surface Meta's error text
  verbatim.
- **Test-send permissions.** Test-send takes a real entity id; scope it so an admin cannot render
  another user's order data outside the admin surface they already have.

### D. Provider-specific

- **WhatsApp body variables cannot contain newlines, tabs, or 4+ consecutive spaces.** Meta rejects
  the whole message. A brand name or note pasted with a newline breaks the send. **Sanitize every
  `bodyVar`** — collapse whitespace — before the Cloud API call.
- **Editing an approved template in WhatsApp Manager changes its parameter count.** We send
  positionally (`{{1}}`, `{{2}}`), so adding a placeholder in Meta breaks every send with
  "number of parameters does not match". Nothing on our side detects it until sends fail.
- **A template approved in one language only.** `WHATSAPP_DEFAULT_LANGUAGE` must match the approval,
  or every send 400s.
- **Quality-rating pause.** Meta can pause a template or demote the number's tier; all sends for it
  fail until resolved. Surface it from the log rather than leaving it as a silent failure class.
- **Text templates are HTML-escaped.** The `.text.hbs` files use `{{var}}`, which escapes — so a
  brand named `Tom & Jerry` renders as `Tom &amp; Jerry` in the plain-text part today. Pre-existing;
  worth fixing during the migration with `{{{var}}}` in text templates.
- **SES message size.** SESv2 caps a message at 10 MB. Only reachable if someone inlines base64
  images, but validation should reject an oversized rendered body rather than fail at send.

### E. Population sweep (§3.4)

- **Overlapping runs.** A sweep slower than its cron interval will start again before finishing.
  Take a Redis lock for the duration; skip the run if held.
- **A profile served by both a delayed job and the sweep.** Expected and harmless — whichever lands
  second loses the `ON CONFLICT`.
- **The profile completes mid-sweep.** `stillRelevant` re-checks at fire time, so the nudge is
  skipped with reason `not_relevant`.
- **A predicate that throws.** Fail closed: skip and retry, never send on an unknown state.
- **The sweep keeps the Neon compute awake.** A daily cron is fine; anything more frequent erodes
  the autosuspend saving the existing code is careful about.

### F. Migration

- **Splitting the stage templates is the fiddliest part of P1.** The subject line is a *single line*
  containing four `{{#if isStageN}}` segments; the parser must split subject and body consistently
  and be verified by eye against all seven outputs before the seeder is trusted.
- **Legacy keys referenced by in-flight jobs during cutover.** Keep the disk fallback until every
  delayed job enqueued under the old system has drained — at least as long as the longest offset
  (7 days), not just until the deploy is green.

### G. Data and privacy

- **The log stores email addresses and phone numbers indefinitely** (§1.11, no pruning). If a user
  deletes their account, their address survives in the log. Decide whether account deletion should
  null `toAddress` on their rows — the audit trail stays intact, the PII does not. Worth settling
  before P1, since it is a column-level decision.

---

## 11. Effort

| Phase | Estimate |
|---|---|
| P1 schema + catalog + renderer + seeder (incl. the stage-template split) | 2–3 days |
| P2 queues + dispatcher + step worker + log | 2–3 days |
| P2b population sweep + batching (§3.4) | 1 day |
| P3 admin API + UI (events, schedule, templates, logs) | 4–5 days |
| P4 cutover + drip migration | 2 days |
| P5 cleanup | 1 day |
| Edge-case hardening (§12 B–E: whitespace sanitising, sweep lock, predicate warning, empty-subject guard) | 1 day |
| **Total** | **~13–16 working days** |

Down from ~21–29 for the earlier scope; the cuts in §10 account for the difference. The batching
work survived the cut — it moved from campaigns to the completion sweep (§3.4), which is now the
largest send in the system.
