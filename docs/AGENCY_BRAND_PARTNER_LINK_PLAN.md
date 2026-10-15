# Agency ↔ Brand Partner Link — Implementation Plan

Status: **Plan — awaiting approval**
Branch: `claude/friendly-dijkstra-187emz`
Flag: `AGENCY_BRAND_PARTNER_LINKS_ENABLED`

---

## 1. Goal

Today `Agency` and `BrandProfile` are **parallel, disjoint buyers**. Every owned
record (`Order`, `Brief`, `BrandWishlist`, `BrandWallet`, `OrderCheckoutBatch`,
`CouponRedemption`, `CreatorRatingReview`, `WalletWithdrawal`) carries
`brandId` **XOR** `agencyId`, and `Agency.brandNames` is free text with the
schema comment *"no BrandProfile linkage"*.

We are introducing a real relationship:

1. A brand registers on the platform and completes a **brand profile**.
2. Each **agency** is issued a shareable **Partner ID** (e.g. `GC-7F3K-92QX`).
3. The agency shares it with the brand. The **brand enters it** in their
   account, creating a **pending link request**, and an **email goes to the
   agency**.
4. The **agency accepts** the request.
5. The agency gets a **brand switcher** and, once switched, operates inside the
   brand's workspace — wishlists, briefs, orders, chat — as if it were the brand.
6. The brand can keep using its own account independently and sees everything
   the agency did, tagged `placed by Agency X`.

---

## 2. Decisions (agreed)

| # | Decision | Choice |
|---|---|---|
| 1 | Order ownership & funding | **Brand owns the order; brand's wallet credits pay.** Agency recorded as actor. |
| 2 | Link establishment | **Agency owns the Partner ID. Brand submits it → agency must accept.** The agency is emailed on request. Both sides consent: the brand by redeeming the code, the agency by accepting. Partner ID is an identifier, not a secret. |
| 3 | Agency permissions | **Full brand powers except money-out and identity.** Blocked: wallet withdrawals, editing brand profile, managing links, deleting the brand. |
| 4 | Legacy agency-direct mode | **Kept, untouched.** Agency switcher gains a "My Agency" option. In that mode `Brief.brandName` is **auto-filled with the agency name, locked**, and `appendAgencyBrandName()` harvesting is **retired**. |
| 5 | Multi-agency | **A brand may link multiple agencies** simultaneously; each link independently revocable. |
| 6 | Revocation | **Brand keeps everything; agency loses all access immediately**, including in-flight orders and chat. |
| 7 | Creator-facing identity | **Brand identity, with a subtle "Managed by Agency X" tag** on order detail and emails. |
| 8 | Refunds & completion credits | **Always to the brand's wallet**, plus an agency-side read-only *"spent on behalf of this brand"* report for off-platform reconciliation. |
| 9 | Switcher UX | **Switcher in the agency shell**, reusing the existing brand route tree via the `x-brand-profile-id` header. |
| 10 | Audit & alerts | **Full audit trail**; brand owner notified on **money-spending actions only** (order placed, credits spent). |
| 11 | Agency seats | **Out of scope.** Single agency owner login retained; audit stores `actorUserId` so seats can be added later without migrating data. |
| 12 | Partner ID | **Short readable code on the Agency, rotatable.** Issued unconditionally at agency creation (`Agency.name`/`contactFullName`/`contactEmail` are non-nullable, so an agency is always complete). Backfilled for all existing agencies. Rotation does not break accepted links. |
| 13 | Profile gate | **The brand profile must be complete** (`brandName` + contact present) **before the brand can submit a link request.** |
| 14 | Admin | **View links + force-unlink** for support cases. |
| 15 | Delivery | **One PR, backend + frontend, behind a feature flag.** |

---

## 3. What already exists (reuse, don't rebuild)

- `server/src/brand-access/` — `brand-access.service.ts` with
  `resolveOrderActor()`, `resolveBrandContext()`, `orderOwnerCreateData()`,
  `orderOwnerWhere()`, `assertOwnsOrder()`.
- `ACTIVE_BRAND_PROFILE_ID_HEADER = 'x-brand-profile-id'` and
  `brandActorParams()` — **the switching rail is already built but unused**; the
  client never sends the header, and `assertActorCanAccessBrand()` currently
  passes only the brand's own user or an admin.
- Mirrored client route trees `/agency/(dashboard)/*` and `/brand/(dashboard)/*`.
- A single axios instance (`client/lib/api.ts`) — one interceptor is enough to
  inject the header in the browser; `client/lib/server-auth-fetch.ts` covers SSR.

**Consumers of brand-access that must be audited** (the blast radius):

```
brand-profile.service.ts   briefs.controller.ts      briefs.service.ts
chats.controller.ts        chats.service.ts          coupons.controller.ts
creator-profile.service.ts creator-reviews.service.ts
orders.controller.ts       orders.service.ts         wallet.controller.ts
wishlists.controller.ts    wishlists.service.ts
```

---

## 4. Schema changes

### 4.1 Partner ID on `Agency`

The code belongs to the **agency**, which hands it to brands.

```prisma
model Agency {
  // ...
  /// Shareable partner code (e.g. GC-7F3K-92QX) the agency gives to brands.
  /// Issued at agency creation. Rotatable; rotation does NOT break already-
  /// accepted links, which are keyed on agencyId, not on the code.
  partnerId          String?   @unique
  partnerIdIssuedAt  DateTime?
  partnerIdRotatedAt DateTime?

  brandLinks         AgencyBrandLink[]
}

model BrandProfile {
  // ...
  agencyLinks AgencyBrandLink[]
}
```

- Format: `GC-XXXX-XXXX`, Crockford base32 (no `I`/`L`/`O`/`U`), stored
  uppercase, **matched case-insensitively** on redemption.
- Backfill migration issues a code to **every existing `Agency`** — no
  completeness check needed, since the identifying columns are non-nullable.
- A leaked agency code only lets strangers *request* a link; the agency still
  has to accept, so the blast radius is spam, not access. Submission is rate
  limited regardless.

### 4.2 New `AgencyBrandLink`

```prisma
enum AgencyBrandLinkStatus {
  PENDING
  ACTIVE
  REJECTED
  REVOKED
}

model AgencyBrandLink {
  id                String                @id @default(uuid()) @db.Uuid
  agencyId          String                @db.Uuid
  brandId           String                @db.Uuid
  status            AgencyBrandLinkStatus @default(PENDING)

  /// Audit: the agency code actually redeemed, so a rotation leaves a trail.
  partnerIdUsed     String
  /// The BRAND user who redeemed the agency's code.
  requestedByUserId String                @db.Uuid
  requestedAt       DateTime              @default(now())
  /// The AGENCY owner who accepted or rejected.
  respondedByUserId String?               @db.Uuid
  respondedAt       DateTime?
  revokedByUserId   String?               @db.Uuid
  revokedAt         DateTime?
  revokedReason     String?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  agency Agency       @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  brand  BrandProfile @relation(fields: [brandId],  references: [id], onDelete: Cascade)

  @@unique([agencyId, brandId])
  @@index([brandId, status])
  @@index([agencyId, status])
}
```

One row per (agency, brand) pair; re-requesting after a revoke transitions the
same row back to `PENDING`, keeping the history on the row.

Direction of travel: **brand creates the row** (`PENDING`), **agency moves it**
to `ACTIVE` or `REJECTED`. Either side can later move an `ACTIVE` row to
`REVOKED`.

### 4.3 Actor attribution (the key invariant)

**The `brandId` XOR `agencyId` invariant is preserved.** An agency-placed order
for a linked brand sets `brandId = <brand>`, `agencyId = NULL` — the brand owns
it — and records the actor separately:

```prisma
/// Set when an agency placed this on behalf of a linked brand. Purely
/// attribution: ownership stays with brandId. Null for brand-placed records
/// and for legacy agency-direct records (which set agencyId instead).
placedByAgencyId String? @db.Uuid
placedByUserId   String? @db.Uuid
```

Added to: `Order`, `OrderCheckoutBatch`, `Brief`, `BrandWishlist`,
`WalletTransaction`, `CreatorRatingReview`.

This matters: every existing `orderOwnerWhere()` / `assertOwnsOrder()` query
keeps working unchanged, because ownership semantics do not move.

### 4.4 Migration

1. Add enum, table, and columns (all nullable — no backfill risk).
2. Backfill `partnerId` for **every** `Agency` row (no completeness check).
3. **No change** to existing agency-direct rows.

---

## 5. Backend work

### 5.1 `brand-access` — the core change

`assertActorCanAccessBrand()` gains a third path: an **ACTIVE**
`AgencyBrandLink` between the actor's agency and the target brand.

`ResolvedOrderActor` / `ResolvedBrandContext` gain `actingAgencyId: string | null`.
When an agency resolves into a brand context:

```
brand            = <the linked brand>
brandId          = brand.id
agencyId         = null          // brand owns
actingAgencyId   = agency.id     // attribution
isAgencyWorkspace = false        // it IS the brand's workspace
```

`orderOwnerCreateData()` additionally returns `placedByAgencyId` /
`placedByUserId`.

New guard helper `assertNotActingAsAgency(ctx)` for the blocked set.

Link lookups are hot (every request with the header), so resolution is cached
per request.

### 5.2 New module `agency-brand-link`

| Method | Route | Who | Purpose |
|---|---|---|---|
| `GET` | `/agency/partner-id` | Agency | Reveal own Partner ID |
| `POST` | `/agency/partner-id/rotate` | Agency | Rotate |
| `POST` | `/brand-profile/agency-links` | **Brand** | **Submit an agency's Partner ID** (creates `PENDING`, emails the agency) |
| `GET` | `/brand-profile/agency-links` | Brand | Own pending + active links |
| `POST` | `/brand-profile/agency-links/:id/cancel` | Brand | Withdraw a pending request |
| `POST` | `/brand-profile/agency-links/:id/revoke` | Brand | Revoke an active link |
| `GET` | `/agency/brand-links` | Agency | Incoming requests + switcher list |
| `POST` | `/agency/brand-links/:id/accept` | **Agency** | **Accept** |
| `POST` | `/agency/brand-links/:id/reject` | Agency | Reject |
| `DELETE` | `/agency/brand-links/:id` | Agency | Leave a brand |
| `GET` | `/agency/brand-links/:id/spend-report` | Agency | "Spent on behalf" report (decision 8) |
| `GET` | `/admin/agency-brand-links` | Admin | Oversight |
| `POST` | `/admin/agency-brand-links/:id/force-unlink` | Admin | Support escape hatch |

Submission (`POST /brand-profile/agency-links`) is rate limited per brand to
blunt code guessing, and rejects when the brand profile is incomplete
(decision 13).

### 5.3 Blocked for an acting agency

Reject with `403` when `actingAgencyId` is set:

- `POST /wallet/withdrawals` and its cancel route — **money-out**
- `PATCH /brand-profile` and logo/pronunciation presign — **identity**
- All `agency-links` routes on the brand side — an acting agency must not be
  able to connect another agency to the brand, cancel a rival's pending
  request, or revoke a rival's link
- Brand account deactivation

### 5.4 Chat, realtime, notifications

- **Chat access** is currently keyed on `brandActorUserId` (a single user).
  `chats.service.ts`, `order-chat.service.ts`, and
  `order-chat-realtime.notifier.ts` must broaden to *"every user who can
  currently access this order"* — the brand owner **plus** the owners of
  agencies with an ACTIVE link. Revocation drops the agency from the room
  immediately (decision 6).
- **Creator-facing** order detail and emails gain a `Managed by {agencyName}`
  tag resolved from `placedByAgencyId` (decision 7).
- **New notification events**, following the inverted flow:
  - *link requested* → **email to the agency** (the explicit requirement) with
    the brand's name and an accept/reject link;
  - *link accepted* / *link rejected* → email to the brand;
  - *link revoked* / *agency left* → email to the other side.
  Plus brand-owner alerts for *order placed by agency* and *credits spent by
  agency* only (decision 10).

### 5.5 Briefs — agency-direct change

In `My Agency` mode, `Brief.brandName` is forced to the agency name and locked;
`appendAgencyBrandName()` is retired from the brief path (the util and
`Agency.brandNames` stay for historical data).

---

## 6. Client work

1. **Brand context store** — active `brandProfileId` in a provider, persisted to
   `localStorage`, cleared on logout and on 403 from a revoked link.
2. **Header injection** — axios request interceptor in `client/lib/api.ts`;
   matching change in `client/lib/server-auth-fetch.ts` for SSR.
3. **Switcher** in the agency sidebar: `My Agency` + linked brands. Switching
   invalidates the React Query cache so no brand's data leaks into another's
   view. (No Partner ID entry here — brands initiate.)
4. **Brand dashboard** (`settings/profile`): *"Connect an agency"* input where
   the brand pastes the agency's Partner ID, a preview of the matched agency
   before submitting, pending requests with cancel, and active agencies with
   revoke.
5. **Agency dashboard**: Partner ID card with copy + rotate, an **incoming
   requests** inbox with accept/reject, the linked-brands page, and the
   per-brand spend report.
6. **Tags**: `placed by Agency X` in the brand's order and brief lists;
   `Managed by Agency X` on the creator's order detail.
7. **Blocked UI**: hide/disable withdrawals and brand profile editing while a
   brand context is active, matching the server rules.
8. **Admin**: links table + force-unlink.

---

## 7. Test plan

- Access resolution: linked/pending/rejected/revoked/no-link × brand/agency/admin.
- Ownership invariant: agency-placed order has `brandId` set, `agencyId` null,
  `placedByAgencyId` set — and is visible to the brand.
- Funding: brand wallet debited; refunds and completion credits land in the
  **brand's** wallet even when the agency paid the Razorpay remainder.
- Revocation mid-flight: agency loses order, chat, and realtime access; the
  order continues normally for the brand.
- Blocked set returns 403 for an acting agency.
- Partner ID: uniqueness across agencies, case-insensitive match, rotation
  keeps accepted links intact, an old code stops resolving after rotation.
- Link flow direction: a brand submitting a valid code creates `PENDING` and
  emails the agency; the brand gets **no access to anything** until the agency
  accepts; a rejected request grants nothing; a brand with an incomplete
  profile cannot submit.
- Multi-agency: two agencies on one brand, revoking one leaves the other intact.
- Legacy: existing agency-direct orders/wishlists/wallets unaffected; brief
  brandName auto-fills to the agency name.
- Flag off ⇒ every new route 404s and the switcher is hidden.

---

## 8. Rollout

1. Merge with `AGENCY_BRAND_PARTNER_LINKS_ENABLED=false`.
2. Run the migration (additive; safe with the flag off).
3. Enable in staging, exercise the full flow end to end.
4. Enable in production; backfilled Partner IDs become visible to agencies,
   who can start handing them to their brands.

Kill switch: set the flag false. Data written while enabled stays valid because
agency-placed orders are ordinary brand-owned orders.

---

## 9. Open items

- PR target branch — no `development` branch exists on the remote today
  (`main` + the working branch only).
- A brand with an incomplete profile that tries to connect an agency should be
  sent to the profile form with a clear reason, rather than shown a bare
  validation error.
- Whether an agency may hold its Partner ID *before* it has any brands —
  assumed yes; the code is issued at agency creation.
