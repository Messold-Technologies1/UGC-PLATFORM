# Meta (Facebook) Event Tracking

This project reports conversions to Meta through two channels:

- **Browser Pixel** — `fbq` loaded in `client/app/layout.tsx`, helpers in `client/lib/meta-pixel.ts`, signup call sites in `client/features/auth/lib/track-signup-events.ts`, buyer-funnel call sites in `client/features/analytics/`.
- **Conversions API (CAPI)** — server-to-server from `server/src/meta-capi/`, with call sites in `server/src/brand-profile/`, `server/src/creator-profile/` and `server/src/wishlists/`.

Everything is **env-gated**: clear the env vars and all tracking becomes a silent no-op — no code change needed.

## Two datasets

Creator-side and brand-side ads are bought against separate Meta datasets, so the site loads **two pixels** and the server holds credentials for both:

| Dataset | Client env var | Server env vars | Gets |
|---|---|---|---|
| Creator (main) | `NEXT_PUBLIC_META_PIXEL_ID` | `META_CAPI_DATASET_ID` + `META_CAPI_ACCESS_TOKEN` | `PageView`, `CreatorProfileListed` |
| Brand (`Brands_Gocollab`) | `NEXT_PUBLIC_META_BRAND_PIXEL_ID` | `META_CAPI_BRAND_DATASET_ID` (+ optional `META_CAPI_BRAND_ACCESS_TOKEN`) | `PageView`, `BrandRegistration`, `ExploreCreators`, `HotBrand`, `AddToWishlist`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` |

Both pixels are initialized by the base loader and both receive `PageView`. Every other browser event is sent with Meta's per-pixel `trackSingleCustom`, so it lands in exactly one dataset — a plain `fbq('track', …)` would report to both.

Each side is independently gated. Clearing `NEXT_PUBLIC_META_BRAND_PIXEL_ID` sends brand browser events to the main pixel instead (the behaviour before the split) and stops the second pixel loading; clearing `META_CAPI_BRAND_DATASET_ID` drops the server copy. The brand dataset reuses `META_CAPI_ACCESS_TOKEN` unless `META_CAPI_BRAND_ACCESS_TOKEN` is set — a System User token assigned to both datasets can post to either.

## Events sent

| Event name | Fires when | Dataset | Channel | Deduplicated? |
|---|---|---|---|---|
| `PageView` | every page load | both | Browser pixel | — |
| `BrandRegistration` | the brand profile is created — at the role-choice step for email+password signup (an OTP-verified phone is already on file, so brand setup is skipped) or on `/onboarding/brand` for the Google route | Brand | Browser pixel **+** server CAPI | ✅ shared `event_id` |
| `ExploreCreators` | a brand/agency opens the creator catalogue — "Creators" in the navbar (`/brand/creators`, `/agency/creators`) | Brand | Browser pixel | — |
| `HotBrand` | a brand/agency spends 30 seconds actually looking at the creator catalogue | Brand | Browser pixel | — |
| `AddToWishlist` | a brand/agency saves a creator to a wishlist — into an existing one, or into one created around that creator | Brand | Browser pixel **+** server CAPI | ✅ shared `event_id` |
| `ViewContent` | a brand/agency opens a creator from the catalogue — the card's "View" button, the card itself, or the keyboard | Brand | Browser pixel | — |
| `AddToCart` | a brand/agency clicks "Place order" on a creator and the order modal opens | Brand | Browser pixel | — |
| `InitiateCheckout` | a brand/agency clicks "Create checkout" in the order modal, handing off to payment | Brand | Browser pixel | — |
| `Purchase` | an order is paid for — it reaches `BRIEF_SUBMISSION_PENDING` with a `paidAt` | Brand | Server CAPI | n/a (no browser copy) |
| `CreatorProfileListed` | the creator's `isListed` flips false→true (admin approval of a complete profile, or the creator completing their profile after an earlier approval) | Creator | Server CAPI | — |

**Creators are not tracked at signup.** Their conversion is `CreatorProfileListed` — a creator only becomes worth anything to the marketplace once they are listed, so that is the event campaigns optimize on.

**Deduplication:** two events fire from both sides with a matching `event_id`, so Meta counts each once — the browser gives a real-time signal, the server copy survives ad-blockers.

`AddToWishlist` uses `wishlist-add-<wishlistId>-<creatorId>`, built identically in `addToWishlistEventId` on both sides (`client/features/analytics/lib/buyer-pixel-events.ts` and `server/src/meta-capi/meta-capi.service.ts`; keep the two in step). It is stable rather than random, so re-adding a creator the buyer had removed is deduplicated against the earlier save inside Meta's window — toggling the heart can't inflate the count.

`BrandRegistration` fires from both the browser and the server with the same `event_id` — `brand-registration-<brandProfileId>`, built identically on both sides (`brandRegistrationEventId` in `client/features/auth/lib/track-signup-events.ts` and `server/src/meta-capi/meta-capi.service.ts`; keep the two in step). Meta counts them once. The browser gives a real-time signal; the server copy survives ad-blockers.

### Where each signup route fires

Both signup routes converge on the role-choice screen (`/onboarding/role`), and brand profile creation is the single trigger either way:

| Route | Creator | Brand |
|---|---|---|
| Email + password (`/register`) | nothing at signup | role choice → `BrandRegistration` (the server creates the brand profile there, since the phone was OTP-verified at signup) |
| Google | nothing at signup | role choice (no profile yet) → `/onboarding/brand` → `BrandRegistration` after the phone is verified |

The server copy is fired from `createOwnedBrandProfileForUser`, the one function both routes pass through, so it cannot miss a route or double-count.

### Buyer funnel (brand + agency)

Buyer-side steps are browser-only and live in `client/features/analytics/`:

| | |
|---|---|
| Events | `buyer-pixel-events.ts` — both senders, both pinned to the **brand** dataset |
| Who fired it | `use-buyer-identity-resolver.ts` — resolves the acting brand/agency name |
| `ExploreCreators` | `use-explore-creators-pixel.ts`, called from `BrandCreatorsBrowser` |
| `HotBrand` | the same hook's dwell timer, at `HOT_BRAND_SECONDS` |
| `AddToWishlist` (browser) | `SaveToWishlistButton`, after either save path succeeds |
| `AddToWishlist` (server) | `WishlistsService.fireAddToWishlistMetaEvent`, on the save request itself |
| `ViewContent` | `CreatorListing.openDrawer` — every way a card is opened |
| `AddToCart` | `ProfileDrawer`, on the "Place order" button |
| `InitiateCheckout` | `OrderModal.handleCheckout`, on "Create checkout" |
| `Purchase` | `OrdersService.firePurchaseMetaEvent`, on the paid transition |

Every buyer event carries `account_type` (`brand` / `agency`) and, when the
profile has one, `brand_name` — the brand's name, or the agency's — so Events
Manager can be broken down by account. `AddToWishlist` also carries
`content_ids` (the creator id), `content_type` and `wishlist_name`;
`ViewContent` carries `content_ids`, `content_type` and the creator's starting
price as `value` + `currency` (INR) — what a collab with them would open at,
as reporting metadata, not a transaction. **No PII:** creators travel as opaque
ids, never names.

**Only signed-in brands and agencies fire these.** `ProfileDrawer` also renders
on the public shared-shortlist page (`/wishlists/share/[shareToken]`), where the
viewer may be anonymous; `useBuyerIdentityResolver` returns null for anyone who
is not a signed-in `BRAND` / `AGENCY`, and the call site then sends nothing.
The viewer is awaited there rather than sampled from a rendered query, so a
click never races a half-loaded session.

`BrandCreatorsBrowser` is the single mount point for both `/brand/creators` and
`/agency/creators`, so `ExploreCreators` fires once per visit — filtering,
searching and paging don't remount it, and navigating away and back counts as a
new visit.

### HotBrand — the engaged-browsing signal

Browsing is the one funnel step with no click to measure, so dwell time stands
in for intent: a glance bounces, a real search doesn't. After
`HOT_BRAND_SECONDS` (30) on the catalogue, the buyer is reported as hot.

**Only visible seconds count.** The timer ticks once a second and skips every
tick where `document.visibilityState` isn't `visible`, so a tab left open behind
another window doesn't mark a visitor hot overnight — which would make the
signal mean nothing. Browsers throttle timers in background tabs anyway, so
this is both the honest reading and the one they can deliver.

**It is an event, not a number.** Meta optimizes on whether an event happened
and cannot read a `seconds` field, so a threshold crossed is a usable signal
where a duration would be reporting only. It is also fired from the live page
rather than on exit: a browser tearing down a tab drops in-flight beacons, and
it drops the long sessions first — exactly the population this is meant to find.

**Once per visit.** Leaving before 30 seconds sends nothing; coming back and
browsing again marks them hot again, which is a fair reading of a buyer who
keeps returning. If you would rather count each account once a day, that needs a
per-viewer guard (e.g. `sessionStorage`) in `startDwellTimer`.

Custom event: building a **Custom Audience** from it needs nothing (Events
Manager → Audiences → Website → `HotBrand`); optimizing a campaign on it needs a
Custom Conversion, as below. `account_type` tells brands and agencies apart —
the name follows the funnel, not the account kind.

The acting account is read with `fetchQuery` at the moment an event fires rather
than with a subscribing `useQuery`: `SaveToWishlistButton` renders once per
creator card, so a subscription would mean one React Query observer per card for
a value only needed on click. A profile that can't be read yields a name-less
identity — the event still fires, just without the breakdown.

`ExploreCreators` and `HotBrand` are **custom** events, so optimizing a campaign on one needs a
Custom Conversion (see below). `AddToWishlist` is one of Meta's **standard**
events and is available to ad delivery optimization directly.

**The checkout steps.** The platform's own funnel words map onto Meta's standard
events, which is what the code and Events Manager use:

| Funnel step | Event | Fires on |
|---|---|---|
| Explore Creators | `ExploreCreators` (custom) | opening the catalogue |
| Wishlist Added | `AddToWishlist` | saving a creator |
| View Content / View Profile | `ViewContent` | "View profile" |
| Begin Checkout | `AddToCart` | "Place order" — the modal opens |
| Checkout Initiate | `InitiateCheckout` | "Create checkout" — payment starts |
| Purchase | `Purchase` | the order is paid — brief-pending |

`AddToCart` carries the creator's **starting price** as `value`: at that point
the package and add-ons aren't chosen, so it is what the order opens at, not
what it will cost. `InitiateCheckout` carries `netTotal` — what the buyer
actually owes after coupon and credits — plus `package_label`, `add_on_count`
and `coupon_code`. That value can legitimately be 0 (a free first order, or one
fully covered by credits); the step still happened, so it is still reported.

Both fire only on the clicks that really advance the funnel: `AddToCart` not
when the click bounces off an unavailable creator, a failed profile load or the
landing page's redirect to sign up, and `InitiateCheckout` not when
`handleCheckout` returns early with no package or a checkout already running.
Neither is awaited — a pixel must never delay the payment handoff.

`ViewContent` fires from `openDrawer`, not from a single button: the card's
"View" button, a click on the card body and Enter/Space all open the same
drawer through it, so hooking one button would miss most opens. The
`?creatorId=` deep link sets the drawer state directly and deliberately doesn't
count — nobody chose that creator from the catalogue. The "View profile" link
*inside* the drawer doesn't fire it either; that is a second look at a creator
already viewed.

`ViewContent`, `AddToCart` and `InitiateCheckout` are browser-only: each is
client state or an overlay rather than a request of ours, so there is no server
moment for a copy to hook into, and nothing navigates away, so the beacon
leaves safely without a flush delay.

### Purchase (server-only)

The money event. It fires from `OrdersService.firePurchaseMetaEvent` when an
order becomes paid — the moment it reaches `BRIEF_SUBMISSION_PENDING` with a
`paidAt` — and has **no browser copy**: an order is marked paid by a Razorpay
webhook, or placed outright when a coupon or store credit covers it, so there
is no moment in the browser to fire from.

Every path that makes an order paid fires it, each one right beside the
`emitOrderPayment({ kind: 'captured' })` it already fanned out:

| Paid path | Where |
|---|---|
| Zero-rupee order (100% coupon, first-order-free) | `placeZeroRupeeOrder` |
| Order fully covered by store credit | credit checkout, no Razorpay charge |
| Bulk zero-rupee batch | per child order |
| Razorpay capture, single order | `markPaidFromWebhook` |
| Razorpay capture, bulk batch | `markBatchPaidFromWebhook`, per child order |

**Counted once, always.** The event id is `purchase-<orderId>`
(`purchaseEventId`), derived from the order rather than the call, so Razorpay
redelivering a webhook, a retry, or two paid paths meeting on the same order
are all deduplicated by Meta. The helper also re-reads the order and re-checks
the status itself rather than trusting its caller, so it can't report a
purchase for an order that isn't paid.

**Value.** `value` is `expectedAmountPaise` — what the brand pays for the order
in total. Store credit is a payment method, not a discount, so it stays inside
that figure; `gross_value`, `credits_applied`, `discount`, `coupon_code`,
`package_label` and `free_order` ride along for reconciliation. A free or
fully-credited order reports a value of 0.

**Match quality.** The buyer's email, phone and name go out as Advanced
Matching (hashed by `MetaCapiService`), alongside the `_fbp` / `_fbc` cookies
captured at checkout — without which this event would carry no ad-click signal
at all, since it fires from a webhook with no browser request of its own.

`Order.metaFbp` / `Order.metaFbc` (migration
`20261013120000_order_meta_attribution`) hold them. The client attaches them to
both checkout calls (`createCheckout`, `createBulkCheckout`), and they are
written on every order a checkout creates — the free one, the credit-covered
one, the plain pending one, and each child of a bulk batch — and refreshed when
a draft order is reused for a later attempt, so the newest click an order is
attributed to wins. An ad-blocked browser simply has no cookies to send: both
columns stay null and the purchase still converts on the hashed contact alone.

The request's IP and user-agent would lift match quality further still, the way
`CreatorProfileListed` replays them. They are not stored on orders — that is
more personal data held per order than the cookies are, so it is a deliberate
choice rather than an oversight.

**Not yet covered:** the wishlist bulk checkout
(`BulkCheckoutModal` → `useWishlistBulkCheckout`) is a second way into payment,
from a wishlist rather than a creator. It sends nothing today — worth adding an
`InitiateCheckout` there if that path matters to a campaign.

**The server copy of `AddToWishlist`** is sent from `WishlistsService` on the
save request itself, deduplicated against the browser's by the shared event id
above. It fires from both save paths — `addCreator`, and `createWishlist` once
per creator the new wishlist is seeded with (an empty wishlist sends nothing).
It is fire-and-forget and wrapped: a Meta outage can't fail a save.

Attribution: `_fbp` / `_fbc` are readable only in the browser, so the client
posts them with the save (`metaFbp` / `metaFbc` on `AddWishlistCreatorDto` and
`CreateWishlistDto`) and the server replays them, plus the request's IP,
user-agent and Referer, so the server copy matches as well as the pixel's. They
are used for that event only and never stored. The acting account's own contact
email, phone and name go out as Advanced Matching, hashed server-side.

Two paths deliberately send **nothing**: importing a shared shortlist
(`importFromShare`) and editing a wishlist's creator list wholesale
(`updateWishlist`). Neither has a browser counterpart, so firing there would
produce server-only events that can't be deduplicated.

**Advanced Matching (identifiers sent for match quality):**

| Identifier | `BrandRegistration` (browser) | `BrandRegistration` (server CAPI) | `CreatorProfileListed` (server CAPI) |
|---|---|---|---|
| email (`em`) | ✅ | ✅ | ✅ |
| phone (`ph`) | ✅ | ✅ | ✅ |
| first name (`fn`), last name (`ln`) | ✅ | ✅ | ✅ |
| city (`ct`), state (`st`), country | — (not collected at signup) | — | ✅ |
| `_fbp` / `_fbc` | ✅ (auto) | ✅ (sent from the browser with the request) | ✅ (replayed from signup) |
| IP / user-agent | ✅ (auto) | ✅ (from the request) | ✅ (replayed from signup) |

All PII (email, phone, name, city, state, country) is SHA-256 hashed before it reaches Meta — the browser pixel SDK hashes it client-side (we pass raw values to `identifyPixelUser`), and `MetaCapiService` hashes it server-side. Name is split into first/last via `splitFullName`; city/state are lowercased with spaces/punctuation stripped; country is normalized to its ISO 3166-1 alpha-2 code (e.g. "India" → "in") via `countryToIso2` before hashing, per Meta's normalization rules.

Neither event carries PII in `custom_data` — identifiers travel only through Advanced Matching, where they are hashed. `BrandRegistration` carries the brand name (and website, from the browser) there as reporting metadata.

**Attribution plumbing.** `_fbp` / `_fbc` are read in the user's own browser and posted with the request that creates the profile (`POST /auth/onboarding/role`, `POST /brands/profile`), so the server event carries the same match keys as the browser's. For a **brand** they are used for that event only and never stored. For a **creator** they are stored on the profile (`metaFbp`, `metaFbc`, plus `metaSignupIp` / `metaSignupUserAgent` from the request) because `CreatorProfileListed` fires days later and has to replay them.

**When `CreatorProfileListed` fires:** it is driven by the `isListed` false→true transition itself (computed in `recomputeCreatorListingState`), not by the approve button — so it fires correctly in both onboarding modes (`profile_first`, where approval is the final step, and `approval_first`, where the creator may complete their profile after approval) and never double-counts (the event also uses a stable `event_id` per creator, so any duplicate send is deduped by Meta).

**Attribution note:** `CreatorProfileListed` replays the creator's `_fbp`/`_fbc` (+ IP/UA) captured *at signup*, so a delayed listing still attributes to the ad the creator originally clicked. Meta's click-attribution window is ~7 days, so listings approved long after signup are still counted/audience-eligible but may fall outside ad-optimization credit.

## Environment variables

### Client (Next.js — `client/`)
| Var | Required | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | to enable the creator pixel | `1023291530632481` | Public (shipped to browser). Empty = that pixel never loads. |
| `NEXT_PUBLIC_META_BRAND_PIXEL_ID` | to enable the brand pixel | `1307195287634735` | The `Brands_Gocollab` dataset. Public. Empty = brand events fall back to `NEXT_PUBLIC_META_PIXEL_ID`. |

### Server (NestJS — `server/`)
| Var | Required | Example | Notes |
|---|---|---|---|
| `META_CAPI_ACCESS_TOKEN` | to enable creator CAPI | `EAAB...` | **Secret. Server-only.** Use a non-expiring System User token (below). Also covers the brand dataset unless `META_CAPI_BRAND_ACCESS_TOKEN` is set. |
| `META_CAPI_DATASET_ID` | to enable creator CAPI | `1023291530632481` | Same number as `NEXT_PUBLIC_META_PIXEL_ID`. |
| `META_CAPI_BRAND_DATASET_ID` | to enable brand CAPI | `1307195287634735` | Same number as `NEXT_PUBLIC_META_BRAND_PIXEL_ID`. |
| `META_CAPI_BRAND_ACCESS_TOKEN` | no | `EAAB...` | **Secret.** Only needed when the creator token is not assigned to the brand dataset. |
| `META_CAPI_API_VERSION` | no | `v21.0` | Defaults to `v21.0`. Shared by both datasets. |
| `META_CAPI_TEST_EVENT_CODE` | no | `TEST12345` | Set only while testing; routes events to Events Manager → Test Events. Remove in production. Shared by both datasets. |

> The Pixel ID and Dataset ID are the **same value** — Meta renamed "Pixel" to "Dataset" in Events Manager.

## Getting the IDs and token

1. **Pixel / Dataset ID** — Events Manager → Data sources → your dataset. The ID under the name is used for both the client and server var of that dataset (`NEXT_PUBLIC_META_PIXEL_ID` + `META_CAPI_DATASET_ID`, or `NEXT_PUBLIC_META_BRAND_PIXEL_ID` + `META_CAPI_BRAND_DATASET_ID`).

2. **Access token (non-expiring, recommended)** — use a **System User** token so it never expires and doesn't break when a person leaves:
   - Business Settings → **Users → System Users → Add** (role Admin).
   - **Assign Assets** → **both** Datasets (+ App, Ad Account) with **Manage** access. One token assigned to both means `META_CAPI_BRAND_ACCESS_TOKEN` can stay unset.
   - **Generate new token** → select your App → **Token expiration: Never** → permission **`ads_management`** → Generate.
   - Copy the token (shown once) into `META_CAPI_ACCESS_TOKEN`.
   - The "Generate access token" button inside Events Manager → Conversions API works too, but that token is tied to your personal user and can expire — prefer the System User token for production.

## Optimizing ad delivery on conversions (optional)

`BrandRegistration`, `CreatorProfileListed`, `ExploreCreators` and `HotBrand` are **custom** events (`AddToWishlist`, `ViewContent`, `AddToCart`, `InitiateCheckout` and `Purchase` are standard events and need none of this). They work for reporting, audiences, and custom conversions, but Meta's automated ad-delivery optimization favors standard events. To optimize a campaign on them:

- Events Manager → **Custom Conversions → Create** → map it to the `BrandRegistration` (or `CreatorProfileListed` / `ExploreCreators` / `HotBrand`) event.
- Then select that Custom Conversion as the campaign's optimization goal.

No code change required.

## Verifying events reach Meta

- **Browser events:** install the *Meta Pixel Helper* Chrome extension and watch events fire on the page; and/or Events Manager → **Test Events**. With two pixels, the helper lists both IDs on every page (`PageView` on each) and shows `BrandRegistration` under the brand ID only.
  Walk both brand signup routes when verifying: email+password (fires on the role-choice screen) and Google (fires on `/onboarding/brand`).
- **Server events:** set `META_CAPI_TEST_EVENT_CODE`, trigger the flow, and watch `BrandRegistration` / `CreatorProfileListed` appear live in **Test Events**. The server also logs Meta's `events_received` count, `fbtrace_id` and the dataset on every send.
- **Deduplication:** in Events Manager, a brand signup should show one `BrandRegistration` with both "Browser" and "Server" as sources, not two events. If it shows two, the `event_id` no longer matches on both sides.

## Turning it off / removing

- **Off (instant):** clear the client pixel IDs and/or the server dataset IDs. Each of the four vars switches off one channel of one dataset on its own.
- **Full removal:** delete `client/lib/meta-pixel.ts`, `client/features/auth/lib/track-signup-events.ts`, `client/features/analytics/` (plus its call sites in `client/features/brands/components/brand-creators-browser.tsx` and `client/features/wishlists/components/save-to-wishlist-button.tsx`), `server/src/meta-capi/`, the pixel `<Script>` in `client/app/layout.tsx`, and the trigger call sites in `client/features/creators/components/browse-creators/profile-drawer.tsx`, `client/features/creators/components/browse-creators/order-modal.tsx`, `client/features/auth/components/role-choice-view.tsx`, `client/features/auth/components/brand-google-setup-dialog.tsx`, `server/src/brand-profile/brand-profile.service.ts`, `server/src/creator-profile/creator-profile.service.ts`, the `fireAddToWishlistMetaEvent` call sites in `server/src/wishlists/wishlists.service.ts`, the `firePurchaseMetaEvent` call sites in `server/src/orders/orders.service.ts` (plus the `metaFbp` / `metaFbc` fields on the two wishlist DTOs); drop the `metaFbp` / `metaFbc` fields from `POST /auth/onboarding/role` and `POST /brands/profile`; then drop the `metaFbp` / `metaFbc` / `metaSignupIp` / `metaSignupUserAgent` columns on `CreatorProfile`.
