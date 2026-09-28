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
| 5 | Timing = a list of offsets; **each row picks its own channels** |
| 6 | Keep: `stillRelevant` guard, delivery log, template validation, template version history |
| 7 | Cut: campaigns, segments, quiet hours, entity providers, admin cancel rules |

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

**Recommendation:** fix now as a standalone two-line PR (add both keys to `ALL_TEMPLATE_KEYS`),
independent of this plan.

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
    alwaysSend: false,        // true bypasses the opt-in booleans (password reset, refunds…)

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
    resolve: async (ctx, entityId) => { /* Prisma read → vars + recipient */ },

    /// Only consulted for rows with offsetMinutes > 0. Omit for send-now-only events.
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
```

`emit()` writes one BullMQ job and returns. It is the **only** public export of the module.

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

**Per-row template override (one nullable column).** §2.4 found that the completion drip uses one
template with `isStage1`…`isStage4` switches. Two ways to carry that over, both supported:

1. **Override per row** — split the stage template into four clean ones and point each row at its
   own. Recommended; admin edits plain copy instead of nested `{{#if}}`.
2. **Keep the switches** — leave the override null and use the `stepIndex` and `stepOffsetMinutes`
   values injected into every render context.

### 3.4 Rendering

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

### 3.5 Dispatch

**Two queues**, on the existing `jobs/bullmq-redis.connection.ts` with the same
`attempts: 3` / exponential-backoff / `removeOnComplete` defaults the reminder queue uses.

`notif-event` → **EventDispatcher**
1. Load the event; skip if `deprecated` or `!isActive`.
2. Resolve the recipient.
3. For each active schedule row, enqueue a `notif-step` job with
   `jobId = ${eventKey}-${entityId}-${rowId}` and `delay = max(offsetMinutes×60000 − elapsed, 0)`.

`notif-step` → **StepWorker**
1. **Claim** — insert the `NotificationLog` row. The `@@unique` means a duplicate insert loses the
   race and returns; this is the whole idempotency mechanism.
2. Event / row still active? → skip.
3. `offsetMinutes > 0` → run **`stillRelevant()`**. False → log `SKIPPED`, reason `not_relevant`.
4. `resolve()` — a **fresh** Prisma read.
5. Per channel in the row, **independently** (a WhatsApp failure must not block the email):
   - opt-in gate (`emailNotificationsEnabled` / `whatsappNotificationsEnabled`), bypassed when
     `alwaysSend`. Reuses the existing `canSendToProfile` logic.
   - email: suppression check. WhatsApp: phone normalises to ≥ 8 digits.
   - render → send → update the log row with `providerMessageId`.

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
  alwaysSend           Boolean @default(false)         // bypasses the opt-in booleans
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
  sentAt               DateTime?
  deliveredAt          DateTime?

  /// THE idempotency guarantee. A duplicate insert loses the race and no send happens.
  @@unique([eventKey, entityId, recipientUserId, channel, offsetMinutes])
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

---

## 5. Admin API

Under `JwtAuthGuard + AdminGuard`, following `admin-legal-pages.controller.ts`.

```
GET    /api/admin/notifications/events                 list + template names + row counts
GET    /api/admin/notifications/events/:key            detail + vars + schedule
PATCH  /api/admin/notifications/events/:key            isActive, emailTemplateId, whatsappTemplateName

PUT    /api/admin/notifications/events/:key/schedule   replace all rows for the event
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

**Also dies with the reminder queue:** `scripts/reenroll-completion-reminders.ts` and its two
`package.json` scripts. If cohort re-enrolment is still wanted, it becomes a generic admin action —
decide at P4.

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
| **R7** | **Log table growth.** One row per send per channel. | Modest at current volume. Add a pruning job if it ever matters; the indexes above keep queries cheap regardless. |

---

## 9. Open questions

1. **`alwaysSend` list.** Today **only** password-reset bypasses the opt-in gate. Proposed
   additions: `order-refunded-for-brand`, `order-dispute-opened-*`, `order-dispute-resolved-*`,
   `order-cancelled-by-support-*`. This is a behaviour change — a user with notifications off would
   start receiving refund and dispute mail. Confirm.
2. **Completion drip copy.** Split the `isStage1..4` template into four templates (recommended,
   §3.3), or keep the switches and use the injected `stepIndex`?
3. **Cohort re-enrolment.** Does `reenroll-completion-reminders` need a replacement at P4?
4. **Log retention.** Keep everything, or prune after 90 days?

---

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

## 11. Effort

| Phase | Estimate |
|---|---|
| P1 schema + catalog + renderer + seeder | 2–3 days |
| P2 queues + dispatcher + step worker + log | 2–3 days |
| P3 admin API + UI (events, schedule, templates, logs) | 4–5 days |
| P4 cutover + drip migration | 2 days |
| P5 cleanup | 1 day |
| **Total** | **~11–14 working days** |

Down from ~21–29 for the earlier scope. The cuts in §10 account for the difference.
