# Browser Push Notifications — Technical Plan

**Status:** Draft for review · **Date:** 2026-10-28 · **Scope:** `server/src/notifications`, `server/src/push`, `server/src/order-chat`, `client/`

Adds **PUSH** as a third channel to the existing admin-configurable notification engine, so every
moment that can send an email or a WhatsApp message can also raise a browser notification — plus
order chat, which does not go through the engine today.

See `docs/NOTIFICATION_SYSTEM_PLAN.md` for the engine this builds on.

---

## 1. Decisions locked

| # | Decision |
|---|---|
| 1 | **Web Push only.** No `new Notification()`-from-the-socket stopgap. Service worker + VAPID, so a notification arrives with every tab closed. |
| 2 | `PUSH` becomes a third `NotificationChannel`, chosen per schedule row like the other two. No parallel system. |
| 3 | Chat messages go **through the engine**: two new catalog events emitted from `OrderChatService`. |
| 4 | Push copy **falls back** to the email subject + derived text. Per-event overrides are optional columns, authored later only where the fallback reads badly. |
| 5 | One `NotificationLog` row per **user** per event per offset. Device fan-out is the transport's job, below the log. |
| 6 | Burst collapsing for chat is done with the **occurrence key**, not new infrastructure (§5.2). |

### Out of scope

Native mobile push (FCM/APNs), admin broadcast/announcement sends, notification grouping across
orders, and a server-side read/unread store for the bell dropdown (it stays on localStorage).

---

## 2. Why it slots into the engine

The engine already gives push everything it needs:

- **Per-row channels.** `NotificationSchedule.channels` is an array. Ticking `PUSH` and leaving
  `EMAIL`/`WHATSAPP` unticked is already expressible — which is exactly what chat needs.
- **`actionUrl`.** Every event's `resolve()` already produces one (it drives the WhatsApp button).
  That is the push click target, free.
- **Gates.** `User.status`, the per-profile opt-in booleans, `stillRelevant`, the dedupe claim and
  the delivery log all apply unchanged.
- **Admin UI.** `/admin/notifications` already renders the channel checkboxes and a log filter off
  the enum.

The only genuinely new things are a transport, a subscription table, a service worker, and chat.

---

## 3. Phase 1 — Web Push plumbing (server)

### 3.1 Schema

`server/prisma/schema.prisma`:

```prisma
enum NotificationChannel {
  EMAIL
  WHATSAPP
  PUSH
}

/// One browser on one device. A user with a laptop and a phone has two rows.
/// Pruned by the transport on a 404/410 from the push service.
model PushSubscription {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @db.Uuid
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// The push service URL. Unique: re-subscribing the same browser must update, not duplicate.
  endpoint      String   @unique
  p256dh        String
  auth          String
  userAgent     String?
  createdAt     DateTime @default(now())
  lastSuccessAt DateTime?
  /// Consecutive soft failures. Not used to delete — only a 404/410 deletes.
  failureCount  Int      @default(0)

  @@index([userId])
}
```

Plus `pushNotificationsEnabled Boolean @default(true)` on `CreatorProfile`, `BrandProfile` and
`Agency`, mirroring the two flags already there.

Migration: `20261028120000_push_notifications`.

### 3.2 Transport

New module `server/src/push/`:

- **`web-push.transport.ts`** — wraps the `web-push` npm package (new dependency). VAPID from
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Timeout-wrapped the way
  `SesMailTransport` is.
  - Loads every `PushSubscription` for the user and sends to each.
  - **404 / 410 → delete the row.** That is the only correct way to prune dead browsers.
  - 429 / 5xx → rethrow so BullMQ retries.
  - 400 / 413 (bad payload, too large) → `PermanentSendError`, so it burns one attempt not three.
  - Returns `{ delivered: number; pruned: number }`. Zero subscriptions is not an error — it is a
    skip, decided by the caller.
- **`push-subscriptions.service.ts`** / **`push.controller.ts`**:
  - `GET  /api/push/vapid-public-key` — public, so the client can build `applicationServerKey`.
  - `POST /api/push/subscriptions` — upsert on `endpoint`, bound to the authenticated user.
  - `DELETE /api/push/subscriptions` — body `{ endpoint }`, called on logout and on toggle-off.

> ⚠️ Sends happen in the **worker** process (`main.worker.ts`), not the API. The VAPID env vars
> must be on the worker container too, or push silently fails there while the API looks healthy.


### 3.3 Generating the VAPID keys

VAPID keys are not issued by anyone — no account, no registration, no cost. They are an
ECDSA P-256 keypair, base64url-encoded. Either command produces one:

```bash
npx web-push generate-vapid-keys
```

```bash
# Equivalent, with no dependency on the package being installed yet.
node -e '
const { generateKeyPairSync } = require("crypto");
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = privateKey.export({ format: "jwk" });
const pub = Buffer.concat([
  Buffer.from([4]),                        // uncompressed-point marker
  Buffer.from(jwk.x, "base64url"),
  Buffer.from(jwk.y, "base64url"),
]).toString("base64url");
console.log("VAPID_PUBLIC_KEY=" + pub);
console.log("VAPID_PRIVATE_KEY=" + jwk.d);
'
```

The public key is always **87 characters**, the private key **43**. Different lengths mean
something mangled them in transit.

Generate them on the deploy host or a local machine — never anywhere the output is captured in a
log or a shared session — and append to `/etc/gocollab/server.env`:

```
VAPID_PUBLIC_KEY=B…
VAPID_PRIVATE_KEY=o…
VAPID_SUBJECT=mailto:support@yourdomain.com
```

`VAPID_SUBJECT` must be a `mailto:` or `https:` URL — the contact a push service uses to reach the
sender about misbehaving traffic. Use a role address, not a personal one.

Only the **private** key is a secret. The public key ships to every browser as
`applicationServerKey`, which is why serving it from `GET /api/push/vapid-public-key` is fine.

**Generate once and keep it.** The public key is baked into every subscription a browser creates,
so rotating it invalidates all of them — silently. See §8.

### 3.4 Env validation

In `server/src/config/env.validation.ts`, following the pattern already used there:

```ts
  // Web Push (VAPID). Optional so a deploy before key generation still boots;
  // the transport skips the channel when they are absent.
  VAPID_PUBLIC_KEY: Joi.string().length(87).optional(),
  VAPID_PRIVATE_KEY: Joi.string().length(43).optional(),
  VAPID_SUBJECT: Joi.string().pattern(/^(mailto:|https:)/).optional(),
```

The transport guards on all three being present, the way `notifications/sending-enabled.ts` guards
the engine: with keys absent, a PUSH row records its decision as a skip rather than throwing.

---

## 4. Phase 2 — wire PUSH into the engine

Nearly all of this is `notifications/dispatch/notification-step.service.ts`.

### 4.1 Address and identity

Push has no single address. Use:

```ts
const address = channel === NotificationChannel.PUSH
  ? `push:${recipient.userId}`
  : channel === NotificationChannel.EMAIL ? recipient.email : recipient.phone;
```

One log row per user per event per offset; the device fan-out happens underneath. This keeps
`NotificationLog`'s unique constraint doing exactly the job it already does — a second worker
cannot double-push, and "why didn't they get it?" is still answerable from one row.

### 4.2 Gates

- `optedIn()` and `readFlag()` gain a `PUSH` branch reading `pushNotificationsEnabled`.
- No-subscription case: new skip reason `no_push_subscription`, added to the `SkipReason` union in
  `notifications/log/notification-log.service.ts:15`. Distinct from `no_address` so the logs tell
  "never granted permission" apart from "has no email on file".
- `alwaysSend` (password reset) still bypasses the opt-in booleans — but a user with no
  subscription simply skips; push is never the only channel for an `alwaysSend` event.

### 4.3 Copy

Add to `NotificationTemplate`:

```prisma
  /// Optional push override. Null falls back to the rendered email subject.
  pushTitleHbs String?
  /// Optional push override. Null falls back to the derived text, truncated.
  pushBodyHbs  String? @db.Text
```

`NotificationTemplateRenderer` gains `renderPush()`:

1. `pushTitleHbs` if set, else the rendered `subjectHbs`.
2. `pushBodyHbs` if set, else `deriveText(renderedHtml)` (already exists in
   `rendering/derive-text.ts:7`) truncated to ~120 chars on a word boundary.
3. `url` = `recipient.vars.actionUrl`, passed through `frontendRelativePath` like WhatsApp does.
4. `tag` = the event key, or `order-chat:<orderId>` for chat (§5.3).

All ~30 existing events therefore produce sensible push copy on day one with no authoring work.
Overrides get written only where the email subject reads badly as a notification title.

Payload stays well under the ~4KB encrypted cap: title, body, url, tag, icon path. No images.

### 4.4 Admin

`admin/notifications-admin.service.ts` already persists `channels: NotificationChannel[]`, so the
API is close to free — check `rendering/template-validator.service.ts` for any channel-shaped
assumptions. Client side:

- `client/features/notifications/types.ts:1` — `"EMAIL" | "WHATSAPP" | "PUSH"`.
- `client/features/notifications/components/schedule-editor.tsx:147` — third checkbox.
- The logs page gains a PUSH filter off the same enum.

---

## 5. Phase 3 — chat messages

Chat is the one thing that does not touch the engine today: `OrderChatService.sendMessage` →
`OrderChatRealtimeNotifier.emitChatMessage` → socket, and nothing else. Admins post into the same
table (the dispute group chat), so **one pair of events covers brand, creator and admin senders.**

### 5.1 The events

Two entries in a new `notifications/catalog/order-chat.events.ts`:

- `order-chat-message-for-brand`
- `order-chat-message-for-creator`

Emitted from `order-chat.service.ts`, **after the transaction commits**, for the counterparty only
(never `message.senderUserId`). `resolve()` reads at send time and returns
`{ senderName, unreadCount, preview, actionUrl }`.

Both ship with a single schedule row at offset `0` with **PUSH only**. Nobody wants an email per
chat message — and the per-row channel model means that is a configuration choice an admin can
revisit, not a code decision.

### 5.2 Burst collapsing — via the occurrence key

Twenty rapid messages must not be twenty notifications. Rather than a debounce queue:

```ts
const WINDOW_MS = 2 * 60_000;
occurrenceKey: `${orderId}:${recipientUserId}:${Math.floor(Date.now() / WINDOW_MS)}`
```

The first message in a window claims the log row and sends. Every later message in that window
hits the existing unique constraint and is recorded as a duplicate skip. **The rate limiting is
the idempotency machinery you already have**, with no new tables, jobs or timers.

Because `resolve()` runs at *send* time, the body says `"3 new messages from Acme"` by counting
unread at that moment — which is better copy than a per-message preview anyway, and is what makes
the window boundary harmless.

Trade-off: a message at :59 and one at :01 of the next window both send. Acceptable; widen
`WINDOW_MS` if it proves noisy in practice.

### 5.3 Not notifying someone already reading the chat

Handled **client-side in the service worker**, not with server presence tracking. In the `push`
handler, before `showNotification`:

```js
const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
const looking = windows.some(c => c.visibilityState === "visible" && c.url.includes(data.url));
if (looking && data.suppressIfVisible) return;
```

Zero server plumbing, and it is correct across tabs and devices — the device where you are reading
stays quiet, your phone still buzzes.

---

## 6. Phase 4 — client

### 6.1 Service worker

`client/public/sw.js` — plain JS, Next does not bundle `public/`:

- `push` → `showNotification(title, { body, icon, tag, renotify: true, data: { url } })`.
  `tag` collapses repeats of the same thread into one notification instead of a stack.
- `notificationclick` → focus an existing client already on `data.url`, else `clients.openWindow`.
- The visible-client suppression from §5.3.

`client/public/manifest.webmanifest` + `metadata.manifest` in `app/layout.tsx`. **Required** for
iOS, and worth having regardless.

### 6.2 Subscription lifecycle

`client/features/push/use-push-subscription.ts`:

- Register the SW, read `Notification.permission`.
- Subscribe with `applicationServerKey` from `GET /api/push/vapid-public-key`, POST the result.
- Handle `pushsubscriptionchange`, and **re-verify on every app load** — Chrome silently drops
  subscriptions after long inactivity, and a user whose subscription expired looks identical to one
  who never subscribed.
- Logout → `unsubscribe()` + `DELETE /api/push/subscriptions`.

`client/lib/endpoints.ts` gains a `PUSH` block.

### 6.3 Permission UX — the part that is easy to get wrong

**Never call `Notification.requestPermission()` on page load.** A denial is permanent per browser
and cannot be recovered from your code; browsers also penalise unprompted requests. Soft-prompt
first, and only call the real API after the user says yes to your own UI:

- A toggle in `client/features/notification-preferences/components/notification-preferences-card.tsx`,
  beside the email and WhatsApp toggles that already live there.
- A one-time inline prompt in `client/components/navbar/notification-dropdown.tsx`, shown after a
  meaningful action rather than on first paint.
- If `permission === "denied"`, show how to re-enable it in site settings — you cannot re-ask.

### 6.4 Relationship to the existing bell

`providers/notification-provider.tsx` (localStorage) and `providers/realtime-provider.tsx` (sonner
toasts) stay exactly as they are. Push is additive: the socket path keeps driving in-app toasts and
the bell while a tab is open; push covers the closed-tab case. Deliberately not unified in this
phase — see "out of scope".

---

## 7. Phase 5 — rollout

1. Deploy schema + transport with no schedule row ticking PUSH. Nothing changes.
2. Reuse the shadow-mode pattern in `notifications/sending-enabled.ts` so push decisions are logged
   before anything is sent.
3. Turn PUSH on for a handful of high-value events first (chat, brief submitted, content
   delivered), from the admin UI — no deploy needed.
4. Backfill script `prisma/backfill-push-channel.ts` to tick PUSH across active offset-0 rows once
   the first batch looks healthy. Optional; admin can do it per event.
5. Watch: subscription count per role, 410-prune rate, push failure rate, and the
   `no_push_subscription` skip rate (that one is your permission-grant funnel).

---

## 8. Risks and limits

| Risk | Detail |
|---|---|
| **iOS reach** | Web push needs iOS 16.4+ **and the site installed to the Home Screen**. No workaround exists. On iPhone-heavy creator traffic expect low coverage — WhatsApp remains the mobile channel. Desktop Safari is fine. |
| **Permission is per browser** | Not per account. A user on three devices has three subscriptions and three independent grants. One denial does not block the others. |
| **Payload cap** | ~4KB encrypted. Short bodies, no embedded images. |
| **Silent expiry** | Chrome drops subscriptions after prolonged inactivity; without the re-verify on load (§6.2), users go quiet with no error anywhere. |
| **Key rotation** | Rotating `VAPID_PUBLIC_KEY` invalidates **every** existing subscription at once, and does it silently — users simply stop receiving notifications until they re-subscribe. There is no rotation story; generate once and keep the private key safe (§3.3). |
| **Env reach** | Not a drift risk here: `docker-compose.yml` gives `api` and `worker` the same `env_file: [/etc/gocollab/server.env]`, so one entry covers both processes. |

---

## 9. Effort

| Phase | Work | Estimate |
|---|---|---|
| 1 | Schema, migration, transport, subscription endpoints | 2 d |
| 2 | Engine wiring, renderer fallback, admin checkbox | 1.5 d |
| 3 | Chat events, occurrence-key windowing, emit site | 2 d |
| 4 | Service worker, manifest, subscription hook, permission UX | 2 d |
| 5 | Shadow run, staged enablement, backfill, metrics | 1 d |

**≈ 8.5 days of build, call it 2 weeks with review and testing.**
