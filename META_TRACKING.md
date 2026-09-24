# Meta (Facebook) Event Tracking

This project reports conversions to Meta through two channels:

- **Browser Pixel** — `fbq` loaded in `client/app/layout.tsx`, helpers in `client/lib/meta-pixel.ts`, signup call sites in `client/features/auth/lib/track-signup-events.ts`.
- **Conversions API (CAPI)** — server-to-server from `server/src/meta-capi/`.

Everything is **env-gated**: clear the env vars and all tracking becomes a silent no-op — no code change needed.

## Two datasets

Creator-side and brand-side ads are bought against separate Meta datasets, so the site loads **two pixels** and the server holds credentials for both:

| Dataset | Client env var | Server env vars | Gets |
|---|---|---|---|
| Creator (main) | `NEXT_PUBLIC_META_PIXEL_ID` | `META_CAPI_DATASET_ID` + `META_CAPI_ACCESS_TOKEN` | `PageView`, `CreatorProfileListed` |
| Brand (`Brands_Gocollab`) | `NEXT_PUBLIC_META_BRAND_PIXEL_ID` | `META_CAPI_BRAND_DATASET_ID` (+ optional `META_CAPI_BRAND_ACCESS_TOKEN`) | `PageView`, `BrandRegistration` |

Both pixels are initialized by the base loader and both receive `PageView`. Every other browser event is sent with Meta's per-pixel `trackSingleCustom`, so it lands in exactly one dataset — a plain `fbq('track', …)` would report to both.

Each side is independently gated. Clearing `NEXT_PUBLIC_META_BRAND_PIXEL_ID` sends brand browser events to the main pixel instead (the behaviour before the split) and stops the second pixel loading; clearing `META_CAPI_BRAND_DATASET_ID` drops the server copy. The brand dataset reuses `META_CAPI_ACCESS_TOKEN` unless `META_CAPI_BRAND_ACCESS_TOKEN` is set — a System User token assigned to both datasets can post to either.

## Events sent

| Event name | Fires when | Dataset | Channel | Deduplicated? |
|---|---|---|---|---|
| `PageView` | every page load | both | Browser pixel | — |
| `BrandRegistration` | the brand profile is created — at the role-choice step for email+password signup (an OTP-verified phone is already on file, so brand setup is skipped) or on `/onboarding/brand` for the Google route | Brand | Browser pixel **+** server CAPI | ✅ shared `event_id` |
| `CreatorProfileListed` | the creator's `isListed` flips false→true (admin approval of a complete profile, or the creator completing their profile after an earlier approval) | Creator | Server CAPI | — |

**Creators are not tracked at signup.** Their conversion is `CreatorProfileListed` — a creator only becomes worth anything to the marketplace once they are listed, so that is the event campaigns optimize on.

**Deduplication:** `BrandRegistration` fires from both the browser and the server with the same `event_id` — `brand-registration-<brandProfileId>`, built identically on both sides (`brandRegistrationEventId` in `client/features/auth/lib/track-signup-events.ts` and `server/src/meta-capi/meta-capi.service.ts`; keep the two in step). Meta counts them once. The browser gives a real-time signal; the server copy survives ad-blockers.

### Where each signup route fires

Both signup routes converge on the role-choice screen (`/onboarding/role`), and brand profile creation is the single trigger either way:

| Route | Creator | Brand |
|---|---|---|
| Email + password (`/register`) | nothing at signup | role choice → `BrandRegistration` (the server creates the brand profile there, since the phone was OTP-verified at signup) |
| Google | nothing at signup | role choice (no profile yet) → `/onboarding/brand` → `BrandRegistration` after the phone is verified |

The server copy is fired from `createOwnedBrandProfileForUser`, the one function both routes pass through, so it cannot miss a route or double-count.

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

`BrandRegistration` and `CreatorProfileListed` are **custom** events. They work for reporting, audiences, and custom conversions, but Meta's automated ad-delivery optimization favors standard events. To optimize a campaign on them:

- Events Manager → **Custom Conversions → Create** → map it to the `BrandRegistration` (or `CreatorProfileListed`) event.
- Then select that Custom Conversion as the campaign's optimization goal.

No code change required.

## Verifying events reach Meta

- **Browser events:** install the *Meta Pixel Helper* Chrome extension and watch events fire on the page; and/or Events Manager → **Test Events**. With two pixels, the helper lists both IDs on every page (`PageView` on each) and shows `BrandRegistration` under the brand ID only.
  Walk both brand signup routes when verifying: email+password (fires on the role-choice screen) and Google (fires on `/onboarding/brand`).
- **Server events:** set `META_CAPI_TEST_EVENT_CODE`, trigger the flow, and watch `BrandRegistration` / `CreatorProfileListed` appear live in **Test Events**. The server also logs Meta's `events_received` count, `fbtrace_id` and the dataset on every send.
- **Deduplication:** in Events Manager, a brand signup should show one `BrandRegistration` with both "Browser" and "Server" as sources, not two events. If it shows two, the `event_id` no longer matches on both sides.

## Turning it off / removing

- **Off (instant):** clear the client pixel IDs and/or the server dataset IDs. Each of the four vars switches off one channel of one dataset on its own.
- **Full removal:** delete `client/lib/meta-pixel.ts`, `client/features/auth/lib/track-signup-events.ts`, `server/src/meta-capi/`, the pixel `<Script>` in `client/app/layout.tsx`, and the trigger call sites in `client/features/auth/components/role-choice-view.tsx`, `client/features/auth/components/brand-google-setup-dialog.tsx`, `server/src/brand-profile/brand-profile.service.ts`, and `server/src/creator-profile/creator-profile.service.ts`; drop the `metaFbp` / `metaFbc` fields from `POST /auth/onboarding/role` and `POST /brands/profile`; then drop the `metaFbp` / `metaFbc` / `metaSignupIp` / `metaSignupUserAgent` columns on `CreatorProfile`.
