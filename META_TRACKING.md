# Meta (Facebook) Event Tracking

This project reports conversions to Meta through two channels:

- **Browser Pixel** — `fbq` loaded in `client/app/layout.tsx`, helpers in `client/lib/meta-pixel.ts`, signup call sites in `client/features/auth/lib/track-signup-events.ts`.
- **Conversions API (CAPI)** — server-to-server from `server/src/meta-capi/`.

Everything is **env-gated**: clear the env vars and all tracking becomes a silent no-op — no code change needed.

## Two datasets

Creator-side and brand-side ads are bought against separate Meta datasets, so the site loads **two pixels**:

| Dataset | Env var | Gets |
|---|---|---|
| Creator (main) | `NEXT_PUBLIC_META_PIXEL_ID` | `PageView`, `CreatorRegistration`, `CreatorProfileListed` |
| Brand (`Brands_Gocollab`) | `NEXT_PUBLIC_META_BRAND_PIXEL_ID` | `PageView`, `BrandRegistration` |

Both pixels are initialized by the base loader and both receive `PageView`. Every signup event is sent with Meta's per-pixel `trackSingleCustom`, so it lands in exactly one dataset — a plain `fbq('track', …)` would report to both.

If `NEXT_PUBLIC_META_BRAND_PIXEL_ID` is left empty, brand events fall back to the main pixel (the behaviour before the split) and no second pixel is initialized.

## Events sent

| Event name | Fires when | Dataset | Channel | Deduplicated? |
|---|---|---|---|---|
| `PageView` | every page load | both | Browser pixel | — |
| `CreatorRegistration` | the creator picks "I'm a Creator" — the step that actually creates the creator profile, on both the Google and email+password routes | Creator | Browser pixel | — |
| `BrandRegistration` | the brand's profile is created — at the role-choice step for email+password signup (an OTP-verified phone is already on file, so brand setup is skipped) or on `/onboarding/brand` for the Google route | Brand | Browser pixel | — |
| `CreatorProfileListed` | the creator's `isListed` flips false→true (admin approval of a complete profile, or the creator completing their profile after an earlier approval) | Creator | Server CAPI | — |

### Where each signup route fires

Both signup routes converge on the role-choice screen (`/onboarding/role`), which is where each event is anchored:

| Route | Creator | Brand |
|---|---|---|
| Email + password (`/register`) | role choice → `CreatorRegistration` | role choice → `BrandRegistration` (the server creates the brand profile there, since the phone was OTP-verified at signup) |
| Google | role choice → `CreatorRegistration` | role choice (no profile yet) → `/onboarding/brand` → `BrandRegistration` after the phone is verified |

Each event fires exactly once per signup: the role-choice screen only reports the brand conversion when the profile was created there, otherwise the setup screen does.

**Advanced Matching (identifiers sent for match quality):**

| Identifier | Registration events (browser) | `CreatorProfileListed` (server CAPI) |
|---|---|---|
| email (`em`) | ✅ | ✅ |
| phone (`ph`) | ✅ (when one is on file — always for email+password signup; for a Google brand, the number verified during setup) | ✅ |
| first name (`fn`), last name (`ln`) | ✅ | ✅ |
| city (`ct`), state (`st`), country | — (not collected at signup) | ✅ |
| `_fbp` / `_fbc` | ✅ (auto) | ✅ (replayed) |
| IP / user-agent | ✅ (auto) | ✅ |

All PII (email, phone, name, city, state, country) is SHA-256 hashed before it reaches Meta — the browser pixel SDK hashes it client-side (we pass raw values to `identifyPixelUser`), and `MetaCapiService` hashes it server-side. Name is split into first/last via `splitFullName`; city/state are lowercased with spaces/punctuation stripped; country is normalized to its ISO 3166-1 alpha-2 code (e.g. "India" → "in") via `countryToIso2` before hashing, per Meta's normalization rules.

The signup events carry **no PII in `custom_data`** — identifiers travel only through Advanced Matching, where they are hashed. `BrandRegistration` carries the brand name and website in `custom_data` for reporting/segmentation (metadata, not matching identifiers).

`_fbp` / `_fbc` are read in the creator's own browser at the role-choice step and stored on the creator profile (`metaFbp`, `metaFbc`, plus `metaSignupIp` / `metaSignupUserAgent` from the request), so out-of-band server events can replay them.

**When `CreatorProfileListed` fires:** it is driven by the `isListed` false→true transition itself (computed in `recomputeCreatorListingState`), not by the approve button — so it fires correctly in both onboarding modes (`profile_first`, where approval is the final step, and `approval_first`, where the creator may complete their profile after approval) and never double-counts (the event also uses a stable `event_id` per creator, so any duplicate send is deduped by Meta).

**Attribution note:** `CreatorProfileListed` is sent server-side and replays the creator's `_fbp`/`_fbc` (+ IP/UA) captured *at signup*, so a delayed listing still attributes to the ad the creator originally clicked. Meta's click-attribution window is ~7 days, so listings approved long after signup are still counted/audience-eligible but may fall outside ad-optimization credit.

**CAPI covers the creator dataset only.** The brand dataset is browser-only today; adding a server copy of `BrandRegistration` would need its own dataset ID + access token (Meta scopes a CAPI token to one dataset) and a shared `event_id` for deduplication.

## Environment variables

### Client (Next.js — `client/`)
| Var | Required | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | to enable the creator pixel | `1023291530632481` | Public (shipped to browser). Empty = that pixel never loads. |
| `NEXT_PUBLIC_META_BRAND_PIXEL_ID` | to enable the brand pixel | `1307195287634735` | The `Brands_Gocollab` dataset. Public. Empty = brand events fall back to `NEXT_PUBLIC_META_PIXEL_ID`. |

### Server (NestJS — `server/`)
| Var | Required | Example | Notes |
|---|---|---|---|
| `META_CAPI_ACCESS_TOKEN` | to enable CAPI | `EAAB...` | **Secret. Server-only.** Use a non-expiring System User token (below). |
| `META_CAPI_DATASET_ID` | to enable CAPI | `1023291530632481` | Same number as the Pixel ID. |
| `META_CAPI_API_VERSION` | no | `v21.0` | Defaults to `v21.0`. |
| `META_CAPI_TEST_EVENT_CODE` | no | `TEST12345` | Set only while testing; routes events to Events Manager → Test Events. Remove in production. |

> The Pixel ID and Dataset ID are the **same value** — Meta renamed "Pixel" to "Dataset" in Events Manager. The CAPI vars point at the **creator** dataset; the brand dataset currently receives browser events only.

## Getting the IDs and token

1. **Pixel / Dataset ID** — Events Manager → Data sources → your dataset. The ID under the name is used for both `NEXT_PUBLIC_META_PIXEL_ID` and `META_CAPI_DATASET_ID`.

2. **Access token (non-expiring, recommended)** — use a **System User** token so it never expires and doesn't break when a person leaves:
   - Business Settings → **Users → System Users → Add** (role Admin).
   - **Assign Assets** → your Dataset (+ App, Ad Account) with **Manage** access.
   - **Generate new token** → select your App → **Token expiration: Never** → permission **`ads_management`** → Generate.
   - Copy the token (shown once) into `META_CAPI_ACCESS_TOKEN`.
   - The "Generate access token" button inside Events Manager → Conversions API works too, but that token is tied to your personal user and can expire — prefer the System User token for production.

## Optimizing ad delivery on registrations (optional)

`BrandRegistration` and `CreatorRegistration` are **custom** events. They work for reporting, audiences, and custom conversions, but Meta's automated ad-delivery optimization favors standard events. To optimize a campaign on signups:

- Events Manager → **Custom Conversions → Create** → map it to the `CreatorRegistration` (or `BrandRegistration`) event.
- Then select that Custom Conversion as the campaign's optimization goal.

No code change required.

## Verifying events reach Meta

- **Browser events:** install the *Meta Pixel Helper* Chrome extension and watch events fire on the page; and/or Events Manager → **Test Events**. With two pixels, the helper lists both IDs on every page (`PageView` on each) and shows the signup event under one ID only — check `BrandRegistration` against the brand dataset and `CreatorRegistration` against the creator one.
  Walk all four signup paths when verifying: email+password and Google, each as creator and as brand.
- **Server events:** set `META_CAPI_TEST_EVENT_CODE`, trigger the flow, and watch `CreatorRegistration` / `CreatorProfileListed` appear live in **Test Events**. The server also logs Meta's `events_received` count and `fbtrace_id` on every send.

## Turning it off / removing

- **Off (instant):** clear `NEXT_PUBLIC_META_PIXEL_ID` + `NEXT_PUBLIC_META_BRAND_PIXEL_ID` (client) and/or `META_CAPI_ACCESS_TOKEN` + `META_CAPI_DATASET_ID` (server). Clearing just one pixel ID switches off that dataset.
- **Full removal:** delete `client/lib/meta-pixel.ts`, `client/features/auth/lib/track-signup-events.ts`, `server/src/meta-capi/`, the pixel `<Script>` in `client/app/layout.tsx`, and the trigger call sites in `client/features/auth/components/role-choice-view.tsx`, `client/features/auth/components/brand-google-setup-dialog.tsx`, and `server/src/creator-profile/creator-profile.service.ts`; drop the `metaFbp` / `metaFbc` fields from `POST /auth/onboarding/role`; then drop the `metaFbp` / `metaFbc` / `metaSignupIp` / `metaSignupUserAgent` columns on `CreatorProfile`.
