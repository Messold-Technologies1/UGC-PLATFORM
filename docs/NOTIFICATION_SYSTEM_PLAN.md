# Dynamic Notification System — Technical Plan

**Status:** Draft for review · **Date:** 2026-09-28 · **Scope:** `server/` + `client/app/admin`

Admin-configurable, multi-channel (Email + WhatsApp) notification engine with event-triggered
sequences and on-demand campaigns. Replaces the hardcoded `mail/` + `whatsapp/` notifier layer.

---

## 1. Decisions locked

| # | Decision | Choice |
|---|---|---|
| 1 | Service shape | `notifications/` **module inside `server/src/`**, run as a **separate process** via a second entry point + `BULLMQ_WORKER_ENABLED`. One repo, one package, one deploy artifact, two deploy targets (§11.1) |
| 2 | Event model | Code-declared event catalog, auto-synced to DB; admin configures everything downstream |
| 3 | WhatsApp authoring | Meta template **name + variable mapping** only; copy stays in WhatsApp Manager |
| 4 | Sequence exit | **Both** — code `stillRelevant` predicate (hard safety net) **plus** admin-chosen cancel-on events |
| 5 | Scope | Event-triggered **and** broadcast campaigns, day one |
| 6 | Email authoring | Raw HTML/Handlebars + shared shell, variable picker, live preview |
| 7 | Timing | Offsets measured from the **triggering event**, plus quiet hours (IST) |
| 8 | User preferences | Keep the two channel booleans; add an `alwaysSend` (transactional) class that bypasses them |
| 9 | Campaign audience | Fixed filter UI + saved, reusable segments |
| 10 | Campaign guardrails | Mandatory recipient preview + test send before the Send button unlocks |
| 11 | Delivery | Plan document first (this file), then phased PRs |
| 12 | Variable scope | Declared **per entity type**, not per event, so future admin-created events inherit a full variable set (§4.1a). Tier 2/3 dynamic event sources deferred (§4.4) |

### 1.1 Two assumptions added during review

These were not in the original answers but follow from combining #5 (campaigns) with #8 (two booleans).
**Flagged for explicit sign-off.**

- **`User.marketingOptOut` + `User.unsubscribeToken`.** A single blanket `emailNotificationsEnabled`
  cannot legally or practically serve both "your order shipped" and "check out our new feature".
  One extra boolean and one token column keep the two-boolean model intact while giving campaigns a
  real unsubscribe path. This is **one column, not a category system.**
- **WhatsApp campaigns are billed per marketing conversation** (~₹0.78/conversation in India) and
  carry quality-rating risk. The plan gates them behind a cost estimate shown at preview time.

---

## 2. Current state audit

Everything below is what exists today and must keep working throughout the migration.

### 2.1 Email

- `server/src/mail/mail.types.ts` — **32 hardcoded `EmailTemplateKey` enum members.**
- `server/src/mail/templates/` — 3 Handlebars files per key (`.subject.hbs`, `.html.hbs`, `.text.hbs`)
  96 files (32 × 3), plus `_partials/email-shell.html.hbs` and `_partials/action-button.html.hbs`.
- `server/src/mail/template-renderer.service.ts` — compiles **all** templates at boot into an
  in-memory `Map`. Registers a `concat` helper. Fails fast if a file is missing.
- `server/src/mail/mail.service.ts` — the send gate chain:
  `empty recipient → isEnabled() → canSendToProfile() → suppression check → render → SES (timeout-wrapped)`.
- `isTransactionalTemplate()` hardcodes exactly one exception: `PASSWORD_RESET` bypasses the opt-in gate.
- `server/src/mail/email-suppression.service.ts` + `EmailSuppression` model — SES bounce/complaint list,
  fed by `webhooks/webhooks.controller.ts` `POST /api/webhooks/ses` (SNS).

### 2.2 WhatsApp

- `server/src/whatsapp/whatsapp.service.ts` — mirrors `MailService`'s gate chain. Meta Cloud API.
- **`server/src/mail/whatsapp-bridge.util.ts` is the critical coupling.**
  `whatsAppTemplateNameForEmail()` derives the WA template name from the email key by replacing
  `-` with `_`. Consequence: **every email automatically fires a WhatsApp message** (all except
  `PASSWORD_RESET`), and there is **no way to configure one channel without the other.**
  Breaking this lockstep is the core ask.
- Universal WA contract today: body var `{{1}}` = recipient name, plus optional extras; button URL =
  the same deep link the email uses, as a frontend-relative path.
- `whatsapp.service.ts` keeps a **bounded in-memory `Map`** (`outbound`, max 5,000) of
  `wamid → {template, to}` so the status webhook can name the message. It is explicitly lossy:
  a restart or a second replica loses it and logs `template=?`. **The delivery-log table below fixes this.**

### 2.3 Event firing

~20 imperative call sites, fire-and-forget:

| Caller | Examples |
|---|---|
| `orders/orders.service.ts` | `notifyBriefSubmitted` (L1880), `notifyBriefAccepted` (L2001), `notifyOrderCancelledBySupport` (L2232), `notifyProductShipped` (L2300), `notifyRevisionRequested` (L2724), `notifyDisputeOpened` (L4710), `notifyOrderRefunded` (L5046) … |
| `watermark/watermark.service.ts` | `notifyContentDelivered` (L215) |
| `jobs/creator-reminder.service.ts` | `notifyCompletionReminder` (L221), `notifyResubmitReminder` (L470) |

Each `notify*` method on `OrderMailNotifier` hardcodes its own context object, and the shared
`orderMailInclude` select spans Order → Brand → Agency → Creator → User.

### 2.4 The existing drip system — the pattern to generalise

`server/src/jobs/creator-reminder.service.ts` + `creator-reminder-queue.service.ts` already implement,
for creators only, almost exactly the mechanics we need:

- Stages at **30 min / 24 h / 3 d / 7 d** (`COMPLETION_STAGE_DELAY_MS`), and a separate resubmit
  drip at 30 min / 24 h / 48 h.
- One **delayed BullMQ job per stage**, scheduled at signup. Delay is computed from the
  **sequence clock** (`completionReminderStartedAt`), not from enqueue time — so a job added late
  still lands on schedule rather than a full stage late. *This plan keeps that arithmetic.*
- `jobId` includes the sequence-clock timestamp so re-enrolling is not swallowed as a BullMQ duplicate.
- **Idempotency via conditional UPDATE**: each stage stamps a nullable column
  (`completionReminder30mAt`, `…24hAt`, `…72hAt`, `…168hAt`) *only if still null*, so the delayed job,
  the backstop sweep, and multiple replicas can never double-send.
- **Exit conditions re-checked at fire time**, not at schedule time.
- A **low-frequency DB-truth backstop sweep** covers what Redis cannot: a Redis restart or eviction
  dropping a delayed job, or the feature being switched on after rows already exist. Deliberately
  infrequent so the Neon compute endpoint can autosuspend.

### 2.5 Pre-existing bug found during this audit

`template-renderer.service.ts` compiles templates at boot from a **hand-maintained
`ALL_TEMPLATE_KEYS` array**, and `render()` throws `Unknown email template: <key>` for anything
not in that array — there is no lazy compile.

Two enum members are missing from the array even though their `.hbs` files exist on disk:

- `ORDER_EXTRA_REVISIONS_PURCHASED_FOR_BRAND` — used at `order-mail.notifier.ts:205`
- `SOCIAL_CONNECTION_EXPIRED` — used at `creator-profile-mail.notifier.ts:228`

Both are live code paths, so today:

1. `mail.send()` throws inside `render()`.
2. The notifier's `run()` helper catches it and emits a single `logger.warn` (`order-mail.notifier.ts:531`).
3. **The `await sendWhatsAppForEmail(...)` on the following line never executes** — so the WhatsApp
   twin is lost too (`creator-profile-mail.notifier.ts:239`).

Net effect: a brand who buys extra revisions, and a creator whose Instagram connection expires,
receive **nothing on either channel**, and the only trace is a warn line.

This is not introduced by this plan — it is exactly the failure class the plan removes:

- The **delivery log** (§5.6) would record it as a `FAILED` row instead of a log line.
- The **publish validation gate** (§6.1) makes a template unusable-but-referenced impossible.
- Sending per channel **independently** (§7.3 step 7) means an email failure can no longer
  suppress the WhatsApp message.
- The DB-backed catalog removes the hand-maintained array that caused it.

**Recommendation:** fix this now as a standalone two-line PR (add both keys to `ALL_TEMPLATE_KEYS`),
rather than waiting for P4 cutover.

---

### 2.6 Infrastructure already present

- `bullmq` + `ioredis`, `handlebars`, `@nestjs/schedule` — all in `server/package.json`.
- `jobs/bullmq-redis.connection.ts`, `jobs/bullmq-watchdog.util.ts` — shared queue plumbing.
- **`BULLMQ_WORKER_ENABLED`** (`creator-reminder-queue.service.ts:81`) — already logs
  *"queue only (no worker on this process)"*. **The separate-process seam exists.**
- `legal-pages` — a working draft / publish / version-history admin pattern to copy.
- `auth/guards/admin.guard.ts` + `JwtAuthGuard` — the admin controller pattern.
- `marked`, `sanitize-html`, `node-html-parser` — available for text-fallback generation.

---

## 3. Target architecture

One codebase and one deploy artifact, started twice with different roles.

```
┌──────────── API process ────────────┐      ┌──── client/ ────┐
│  node dist/main.js                  │      │  admin panel    │
│  BULLMQ_WORKER_ENABLED=false        │◄─────┤  /admin/        │
│                                     │      │  notifications  │
│  orders · watermark · creator flows │      └─────────────────┘
│  notification admin API             │
│  SES + WhatsApp webhook routes      │
│                                     │
│  events.emit('order.brief_…', {…})  │
└──────────────────┬──────────────────┘
                   │
           Redis · BullMQ
    ┌──────────┼──────────┬──────────────┐
 notif.event notif.step campaign.send campaign.recipient
    │          │          │              │
┌───┴──────────┴──────────┴──────────────┴───────────────────┐
│  WORKER process                                            │
│  node dist/main.worker.js   BULLMQ_WORKER_ENABLED=true     │
│                                                            │
│ EventDispatcher ─ load rules ─ recipients ─ open Run       │
│ StepWorker  ─ claim ─ stillRelevant? ─ cancelled?          │
│             ─ quiet hours? ─ resolve FRESH ─ gate ─ send   │
│ CampaignWorker ─ page segment ─ throttle ─ send            │
│                                                            │
│   EmailSender (SES)          WhatsAppSender (Meta Cloud)   │
│        └─────── NotificationDelivery (log) ───────┘        │
└───────────────────────────┬────────────────────────────────┘
                            │
                    the SAME Postgres
      (context resolved at SEND time, never a stale snapshot)
```

**Same build, two start commands.** `main.ts` boots the HTTP app with workers off;
`main.worker.ts` boots only the notification and jobs modules with no HTTP surface beyond
`/health`. Nothing is duplicated — the second entry point imports the same modules.

**Why shared Postgres:** a day-7 reminder re-reads the order at send time, so it renders the current
price, status and names. A separate database would force an emit-time snapshot and send day-0 data
a week later — then need a callback API to fix it, arriving back at shared-DB but slower.

**Why a separate process:** SES and Meta HTTP calls, Handlebars compilation and campaign fan-out
stop competing with API request handling; the worker scales and restarts independently; and a
notification crash cannot take down the API. Cost: one env var and a second deploy target.

**Why not a separate package or repo:** the boundary would not match a domain seam. Notification
context spans Order → Brand → Agency → Creator → User and is resolved live at send time — it is a
view over the whole domain, not a bounded context. Splitting it would cost a workspace conversion
(~3–4 days touching ~40 `PrismaService` importers), two build pipelines, and a migration race to
prevent, in exchange for a compiler-enforced import rule and a smaller container. Neither is worth
it at current volume. **The admin-dynamism this plan delivers comes entirely from the data model,
not from deployment topology.**

### 3.1 Keeping extraction cheap

Extraction later should stay a folder move, so two rules hold from day one:

1. **One public export.** Only `NotificationEventsService.emit()` leaves the module. Enforced by an
   ESLint `no-restricted-imports` rule: nothing outside `src/notifications/**` may import anything
   from it except that service. This is ~90% of what a package boundary buys, for ~zero cost.
2. **The seam is the queue, not a function call.** `emit()` writes a BullMQ job and returns.
   The worker never shares in-process state with the API.

Revisit a true split when campaign volume measurably affects API latency, a separate team owns
notifications, workers need to scale independently of API pods, or the engine is wanted in a second
product. Until one of those is true, deferring costs nothing — and the decision is then made with
real load data instead of a guess.

---

## 4. Event registry

### 4.1 Declaration

Two layers, both code-owned: **entity providers** (variables + recipients, declared once per
entity type) and the **event catalog** (the moments themselves). Plain typed consts rather than
decorators — better type inference, no metadata scanning, trivially testable.

### 4.1a Entity providers — declared once per entity

**This is the load-bearing decision.** Variables belong to the *entity*, not to the event. Declaring
them per-event would mean every new event starts with an empty variable picker; declaring them
per-entity means any event on `order` automatically exposes the whole order variable set.

```ts
// server/src/notifications/entities/order.entity.ts
export const orderEntity = defineEntity('order', {
  label: 'Order',

  /// Every variable any order-based template may use. One place to add one.
  vars: {
    orderId:        { type: 'string', example: 'ord_8f21…',          group: 'core' },
    status:         { type: 'string', example: 'DELIVERED',           group: 'core' },
    packageName:    { type: 'string', example: 'Standard — 3 reels',  group: 'core' },
    priceAmount:    { type: 'money',  example: '₹12,500',             group: 'core' },
    revisionCount:  { type: 'number', example: '1',                   group: 'core' },
    brandName:      { type: 'string', example: 'Acme Beauty',         group: 'brand' },
    creatorName:    { type: 'string', example: 'Ananya R',            group: 'creator' },
    deliveryDueAt:  { type: 'date',   example: '05 Oct 2026',         group: 'dates' },
    actionUrlBrand: { type: 'url',    example: '/brand/orders/ord_8f21' },
    actionUrlCreator:{ type: 'url',   example: '/creator/orders/ord_8f21' },
    // … ~25 total
  },

  /// Who can be addressed for anything that happens to an order.
  recipients: {
    creator:     (o) => ({ userId: o.creator.userId, profileType: 'creator', profileId: o.creator.id }),
    brand:       (o) => ({ userId: o.brand.userId,   profileType: 'brand',   profileId: o.brand.id }),
    agencyOwner: (o) => o.brand.agency && ({ userId: o.brand.agency.ownerUserId }),
    admin:       () => adminOpsRecipient(),
  },

  /// Resolves ONLY the groups the template actually references (see §4.1c).
  resolve: async (ctx, entityId, neededGroups) => { /* narrow Prisma select → vars */ },
})
```

Entities at launch: `order`, `creatorProfile`, `brandProfile`, `user`.
**~4 resolvers replace the 24 per-event `resolve()` functions** the earlier draft implied.

### 4.1b Event catalog

Events become thin: they name a moment on an entity and pick which recipients it applies to.

```ts
export const NOTIFICATION_EVENTS = defineEvents({
  'order.brief_submitted': {
    label: 'Brief submitted by brand',
    description: 'Brand has submitted the creative brief; creator must accept or reject.',
    category: 'LIFECYCLE',          // TRANSACTIONAL | LIFECYCLE | MARKETING
    alwaysSend: false,              // true = bypasses the opt-in booleans
    entity: 'order',                // ← inherits ALL order vars + recipients
    recipients: ['creator', 'brand'],

    /// Extra variables specific to THIS moment, merged over the entity's set.
    extraVars: {
      briefSubmittedAt: { type: 'date', example: '28 Sep 2026' },
    },

    /// Hard safety net. Runs on EVERY step regardless of admin config.
    stillRelevant: async (ctx, { entityId }) =>
      (await ctx.prisma.order.findUnique(...))?.status === 'BRIEF_SUBMITTED',
  },
  // … one entry per event
})

export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS
```

An event's effective variable set is `entity.vars + event.extraVars`. That union is what the admin
variable picker shows and what the §6.1 publish gate validates against.

### 4.1c Lazy variable resolution

Resolving ~25 variables for a template that uses three would mean a needless multi-table join on
every send. So:

1. At **publish time** the validator already parses the template with `Handlebars.parse()`. Walk the
   AST for `PathExpression` nodes and store the referenced names on
   `NotificationTemplate.referencedVars`.
2. At **send time** map those names to their `group`s and pass only those groups to
   `entity.resolve()`, which widens its Prisma `select` accordingly.

A template using `{{creatorName}} {{orderId}}` costs a two-column read, not the full graph.


Emission becomes type-checked:

```ts
// before
this.orderMail.notifyBriefSubmitted(order.id, now)
// after
this.events.emit('order.brief_submitted', { entityId: order.id, occurredAt: now })
```

### 4.2 Sync to DB

On boot the worker upserts the catalog into `NotificationEvent` so the admin dropdown is always current.

- **Code-owned columns** (overwritten on every sync): `label`, `description`, `category`,
  `alwaysSend`, `recipientRoles`, `entityType`, and `variableSchema` — the latter flattened from
  `entity.vars + event.extraVars` so the admin UI reads one field.
- **Admin-owned columns** (never touched by sync): `isActive`.
- Rows whose key disappears from code are marked `deprecated = true`, **never deleted** — rules,
  sequence runs and the delivery log reference them.

> **`alwaysSend` is deliberately code-owned.** If it were admin-editable, someone could mark a
> marketing event as transactional and bypass every opt-out.

### 4.3 Initial catalog

The 32 existing `EmailTemplateKey` values map 1:1 to events, renamed to `domain.action` form and
split by recipient at the *rule* level rather than in the key:

| Today (32 keys, recipient baked in) | Event key | Recipients |
|---|---|---|
| `order-brief-submitted-for-creator` | `order.brief_submitted` | creator |
| `order-brief-accepted-for-brand` | `order.brief_accepted` | brand |
| `order-brief-rejected-for-{brand,creator}` | `order.brief_rejected` | brand, creator |
| `order-product-shipped-for-creator` | `order.product_shipped` | creator |
| `order-product-received-for-brand` | `order.product_received` | brand |
| `order-revision-requested-for-creator` | `order.revision_requested` | creator |
| `order-extra-revisions-purchased-for-{brand,creator}` | `order.extra_revisions_purchased` | brand, creator |
| `order-extra-usage-rights-purchased-for-{brand,creator}` | `order.extra_usage_rights_purchased` | brand, creator |
| `order-content-delivered-for-brand` | `order.content_delivered` | brand |
| `order-content-accepted-for-creator` | `order.content_accepted` | creator |
| `order-completed-for-brand` | `order.completed` | brand |
| `order-rejected-for-{brand,creator}` | `order.rejected` | brand, creator |
| `order-cancelled-for-{brand,creator}` | `order.cancelled` | brand, creator |
| `order-cancelled-by-support-for-{brand,creator}` | `order.cancelled_by_support` | brand, creator |
| `order-refunded-for-brand` | `order.refunded` | brand |
| `order-dispute-opened-for-{brand,creator}` | `order.dispute_opened` | brand, creator |
| `order-dispute-resolved-for-{brand,creator}` | `order.dispute_resolved` | brand, creator |
| `creator-profile-approved` | `creator.profile_approved` | creator |
| `creator-profile-rejected` | `creator.profile_rejected` | creator |
| `creator-profile-completion-reminder` | `creator.profile_incomplete` | creator |
| `creator-profile-resubmit-reminder` | `creator.profile_withdrawn` | creator |
| `social-connection-expired` | `creator.social_connection_expired` | creator |
| `brand-welcome` | `brand.registered` | brand |
| `password-reset` | `auth.password_reset` | user — **`alwaysSend: true`** |

**32 template keys collapse to ~24 events**, because the `-for-brand` / `-for-creator` split becomes
a recipient dimension. The two reminder events become *events that open a sequence* rather than
events that send one message.

Events marked `alwaysSend: true` at launch: `auth.password_reset`, `order.refunded`,
`order.dispute_opened`, `order.dispute_resolved`, `order.cancelled_by_support`.
*(Today only password-reset bypasses the gate — needs your confirmation, see §12.)*

---

### 4.4 Adding a new event — what needs code and what does not

**The honest boundary:** something in the runtime must *observe* that a thing happened. No
architecture removes that. What the design does control is how many code changes stand between
"observed" and "an email and a WhatsApp go out, configured by an admin".

#### What admin can do today with zero code

For any event **already in the catalog**: add or remove channels, change every template, add or
remove steps at any delay, change recipients, add cancel-on rules, turn the whole thing off.
So "fire a WhatsApp as well as the email for order refunds, and chase again after 2 days" is
pure configuration.

#### What needs code

Only a **genuinely new moment**. That is one entry in the catalog:

```ts
'order.payout_released': {
  label: 'Creator payout released',
  category: 'TRANSACTIONAL',
  entity: 'order',                    // ← inherits all ~25 order vars + recipients free
  recipients: ['creator'],
  stillRelevant: async (ctx, { entityId }) => /* … */,
},
```

…plus one emit call at the moment it happens. Because variables come from the entity (§4.1a),
that is genuinely the whole change — **no template plumbing, no context object, no Prisma select**.
Everything after the deploy is admin-side.

#### Tier 2 / Tier 3 — deferred, deliberately

Two further tiers would remove the code step for most future events. **Both are out of scope for
this plan**, recorded here because the per-entity variable design (§4.1a) is what keeps them cheap
to add later, and because one prerequisite is worth knowing about now.

**Tier 2 — entity change events.** One generic sensor emits `order.changed` with
`{ before, after, changedFields }`; admin then writes a field-transition filter
(`status  *  →  DELIVERED`) and configures the sequence as usual. Covers every one of the 15
`OrderStatus` values, and any other field, with no deploy.

> **The chokepoint already exists.** `orders/orders.service.ts:5257` has a private
> `updateOrder()` wrapper that **25 call sites** funnel through, and its
> `withOrderInboxActivityOnUpdate` helper *already pre-reads the existing row* — exactly the
> before/after comparison a change sensor needs. Tier 2 is largely a matter of hanging an emit
> off that function.
>
> **Prerequisite, worth doing whenever those files are next touched:** four writes bypass the
> wrapper and would be invisible to the sensor —
> `orders.service.ts:2927` and `:3159` (direct `tx.order.update`), `order-chat.service.ts`,
> and `watermark.service.ts`; `orders.service.ts:624` uses `updateMany`.
>
> **Trap:** the sensor must enqueue **after commit**, never inside the transaction, or a rolled
> back change still sends a notification.

**Tier 3 — condition / schedule events.** Admin defines entity + filter + cadence
(`status = DELIVERED AND deliveredAt < now() - 3 days`, checked hourly); a cron emits a synthetic
event per newly-matching row, with a dedupe table. This covers the "nothing happened, chase them"
cases that most drip campaigns actually are. It reuses the **campaign segment filter engine**
(§8.1) almost wholesale, so it is cheaper than it looks once P5 exists.

#### Limits that survive all three tiers

1. **WhatsApp waits on Meta.** A brand-new WA template needs approval (hours to days) in WhatsApp
   Manager, outside your admin. An admin-created event can send WhatsApp *immediately* only by
   reusing an already-approved template. Email is genuinely instant.
2. **Unrecorded facts cannot trigger anything.** "Creator opened the brief" needs a `briefViewedAt`
   column to exist first.
3. **A change sensor loses the reason.** `status → CANCELLED_CREDITED` cannot tell you *who*
   cancelled — but today you deliberately send different mail for `notifyOrderCancelledBySupport`
   vs `notifyOrderCancelledByBrand` from the same end status. Declared Tier 1 events remain the
   right tool wherever the reason changes the message.

---

## 5. Data model

New Prisma models. All UUID PKs, matching existing conventions.

### 5.1 Enums

```prisma
enum NotificationChannel            { EMAIL WHATSAPP }
enum NotificationEventCategory      { TRANSACTIONAL LIFECYCLE MARKETING }
enum NotificationRecipientRole      { CREATOR BRAND ADMIN AGENCY }
enum NotificationTemplateStatus     { DRAFT PUBLISHED ARCHIVED }
enum NotificationSequenceRunStatus  { ACTIVE COMPLETED CANCELLED }
enum NotificationDeliveryStatus     { QUEUED SENT DELIVERED READ FAILED SKIPPED BOUNCED COMPLAINED }
enum NotificationCampaignStatus     { DRAFT SCHEDULED SENDING SENT CANCELLED FAILED }
enum WhatsAppTemplateCategory       { UTILITY MARKETING AUTHENTICATION }
```

### 5.2 Catalog and configuration

```prisma
/// Code-owned catalog row, synced on boot. Only `isActive` is admin-editable.
model NotificationEvent {
  key            String   @id                       // 'order.brief_submitted'
  label          String
  description    String?
  category       NotificationEventCategory
  entityType     String?                            // 'order' | 'creatorProfile' | 'user'
  recipientRoles NotificationRecipientRole[]
  /// Resolved union of entity.vars + event.extraVars, flattened at sync time so the
  /// admin UI needs no code access. { name: { type, example, group } }
  variableSchema Json
  alwaysSend     Boolean  @default(false)           // bypasses the opt-in booleans
  isActive       Boolean  @default(true)            // ADMIN-OWNED kill switch
  deprecated     Boolean  @default(false)
  syncedAt       DateTime @updatedAt
  rules          NotificationRule[]
}

/// One configured reaction to an event, for one recipient role.
/// Multiple rules per (event, recipient) are allowed: e.g. an immediate confirmation
/// AND a separate nudge sequence.
model NotificationRule {
  id                String @id @default(uuid()) @db.Uuid
  eventKey          String
  event             NotificationEvent @relation(fields: [eventKey], references: [key])
  recipientRole     NotificationRecipientRole
  name              String                          // "Nudge creator to accept brief"
  isActive          Boolean @default(true)
  /// Admin-chosen event keys that cancel an in-flight run of this rule
  /// for the same entity. Validated against the catalog on save.
  cancelOnEventKeys String[]
  steps             NotificationStep[]
  runs              NotificationSequenceRun[]
  createdByUserId   String? @db.Uuid
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([eventKey, recipientRole, name])
  @@index([eventKey, isActive])
}

/// One send in a rule's sequence. offsetMinutes is measured from the TRIGGERING EVENT
/// (matching COMPLETION_STAGE_DELAY_MS semantics), not from the previous step.
model NotificationStep {
  id                 String @id @default(uuid()) @db.Uuid
  ruleId             String @db.Uuid
  rule               NotificationRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  stepIndex          Int
  offsetMinutes      Int                            // 0 | 30 | 1440 | 2880 | 10080 | 20160 …
  channels           NotificationChannel[]          // [EMAIL] | [WHATSAPP] | both
  emailTemplateId    String? @db.Uuid
  whatsappTemplateId String? @db.Uuid
  respectQuietHours  Boolean @default(true)         // ignored entirely when event.alwaysSend
  isActive           Boolean @default(true)

  @@unique([ruleId, stepIndex])
}
```

`offsetMinutes` as an `Int` covers every duration asked for — 30 min = `30`, 24 h = `1440`,
2 d = `2880`, 7 d = `10080`, 14 d = `20160`. The admin UI shows a value + unit picker and stores minutes.

### 5.3 Templates

```prisma
model NotificationTemplate {                        // EMAIL only
  id           String @id @default(uuid()) @db.Uuid
  key          String? @unique                      // legacy EmailTemplateKey, for migration mapping
  name         String
  description  String?
  subjectHbs   String
  htmlHbs      String  @db.Text
  textHbs      String? @db.Text                     // null → auto-derived from html on render
  /// Variable names found in the Handlebars AST at publish time. Drives lazy
  /// resolution (§4.1c) so a 3-variable template does not trigger a 25-variable join.
  referencedVars String[]
  status       NotificationTemplateStatus @default(DRAFT)
  version      Int     @default(1)
  updatedByUserId String? @db.Uuid
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  versions     NotificationTemplateVersion[]
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

/// A Meta-approved template. Copy is READ-ONLY here — synced from Meta, never authored.
model WhatsAppTemplate {
  id             String @id @default(uuid()) @db.Uuid
  metaName       String                             // 'order_brief_submitted_for_creator'
  language       String @default("en")
  category       WhatsAppTemplateCategory
  approvalStatus String                             // APPROVED | PENDING | REJECTED | PAUSED
  bodyPreview    String? @db.Text                   // synced from Meta, for admin reference only
  /// The only admin-editable field: which event var fills each positional slot.
  /// { "1": "creatorName", "2": "brandName", "button": "actionUrl" }
  variableMap    Json
  syncedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([metaName, language])
}
```

### 5.4 Sequence runtime

```prisma
/// One in-flight sequence for one rule × one entity × one recipient.
model NotificationSequenceRun {
  id                  String @id @default(uuid()) @db.Uuid
  ruleId              String @db.Uuid
  rule                NotificationRule @relation(fields: [ruleId], references: [id])
  entityType          String
  entityId            String
  recipientUserId     String? @db.Uuid
  recipientProfileType String?                      // 'creator' | 'brand'
  recipientProfileId  String? @db.Uuid
  /// The sequence clock. All step offsets are measured from here — NOT from enqueue
  /// time — so a job added late still lands on schedule.
  startedAt           DateTime
  status              NotificationSequenceRunStatus @default(ACTIVE)
  cancelledAt         DateTime?
  cancelledByEventKey String?
  stepRuns            NotificationSequenceStepRun[]

  @@unique([ruleId, entityType, entityId, recipientProfileId])
  @@index([status, startedAt])
  @@index([entityType, entityId])
}

/// Idempotency unit. `claimedAt` is set by a conditional UPDATE … WHERE claimedAt IS NULL,
/// exactly as completionReminder30mAt is claimed today. Zero rows affected = another
/// worker (or the backstop sweep) already has it.
model NotificationSequenceStepRun {
  id            String @id @default(uuid()) @db.Uuid
  runId         String @db.Uuid
  run           NotificationSequenceRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  stepId        String @db.Uuid
  dueAt         DateTime
  claimedAt     DateTime?
  sentAt        DateTime?
  skippedReason String?

  @@unique([runId, stepId])
  @@index([claimedAt, dueAt])                       // drives the backstop sweep
}
```

### 5.5 Campaigns and segments

```prisma
model NotificationSegment {
  id              String @id @default(uuid()) @db.Uuid
  name            String @unique
  description     String?
  /// Validated against a whitelist schema — never raw SQL, never a raw Prisma `where`.
  filters         Json
  createdByUserId String? @db.Uuid
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  campaigns       NotificationCampaign[]
}

model NotificationCampaign {
  id                 String @id @default(uuid()) @db.Uuid
  name               String
  segmentId          String? @db.Uuid
  segment            NotificationSegment? @relation(fields: [segmentId], references: [id])
  inlineFilters      Json?                          // one-off audience, not saved as a segment
  channels           NotificationChannel[]
  emailTemplateId    String? @db.Uuid
  whatsappTemplateId String? @db.Uuid
  status             NotificationCampaignStatus @default(DRAFT)
  scheduledAt        DateTime?

  // ---- Guardrails: ALL must be satisfied before the Send button unlocks ----
  previewedAt        DateTime?
  previewedCount     Int?
  /// Hash of (filters + channels + templateIds) at preview/test time. If the campaign
  /// is edited afterwards the hash no longer matches and both guardrails reset.
  guardrailHash      String?
  testSentAt         DateTime?
  testSentToUserId   String? @db.Uuid
  estimatedCostPaise Int?                           // WhatsApp only: recipients × per-conversation rate

  startedAt          DateTime?
  finishedAt         DateTime?
  sentCount          Int @default(0)
  failedCount        Int @default(0)
  skippedCount       Int @default(0)
  createdByUserId    String? @db.Uuid
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([status, scheduledAt])
}
```

### 5.6 Delivery log

```prisma
/// Durable replacement for the lossy in-memory `outbound` Map in whatsapp.service.ts:37.
model NotificationDelivery {
  id                   String @id @default(uuid()) @db.Uuid
  channel              NotificationChannel
  status               NotificationDeliveryStatus @default(QUEUED)

  eventKey             String?
  ruleId               String? @db.Uuid
  stepId               String? @db.Uuid
  sequenceRunId        String? @db.Uuid
  campaignId           String? @db.Uuid

  recipientUserId      String? @db.Uuid
  recipientProfileType String?
  recipientProfileId   String? @db.Uuid
  toAddress            String                       // email address or E.164 digits

  emailTemplateId      String? @db.Uuid
  whatsappTemplateId   String? @db.Uuid
  renderedSubject      String?

  entityType           String?
  entityId             String?

  /// SES messageId or WhatsApp wamid — the join key for the status webhooks.
  providerMessageId    String?
  errorCode            String?
  errorMessage         String?
  skippedReason        String?                      // 'opted_out' | 'suppressed' | 'no_phone' | 'not_relevant' | 'cancelled' | 'quiet_hours_expired'

  queuedAt             DateTime @default(now())
  sentAt               DateTime?
  deliveredAt          DateTime?
  failedAt             DateTime?

  @@index([providerMessageId])                      // webhook lookup
  @@index([recipientUserId, queuedAt])              // "what did this user receive?"
  @@index([eventKey, queuedAt])
  @@index([campaignId, status])
  @@index([status, queuedAt])
}
```

**Skipped sends are logged too.** Today a skip is only a `logger.warn` line — when someone asks
"why didn't the creator get the WhatsApp?", the answer has to be queryable.

### 5.7 Settings and user changes

```prisma
/// Single-row settings table, admin-editable at runtime.
model NotificationSettings {
  id                    String @id @default("singleton")
  globalKillSwitch      Boolean @default(false)
  quietHoursEnabled     Boolean @default(true)
  quietHoursStart       String  @default("21:00")
  quietHoursEnd         String  @default("09:00")
  timezone              String  @default("Asia/Kolkata")
  quietHoursChannels    NotificationChannel[]       // e.g. [WHATSAPP] only
  campaignMaxRecipients Int?    @default(5000)
  campaignRatePerMinute Int?    @default(120)
  whatsappMarketingRatePaise Int? @default(78)      // for the cost estimate
  updatedByUserId       String? @db.Uuid
  updatedAt             DateTime @updatedAt
}
```

```prisma
model User {
  // … existing fields
  marketingOptOut  Boolean @default(false)
  unsubscribeToken String? @unique                  // backfilled; used in the List-Unsubscribe header + footer link
}
```

**No changes** to `emailNotificationsEnabled` / `whatsappNotificationsEnabled` on
`CreatorProfile` / `BrandProfile` — the existing gate logic is reused verbatim.

---

## 6. Rendering pipeline

`TemplateRendererService` changes from *boot-compiled disk map* to *DB-first with disk fallback*:

1. Resolve the template from the step (`emailTemplateId`), else fall back to the legacy
   `key` → disk `.hbs` lookup. **The fallback is what makes the migration non-breaking:**
   until a DB row exists for a key, the current files are used, unchanged.
2. Compile with Handlebars, cache by `${templateId}:${version}` in a bounded LRU. A publish bumps
   `version`, which invalidates the entry — no restart needed to pick up an edit.
3. Wrap the body in `_partials/email-shell.html.hbs`; keep `action-button.html.hbs` available as
   `{{> actionButton}}`. **Partials stay on disk in phase 1** — they are layout, not copy.
4. Plain-text: use `textHbs` when present, else derive from the rendered HTML with `node-html-parser`
   (already a dependency).
5. Campaign emails get an unsubscribe footer + `List-Unsubscribe` header injected by the shell.

### 6.1 Publish-time validation gate

A template cannot move `DRAFT → PUBLISHED` until all of these pass. This is the main defence against
an admin breaking live email:

- Subject, HTML and text all **compile** as Handlebars.
- Every `{{variable}}` referenced exists in the `variableSchema` of **every event** whose rules use
  this template. Unknown variables are a hard error, not a silent blank.
- A **test render against the `example` values** in the schema succeeds and produces a non-empty
  subject and body.
- Only an **allowlisted helper set** is permitted (`concat` today, plus any we add). Unknown helpers
  are rejected at validation rather than rendering as empty at 2 a.m.
- Rendered HTML passes `sanitize-html` with an email-safe allowlist.

> **Note on trust:** admins author raw HTML, so this is not an untrusted-input boundary in the
> usual sense — but the validation gate still matters, because the failure mode of a bad template
> is silent: a broken `{{brandName}}` renders as nothing and the email goes out looking wrong.

---

## 7. Dispatch pipeline

### 7.1 Queues

| Queue | Job | Purpose |
|---|---|---|
| `notif-event` | `event.emitted` | Fan out one event to its rules |
| `notif-step` | `step.due` | Deliver one step of one sequence run |
| `notif-campaign` | `campaign.send` | Resolve a segment and fan out |
| `notif-campaign-recipient` | `campaign.recipient` | One campaign send, rate-limited |

All built on the existing `jobs/bullmq-redis.connection.ts`, with the same
`attempts: 3` / exponential backoff / `removeOnComplete` defaults the reminder queue uses.

### 7.2 `event.emitted` → EventDispatcher

1. Load the `NotificationEvent`; skip if `deprecated`, `!isActive`, or `globalKillSwitch`.
2. **Cancellation pass first** — find `ACTIVE` runs whose rule lists this event key in
   `cancelOnEventKeys` *and* whose `entityId` matches; set `status = CANCELLED`,
   `cancelledByEventKey`. Delayed jobs are left in Redis; they no-op on the status check at fire time.
   (Also `queue.remove(jobId)` opportunistically, for tidiness.)
3. Load active rules for this event key. For each rule:
   - Resolve the recipient for `rule.recipientRole` from the entity.
   - Upsert a `NotificationSequenceRun` (the `@@unique` makes a repeated emit idempotent).
     `startedAt = event.occurredAt`.
   - Create one `NotificationSequenceStepRun` per active step, `dueAt = startedAt + offsetMinutes`.
   - Enqueue a delayed job per step with
     `jobId = nstep-${runId}-${stepId}` and
     `delay = max(dueAt - now, 0)` — **the sequence-clock arithmetic from
     `buildCompletionReminderJobs`, so a late enqueue still lands on schedule.**

### 7.3 `step.due` → StepWorker

Ordered gate chain. Every skip writes a `NotificationDelivery` row with a `skippedReason`.

1. **Claim** — `UPDATE … SET claimedAt = now() WHERE id = ? AND claimedAt IS NULL`.
   Zero rows affected → another worker or the sweep has it → return.
2. **Run cancelled?** → skip.
3. **Global kill switch / event `isActive` / rule `isActive` / step `isActive`?** → skip.
4. **`stillRelevant(entityId)`** — the code predicate. Runs *always*, even when admin cancel rules
   are configured. This is the belt-and-braces guarantee: a misconfigured admin rule can never
   send a reminder for an already-completed order.
5. **Quiet hours** — if `step.respectQuietHours` and `!event.alwaysSend` and the channel is in
   `quietHoursChannels` and now is inside the window (in `Asia/Kolkata`): re-enqueue for the window's
   end and return **without** consuming the claim (reset `claimedAt` to null in the same transaction).
   A cap prevents infinite deferral.
6. **Resolve context** — call `event.resolve()` for a **fresh** Prisma read.
7. **Per channel**, independently (a WhatsApp failure must not block the email):
   - Opt-in gate — `emailNotificationsEnabled` / `whatsappNotificationsEnabled`, bypassed when
     `event.alwaysSend`. Reuses `MailService.canSendToProfile` / `WhatsAppService.canSendToProfile`.
   - Email: suppression-list check. WhatsApp: phone normalises to ≥8 digits, and the mapped
     `WhatsAppTemplate.approvalStatus === 'APPROVED'`.
   - Render → send → write `NotificationDelivery` with `providerMessageId`.
8. Mark `sentAt`; if this was the last step, mark the run `COMPLETED`.

### 7.4 Backstop sweep

A low-frequency cron (same rationale as `runBackstopSweep` — infrequent enough to let Neon autosuspend)
finds `ACTIVE` runs with `claimedAt IS NULL AND dueAt <= now()` and processes them. This covers a
Redis restart or eviction dropping a delayed job, and the system being enabled after events already fired.

### 7.5 Delivery-status webhooks

- `POST /api/webhooks/ses` — extend the existing handler: on Bounce/Complaint/Delivery, look up
  `NotificationDelivery` by `providerMessageId` and update `status` / `deliveredAt` / `errorMessage`,
  in addition to the current `EmailSuppression` write.
- `POST /api/webhooks/whatsapp` — `noteStatusUpdate()` currently reads the in-memory `outbound` Map.
  Change it to update `NotificationDelivery` by `wamid`. **This removes the documented data loss on
  restart and the second-replica `template=?` problem.** Keep the Map as a fast path if you like;
  the DB is now the source of truth.

---

## 8. Campaigns

### 8.1 Segment filters (whitelisted)

Compiled to a Prisma `where`. No raw SQL, no arbitrary field access.

**Creator segments:** approval status (`ApprovalStatus`), listed / unlisted, profile complete,
niche + content-style facets (`CreatorProfileFacetSelection`), languages
(`CreatorProfileLanguage`), city / state, gender, age group, content-volume bucket, on-location
availability, signup date range, has ≥ N completed orders (`CreatorStats`), rating threshold,
has connected Instagram (`SocialConnection`).

**Brand segments:** brand category (`BrandCategory`), product type, agency-managed vs direct,
signup date range, has placed ≥ N orders, wallet balance threshold.

**Both:** channel opt-in state, `marketingOptOut = false` (**always forced on, not a choice**),
not on the email suppression list.

### 8.2 Send flow

1. **Preview** — run the count query, store `previewedAt`, `previewedCount`, `guardrailHash`, and
   (for WhatsApp) `estimatedCostPaise = recipients × whatsappMarketingRatePaise`.
2. **Test send** — to the admin's own address/number; stores `testSentAt`.
3. **Send unlocks** only when `previewedAt` and `testSentAt` are both set **and** `guardrailHash`
   still matches the campaign's current filters/channels/templates. Any edit resets both.
4. Enforce `campaignMaxRecipients`.
5. `campaign.send` pages the segment with a cursor and enqueues `campaign.recipient` jobs under a
   BullMQ `limiter: { max: campaignRatePerMinute, duration: 60_000 }`, keeping SES inside its rate
   limit and WhatsApp off a cliff.
6. Each recipient job re-checks opt-in + `marketingOptOut` + suppression **at send time** (a
   campaign can take a while to drain; someone may unsubscribe mid-flight), renders, sends, logs.
7. Rolling `sentCount` / `failedCount` / `skippedCount` on the campaign row for the admin progress view.

---

## 9. Admin API

All under `JwtAuthGuard + AdminGuard`, following `admin-legal-pages.controller.ts`.

```
GET    /api/admin/notifications/events                     list catalog (+ rule counts)
GET    /api/admin/notifications/events/:key                detail + variable schema + rules
PATCH  /api/admin/notifications/events/:key                toggle isActive

GET    /api/admin/notifications/rules?eventKey=
POST   /api/admin/notifications/rules                      create (steps nested)
PUT    /api/admin/notifications/rules/:id                   replace rule + steps
DELETE /api/admin/notifications/rules/:id
POST   /api/admin/notifications/rules/:id/test              dry-run against a real entity id

GET    /api/admin/notifications/templates
POST   /api/admin/notifications/templates
PUT    /api/admin/notifications/templates/:id               save draft
POST   /api/admin/notifications/templates/:id/validate      run the §6.1 gate, return errors
POST   /api/admin/notifications/templates/:id/publish       gate must pass; bumps version
POST   /api/admin/notifications/templates/:id/preview       render with example or real entity data
POST   /api/admin/notifications/templates/:id/test-send
GET    /api/admin/notifications/templates/:id/versions
POST   /api/admin/notifications/templates/:id/revert/:v

GET    /api/admin/notifications/whatsapp-templates
POST   /api/admin/notifications/whatsapp-templates/sync     pull approved list from Meta
PUT    /api/admin/notifications/whatsapp-templates/:id/mapping

GET    /api/admin/notifications/segments
POST   /api/admin/notifications/segments
POST   /api/admin/notifications/segments/preview            { filters } → { count, sample[] }

GET    /api/admin/notifications/campaigns
POST   /api/admin/notifications/campaigns
PUT    /api/admin/notifications/campaigns/:id
POST   /api/admin/notifications/campaigns/:id/preview
POST   /api/admin/notifications/campaigns/:id/test-send
POST   /api/admin/notifications/campaigns/:id/send
POST   /api/admin/notifications/campaigns/:id/cancel

GET    /api/admin/notifications/deliveries                  filter: user, event, channel, status, date
GET    /api/admin/notifications/deliveries/:id

GET    /api/admin/notifications/settings
PUT    /api/admin/notifications/settings
```

Public, unauthenticated: `GET /api/unsubscribe/:token` → sets `marketingOptOut = true`.

---

## 10. Admin UI

Under `client/app/admin/notifications/`, matching the existing admin layout.

| Screen | Contents |
|---|---|
| **Events** | Table of the catalog: key, label, category, recipients, rule count, active toggle. Filter by domain. |
| **Event detail** | The rule builder. Per recipient role: a timeline of steps. Each step = offset (value + unit) · channel checkboxes (Email / WhatsApp, either or both) · template pickers · quiet-hours toggle. A "Cancel this sequence if…" multi-select of event keys. |
| **Templates** | List with status + last edited. Editor: subject field, HTML/Handlebars code editor, **variable picker sidebar populated from the event's `variableSchema`**, live preview pane (desktop + mobile), validate button, publish button, version history with diff + revert. |
| **WhatsApp templates** | Synced from Meta, read-only copy with approval status badge. The one editable control: map each `{{1}}`, `{{2}}`, button URL to an event variable. |
| **Segments** | Saved segments with live recipient counts. Filter builder from §8.1. |
| **Campaigns** | List + builder: name → audience (segment or inline filters) → channels → templates → **Preview (shows count + WhatsApp cost estimate)** → **Test send** → Send/Schedule. Send button disabled with an explicit reason until both guardrails are green. Live progress while sending. |
| **Delivery log** | Searchable table: recipient, event, channel, status, timestamp, error/skip reason. Per-user timeline view. |
| **Settings** | Quiet hours (window + timezone + which channels), global kill switch, campaign caps and rate, WhatsApp rate for cost estimates. |

---

## 11. Migration plan

Strangler pattern. Nothing breaks at any point, because the renderer falls back to the existing
disk templates until a DB row exists.

| Phase | Contents | User-visible |
|---|---|---|
| **P1** | Prisma migration (all §5 models), **4 entity providers** (§4.1a), event catalog with the ~24 events, registry boot-sync, DB-first renderer **with disk fallback** + lazy variable resolution, seeder that imports the 96 `.hbs` files into `NotificationTemplate` rows as `PUBLISHED` | None |
| **P2** | Queues + EventDispatcher + StepWorker + delivery log + webhook wiring. `events.emit()` added **alongside** existing `notify*` calls, with sends **disabled** — log-only shadow mode to compare what would be sent vs what is sent | None |
| **P3** | Admin API + UI for events, rules, steps, templates, WhatsApp mapping. Seed one rule per existing event reproducing **exactly** today's behaviour | Admin can view/edit; sends still from the old path |
| **P4** | **Cutover.** Enable the new path, remove the `notify*` calls, delete `whatsapp-bridge.util.ts`. Migrate the creator drips (see risk R3) | The real switch |
| **P5** | Campaigns, segments, unsubscribe, marketing opt-out | New capability |
| **P6** | Delete `order-mail.notifier.ts`, `creator-profile-mail.notifier.ts`, `brand-profile-mail.notifier.ts`, the disk fallback, `EmailTemplateKey`, and the old reminder columns | None |

The worker process can be split out any time after P2: add `main.worker.ts`, deploy a second
target running `start:worker`, and set `BULLMQ_WORKER_ENABLED=false` on the API. Until then
everything runs in-process, which is also how local development stays.

---


### 11.1 Target code layout

One new module, `server/src/notifications/`, plus a second entry point. The surviving pieces of
`mail/` and `whatsapp/` **move into it** rather than being rewritten, so by P6 both old folders are
gone and there is a single home for everything notification-related.

```
server/src/notifications/
├── notifications.module.ts            # API side: admin controllers + emit()
├── notifications.worker.module.ts     # worker side: queues + workers
│
├── catalog/
│   ├── define-events.ts
│   ├── event-catalog.ts               # the ~24 Tier-1 events (§4.1b)
│   └── registry-sync.service.ts       # boot upsert into NotificationEvent
│
├── entities/                          # §4.1a — vars + recipients, per entity
│   ├── define-entity.ts
│   ├── order.entity.ts
│   ├── creator-profile.entity.ts
│   ├── brand-profile.entity.ts
│   └── user.entity.ts
│
├── rendering/
│   ├── template-renderer.service.ts   # REWRITTEN from mail/ — DB-first, disk fallback
│   ├── template-validator.service.ts  # NEW — §6.1 publish gate + AST var extraction
│   ├── partials/                      # MOVED from mail/templates/_partials — stays on disk
│   │   ├── email-shell.html.hbs
│   │   └── action-button.html.hbs
│   └── legacy-templates/              # MOVED from mail/templates — deleted at P6
│
├── channels/
│   ├── email/
│   │   ├── email-sender.service.ts        # FROM mail/mail.service.ts — gate chain kept
│   │   ├── ses.transport.ts               # MOVED unchanged
│   │   └── email-suppression.service.ts   # MOVED unchanged
│   └── whatsapp/
│       ├── whatsapp-sender.service.ts     # FROM whatsapp.service.ts — in-memory Map removed
│       ├── whatsapp-cloud.transport.ts    # MOVED unchanged
│       ├── whatsapp-template-sync.service.ts  # NEW — pull approved list from Meta
│       └── whatsapp-webhook.controller.ts # MOVED — status written to the delivery log
│
├── dispatch/
│   ├── notification-events.service.ts # emit() — THE ONLY PUBLIC EXPORT (§3.1)
│   ├── event-dispatcher.worker.ts
│   ├── step.worker.ts
│   ├── recipient-resolver.service.ts
│   ├── quiet-hours.util.ts
│   └── backstop-sweep.service.ts
│
├── delivery-log/
│   └── delivery-log.service.ts
│
├── campaigns/                         # P5
│   ├── segment-filter.compiler.ts
│   ├── campaign.service.ts
│   └── campaign.worker.ts
│
├── admin/
│   ├── admin-events.controller.ts
│   ├── admin-rules.controller.ts
│   ├── admin-templates.controller.ts
│   ├── admin-whatsapp-templates.controller.ts
│   ├── admin-campaigns.controller.ts
│   ├── admin-deliveries.controller.ts
│   ├── admin-settings.controller.ts
│   └── dto/
│
└── queues/
    └── notification-queues.ts         # queue names, job types, jobId builders
                                       # (reuses jobs/bullmq-redis.connection.ts)

server/src/main.worker.ts              # NEW — worker entry point, /health only
```

#### Running it as two processes

```jsonc
// server/package.json
"scripts": {
  "start:prod":   "node dist/main.js",          // BULLMQ_WORKER_ENABLED=false
  "start:worker": "node dist/main.worker.js"    // BULLMQ_WORKER_ENABLED=true
}
```

One build, one image, two start commands. `main.worker.ts` imports
`NotificationsWorkerModule` and `JobsModule` only — no controllers, no Swagger, no Socket.IO.

`BULLMQ_WORKER_ENABLED` already exists (`creator-reminder-queue.service.ts:81`, logging
*"queue only (no worker on this process)"*), so the API-side half of this split is already built
and proven for the existing reminder queue.

**Local development** stays single-process: run the API with `BULLMQ_WORKER_ENABLED=true` and
everything works in one terminal. The split is a production deployment concern only.

#### The public surface shrinks to one method

Today seven services import mail notifiers and call one of ~20 `notify*` methods. Afterwards they
import `NotificationEventsService` and call `emit()`. Nothing outside `notifications/` knows that
email or WhatsApp exist — enforced by the ESLint rule in §3.1:

```jsonc
// .eslintrc — no-restricted-imports
{
  "patterns": [{
    "group": ["**/notifications/**"],
    "message": "Import NotificationEventsService from notifications/dispatch only."
  }]
}
```

### 11.2 File-by-file disposition

Nothing is deleted before P4 proves the new path in production. The legacy templates **are** the
P1–P5 fallback, and `EmailTemplateKey` is referenced in 51 places.

#### Deleted (P6) — ~2,400 lines

| File | Lines | Why |
|---|---:|---|
| `mail/order-mail.notifier.ts` | 707 | 20 hand-written `notify*` methods → catalog entries |
| `mail/creator-profile-mail.notifier.ts` | 306 | same |
| `mail/brand-profile-mail.notifier.ts` | 109 | same |
| `mail/whatsapp-bridge.util.ts` | 61 | **the email↔WhatsApp lockstep** — replaced by per-step channels |
| `mail/mail.types.ts` | 57 | `EmailTemplateKey` → DB rows |
| `mail/mail.module.ts` | 30 | folded into `notifications.module.ts` |
| `whatsapp/whatsapp.module.ts` | 21 | folded in |
| `jobs/creator-reminder*.ts` (5 files) | 1,119 | hardcoded drip → admin-configured sequences |
| `mail/templates/*.hbs` (96 files) | — | migrated to `NotificationTemplate` rows (partials excepted) |

#### Moved and kept — ~860 lines

All destinations below are inside `server/src/notifications/` (§11.1). These are file moves within
the same package, so imports of `PrismaService`, `with-timeout` and `frontend-url.util` are
unchanged apart from their relative paths.

| File | Lines | Change |
|---|---:|---|
| `mail/ses-mail.transport.ts` | 73 | **none** — pure SES client |
| `mail/email-suppression.service.ts` | 51 | **none** |
| `mail/brand-mail.recipient.ts` | 25 | becomes the `brandProfile` recipient resolver |
| `mail/mail.service.ts` | 146 | gate chain kept; template lookup swapped for the new renderer |
| `whatsapp/whatsapp-cloud.transport.ts` | 138 | **none** — pure Meta Cloud client |
| `whatsapp/whatsapp.service.ts` | 238 | gate chain kept; **the bounded in-memory `outbound` Map is deleted** (§2.2) in favour of the delivery log |
| `whatsapp/whatsapp-webhook.controller.ts` | 154 | `noteStatusUpdate` writes to `NotificationDelivery` by `wamid` |
| `whatsapp/whatsapp.types.ts` | 35 | trimmed |
| `mail/templates/_partials/*` | — | moved to `rendering/partials/`, still on disk |

> **Do not rewrite the transports.** `ses-mail.transport.ts` and `whatsapp-cloud.transport.ts` are
> working, timeout-wrapped provider clients with no business logic in them. They move verbatim.

#### Rewritten

| File | Lines | Change |
|---|---:|---|
| `mail/template-renderer.service.ts` | 162 | boot-compiled disk `Map` → DB-first with disk fallback, LRU by `templateId:version`, lazy variable groups. The shell/partial/`concat`-helper logic survives. Its spec (133 lines) is extended, not replaced. |

#### Call sites to migrate (P4)

Seven files swap `notify*` calls for `events.emit()`:
`auth/password.service.ts`, `brand-profile/brand-profile.service.ts`,
`creator-profile/creator-profile.service.ts`, `orders/orders.service.ts`,
`social-connections/social-connections.service.ts`, `watermark/watermark.service.ts`,
and `jobs/creator-reminder.service.ts` (which then dies).

`webhooks/webhooks.module.ts` imports `MailModule` only for the suppression service — it just
repoints to `NotificationsModule`.

**Also dies with the reminder queue:** `scripts/reenroll-completion-reminders.ts` and its two
`package.json` scripts (`reenroll:completion-reminders`, `…:dev`). If you still need cohort
re-enrolment after cutover, it becomes a generic "re-open sequence for these entity ids" admin
action rather than a bespoke script — worth deciding at P4, not P6.


## 12. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **WhatsApp lockstep removal silently stops WhatsApp.** Today every email auto-fires a WA message via `whatsAppTemplateNameForEmail`. After migration WA only fires where a step says so — a missed step means the channel goes quiet with no error. | P3 seeds every rule with **both** channels, reproducing current behaviour exactly. A migration test asserts: for each of the 31 WA-twinned keys, a rule exists with `WHATSAPP` in `channels`. |
| **R2** | **Meta approval is the long pole.** Rules cannot reference a WA template that isn't approved, and approval takes hours to days. | Sync approved templates from Meta in P3; the step editor greys out unapproved templates. Campaign-category (MARKETING) templates must be submitted early in P5. |
| **R3** | **Double-send during the creator-drip cutover.** `CreatorReminderService` and a new rule for `creator.profile_incomplete` would both fire. | Single atomic cutover: disable `CREATOR_COMPLETION_REMINDERS_ENABLED` in the same deploy that activates the rule. Backfill `NotificationSequenceStepRun.sentAt` from the existing `completionReminder*At` columns so already-sent stages are never repeated. Keep the old columns until P6. |
| **R4** | **A bad template breaks live email.** Failure is silent — a typo'd variable renders blank. | The §6.1 publish gate: compile + variable-existence + example-render + helper allowlist. Plus version history and one-click revert. |
| **R5** | **SES reputation on bulk sends.** Complaints and bounces from campaigns can degrade the whole account, including transactional mail. | Rate limiter, forced `marketingOptOut` filter, suppression check at send time, `List-Unsubscribe` header, complaint rate surfaced in the delivery log. Consider a dedicated SES configuration set for campaigns. |
| **R6** | **WhatsApp quality rating.** Marketing blasts are the fastest way into a lower messaging tier, which throttles *transactional* messages too. | Cost estimate at preview, quiet hours applied to WA, separate `WhatsAppTemplateCategory`, and campaign channel selection defaulting to email-only. |
| **R7** | **Neon autosuspend vs campaign load.** A large campaign wakes the compute and hammers it. | Cursor-paged segment resolution, rate limiter, `campaignMaxRecipients` cap. Keep the backstop sweep infrequent, as the current code deliberately does. |
| **R8** | **Lost emit if Redis is down.** `events.emit()` enqueues; a Redis outage drops the event. Today's `void this.run(...)` has the same weakness, so this is not a regression — but it is worth fixing. | The backstop sweep covers sequences already opened. For emits themselves, the optional hardening is a transactional outbox table written in the same transaction as the domain change, drained by a poller. **Deferred to P5+ — flagged, not scoped.** |

---

## 13. Open questions

1. **`alwaysSend` list.** §4.3 proposes `auth.password_reset`, `order.refunded`,
   `order.dispute_opened`, `order.dispute_resolved`, `order.cancelled_by_support`. Today **only**
   password-reset bypasses the gate, so this is a behaviour change: a user who has switched
   notifications off would start receiving refund and dispute mail. Confirm the list.
2. **`marketingOptOut` + `unsubscribeToken`** (§1.1) — approved as an addition to the two-boolean model?
3. **Quiet hours scope** — apply to WhatsApp only, or to email as well? Proposed default: WhatsApp only.
4. **Admin recipients.** Several events could usefully notify your ops team (new dispute, refund
   requested). The `ADMIN` recipient role is in the schema but needs a destination — a fixed ops
   address, or all users with the ADMIN role?
5. **Agency recipients.** `orderMailInclude` already selects `brand.agency.ownerUserId`. Should
   agency owners be a first-class recipient role on brand-side events?
6. **Delivery-log retention.** Campaigns will generate volume. Proposed: keep 90 days hot, then prune
   via a monthly job — keeping aggregate counts on the campaign row permanently.
7. **Shell partial in DB?** `email-shell.html.hbs` is branding, so admins may eventually want to edit
   it. Proposed: keep on disk in P1, move to DB in P5 if wanted.
8. **Who may edit?** Currently `AdminGuard` is binary. Does template editing / campaign sending need a
   finer permission than "is admin"? The `Permission` / `RolePermission` tables already exist and are unused here.

---

## 14. Effort estimate

| Phase | Estimate |
|---|---|
| P1 schema + entity providers + registry + renderer + seeder | 3–4 days |
| P2 queues + dispatcher + step worker + delivery log | 4–5 days |
| P3 admin API + UI (events, rules, templates, WA mapping) | 6–8 days |
| P4 cutover + drip migration | 2–3 days |
| P5 campaigns + segments + unsubscribe | 5–7 days |
| P6 cleanup | 1–2 days |
| **Total** | **~21–29 working days** |

P1–P4 (full replacement of today's system, admin-configurable) is roughly **15–20 days**.
The separate *process* adds essentially nothing to that — a second entry file and a deploy target.
A separate *package* would have added ~3–4 days up front plus ongoing overhead; deferred per §3.1.
P5 (campaigns) is genuinely additive and can be deferred without blocking anything.

Per-entity variable providers (§4.1a) are **cost-neutral to slightly cheaper** than the per-event
alternative: ~4 entity resolvers replace ~24 per-event `resolve()` functions. The saving is in P1,
and it is what keeps the deferred tiers affordable:

| Deferred (not scoped here) | Estimate if added later |
|---|---|
| Tier 2 — entity change events (§4.4), incl. routing the 4 stray `.order.update` sites | 3–4 days |
| Tier 3 — condition / schedule events (§4.4), assuming P5 segment engine exists | 3–4 days |
