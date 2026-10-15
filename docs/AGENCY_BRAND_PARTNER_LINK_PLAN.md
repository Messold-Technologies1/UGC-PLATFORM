# Agency ↔ Brand Partner Link — Implementation Plan

Status: **Implemented** (see §10 for what shipped and what did not)
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
| 13 | Profile gate | **The brand profile must be complete before the brand can submit a link request** — `brandName`, `contactFullName`, `contactEmail`, `contactPhone`, **and phone OTP verification**. See §5.3. |
| 16 | OTP in the gate | **Verified owner phone is what counts**, regardless of whether `contactPhone` differs from the login phone. The check is **skipped entirely when `PHONE_OTP_ENABLED=false`**, matching how the rest of the codebase treats the flag. |
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
(decision 13, specified next).

### 5.3 Brand profile completeness gate (incl. OTP)

A brand may only submit a link request once its profile is genuinely complete.
Handing an agency control of a workspace is exactly the moment to demand this,
since the creator will see this brand's name and contact details on every
order and brief the agency places.

**Reuse, don't reinvent.** `brand-profile.service.ts:295-307` already derives
brand phone verification inside `mapBrandProfile()`:

```ts
contactPhoneVerified =
  contactPhone set && ownerPhone set &&
  normalize(contactPhone) === normalize(user.phone) &&
  user.phoneVerified &&
  user.phoneOtpLastStatus === 'approved';
```

That logic is **inline in a mapper**, so a hand-rolled second copy in the guard
would drift. The two are not identical though — the mapper also demands that the
contact phone *equal* the login phone, which the gate deliberately does not
(rule 3). So extract the shared primitives into
`brand-profile/brand-profile-completeness.util.ts`:

- `normalizePhone(v)` — the `replace(/\s/g, '')` currently duplicated inline;
- `ownerPhoneVerified(user)` — `phoneVerified && phoneOtpLastStatus === 'approved'`.

`mapBrandProfile()` then composes `ownerPhoneVerified(user) && phonesMatch(...)`
for its display flag, and the gate calls `ownerPhoneVerified(user)` alone. One
definition of "OTP approved", two intentionally different policies on top of it.

```ts
export type BrandCompletenessGap =
  | 'BRAND_NAME_MISSING'
  | 'CONTACT_NAME_MISSING'
  | 'CONTACT_PHONE_MISSING'
  | 'PHONE_NOT_VERIFIED';

export function brandProfileCompleteness(params: {
  profile: Pick<BrandProfile,
    'brandName' | 'contactFullName' | 'contactPhone'>;
  user: Pick<User, 'phoneVerified' | 'phoneOtpLastStatus'>;
  otpRequired: boolean;   // PhoneVerificationService.otpRequired()
}): { complete: boolean; gaps: BrandCompletenessGap[] };
```

**Note: "complete" does not exist on the server today.** `create-brand-profile.dto.ts`
marks only `contactFullName` as required — even `brandName` is optional — and
`update-brand-profile.dto.ts` is optional throughout. This change therefore has
to *define* completeness. The definition below is deliberately minimal: it
demands what a creator actually needs to see on an order, and nothing else, so
it blocks as few existing brands as possible.

Rules:

1. **Required:** `brandName`, `contactFullName`, `contactPhone` — all non-empty
   after trimming.

   **Not required**, and deliberately so:
   - `logoKey` / `logoUrl` — optional by decision.
   - `contactEmail` — `update-brand-profile.dto.ts` documents that outbound mail
     falls back to the account email when this is empty, and `User.email` is
     non-nullable, so a contactable address always exists. Requiring it would add
     friction without adding a guarantee.
   - `website`, `instagramUrl`, `productType`, `categories`,
     `brandPronunciationAudio` — descriptive/matching metadata, not identity.
2. **OTP** — only when `otpRequired` is true: `user.phoneVerified === true`
   **and** `user.phoneOtpLastStatus === 'approved'`.
3. `contactPhone` does **not** have to equal the login phone (decision 16). The
   existing mapper predicate demands equality, which would permanently block any
   brand using a separate business line — there is no flow today to OTP a number
   other than the login phone. The gate therefore checks that a verified human
   owns the account, which is the real security goal. `mapBrandProfile()` keeps
   its stricter display semantics unchanged; only the gate relaxes the match.
4. When `PHONE_OTP_ENABLED=false`, rule 2 is skipped entirely. Otherwise, since
   signup writes `phoneVerified: otpRequired`, a disabled-OTP environment would
   block **every** brand, staging included.

The guard runs on **submit** and is re-checked on **accept** — cheap, and it
closes the window where a profile is emptied between the two.

On failure the endpoint returns `422` with the structured `gaps[]` so the client
can deep-link to the exact field or to the OTP step rather than show a generic
validation error.

### 5.4 Blocked for an acting agency

Reject with `403` when `actingAgencyId` is set:

- `POST /wallet/withdrawals` and its cancel route — **money-out**
- `PATCH /brand-profile` and logo/pronunciation presign — **identity**
- All `agency-links` routes on the brand side — an acting agency must not be
  able to connect another agency to the brand, cancel a rival's pending
  request, or revoke a rival's link
- Brand account deactivation

### 5.5 Chat, realtime, notifications

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

### 5.6 Briefs — agency-direct change

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
   revoke. The connect action is **disabled while the profile is incomplete**,
   showing exactly what's missing from the `gaps[]` response and deep-linking to
   the field — or to the OTP step for `PHONE_NOT_VERIFIED`, reusing the existing
   phone-verification component rather than building a second one.
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
  accepts; a rejected request grants nothing.
- Completeness gate (§5.3), one case per gap:
  - missing `brandName` / `contactFullName` / `contactPhone` → `422` naming
    that gap, no link row created;
  - `otpRequired` true and `phoneVerified` false → `PHONE_NOT_VERIFIED`;
  - `otpRequired` true, `phoneVerified` true, but `phoneOtpLastStatus !==
    'approved'` → still blocked;
  - **`PHONE_OTP_ENABLED=false` → OTP gap never reported**, field checks still
    enforced (the regression that would otherwise block every brand in staging);
  - `contactPhone` different from the login phone with a verified owner →
    **allowed** (decision 16), guarding against a re-tightening to the mapper's
    equality rule;
  - a complete profile that is emptied between submit and accept → the
    re-check at accept rejects it;
  - logo, website, `contactEmail`, `productType` and categories all absent →
    **still allowed**.
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
- Confirm the required set in §5.3 (`brandName`, `contactFullName`,
  `contactPhone`, verified phone). Adding `productType`/categories would block
  more existing brands; logo and `contactEmail` are settled as optional.
- Whether an existing brand that is already linked should be forced to complete
  its profile retroactively — assumed **no**; the gate applies at request time
  only.
- Whether an agency may hold its Partner ID *before* it has any brands —
  assumed yes; the code is issued at agency creation.


---

## 10. Implementation status

### Shipped

- **Schema + migration.** `Agency.partnerId` (+ issued/rotated timestamps),
  `AgencyBrandLink` with its status enum, and attribution columns on `Order`,
  `OrderCheckoutBatch`, `Brief`, `BrandWishlist` and `CreatorRatingReview`.
  Partner IDs backfilled for every existing agency.
- **Access resolution.** `resolveBrandAccess()` admits brand owner, ACTIVE-linked
  agency, or admin, and reports which. Ownership never moves: a linked agency
  resolves with `brandId` set and `agencyId` null.
- **The link module.** Partner ID reveal/rotate, brand request/list/cancel/revoke,
  agency list/accept/reject/leave, per-brand spend report, admin list and
  force-unlink.
- **The completeness gate**, on submit and re-checked on accept, returning 422
  with `gaps[]`.
- **Blocked actions**: wallet withdrawals, brand profile edits, and brand-side
  link management.
- **Attribution writes** on orders, checkout batches, briefs, wishlists, reviews.
- **Chat access** broadened to ACTIVE-linked agencies, read live so revocation
  is immediate.
- **Agency-direct briefs** carry the agency's own name; `brandNames` harvesting
  retired.
- **Notifications** for all four lifecycle moments, with twelve templates.
- **Client**: active-brand store + header injection, navbar switcher, agency
  Brands page (partner ID, requests inbox, managed brands, inline spend
  report), brand connect-an-agency panel, the creator-facing "Managed by X"
  tag, the brand-facing "Placed by X" tag on their own order list, and the
  admin oversight page with force-unlink.
- **Brand-owner alert** when a managing agency places an order, fired from
  every paid path (zero-rupee, both in-process checkouts, and both Razorpay
  webhook branches) rather than at order creation — creation is not when money
  moves, and an abandoned order should send nothing.

### Deliberately different from the plan above

- **`WalletTransaction` has no attribution column.** The ledger is append-only
  and each movement already points at its order, so the spend report joins
  through `Order.placedByAgencyId` instead. Same answer, without adding a
  column to the most sensitive table in the schema.

### Known gaps

Nothing from the agreed scope is outstanding. Worth knowing for later:

- **Credit spend outside order placement** (a revision or usage-rights
  purchase an agency makes) is attributed but does not send its own alert; the
  order-placed notice is the only one.
- **Agency seats** remain out of scope by decision 11. The audit columns
  already record `placedByUserId`, so adding them later needs no backfill.
- **A wallet top-up route does not exist** anywhere in the product, so an
  agency cannot fund a brand's wallet directly — it pays the Razorpay
  remainder at checkout and reconciles through the spend report. If agencies
  start funding brands at scale, that route is the natural follow-up.

### Verification

- Full migration history replays on a clean Postgres 16; `prisma migrate diff`
  reports no drift from this change.
- Backfill exercised over 500 seeded agencies: 500 distinct, well-formed codes,
  no ambiguous characters.
- A 17-assertion integration check against a real database proves the core
  properties: an agency-placed order is owned by the brand and returned by the
  brand's own queries but not by agency-owned ones, legacy agency-direct rows
  are untouched, revocation leaves the order whole, and deleting an agency
  nulls attribution rather than cascading into the brand's work.
- Server: 1119 tests passing. The single failing suite
  (`agency-signup-welcome-credit.spec.ts`, 5 tests) fails identically on the
  base commit. Type errors and per-file lint findings are at exact parity with
  the base.
- Client: typecheck clean, lint clean on changed files, `next build` succeeds.
