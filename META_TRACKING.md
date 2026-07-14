# Meta (Facebook) Event Tracking

This project sends conversion events to Meta via two channels:

- **Browser Pixel** — `fbq` loaded in `client/app/layout.tsx`, helpers in `client/lib/meta-pixel.ts`.
- **Conversions API (CAPI)** — server-to-server from `server/src/meta-capi/`.

Both are **env-gated**: clear the env vars and all tracking becomes a silent no-op — no code change needed.

## Events sent

| Event name | Fires when | Path(s) | Deduplicated? |
|---|---|---|---|
| `PageView` | every page load | Browser pixel | — |
| `BrandRegistration` | a brand finishes signup (their own browser) | Browser pixel | — |
| `CreatorRegistration` | a creator finishes signup (their own browser) | Browser pixel **+** server CAPI | ✅ shared `event_id` |
| `CreatorProfileListed` | the creator's `isListed` flips false→true (admin approval of a complete profile, or the creator completing their profile after an earlier approval) | Server CAPI | — |

**Deduplication:** `CreatorRegistration` fires from both the browser and the server with the same `event_id` (`metaSignupEventId`), so Meta counts it once. The browser gives a real-time signal; the server copy survives ad-blockers and carries extra match keys (hashed phone, IP, user-agent).

**Advanced Matching (identifiers sent for match quality):**

| Identifier | Browser pixel | Server CAPI |
|---|---|---|
| email (`em`) | ✅ | ✅ |
| phone (`ph`) | ✅ | ✅ |
| first name (`fn`), last name (`ln`) | ✅ | ✅ |
| city (`ct`), state (`st`), country | ✅ | ✅ |
| `_fbp` / `_fbc` | ✅ (auto) | ✅ (replayed) |
| IP / user-agent | ✅ (auto) | ✅ |

All PII (email, phone, name, city, state, country) is SHA-256 hashed before it reaches Meta — the browser pixel SDK hashes it client-side (we pass raw values to `identifyPixelUser`), and `MetaCapiService` hashes it server-side. Name is split into first/last via `splitFullName`; city/state are lowercased with spaces/punctuation stripped; country is normalized to its ISO 3166-1 alpha-2 code (e.g. "India" → "in") via `countryToIso2` before hashing, per Meta's normalization rules.

`BrandRegistration` additionally carries the brand name in `custom_data.brand_name` for reporting/segmentation (this is metadata, not a matching identifier).

**When it fires:** `CreatorProfileListed` is driven by the `isListed` false→true transition itself (computed in `recomputeCreatorListingState`), not by the approve button — so it fires correctly in both onboarding modes (`profile_first`, where approval is the final step, and `approval_first`, where the creator may complete their profile after approval) and never double-counts (the event also uses a stable `event_id` per creator, so any duplicate send is deduped by Meta).

**Attribution note:** `CreatorProfileListed` is sent server-side and replays the creator's `_fbp`/`_fbc` (+ IP/UA) captured *at signup*, so a delayed listing still attributes to the ad the creator originally clicked. Meta's click-attribution window is ~7 days, so listings approved long after signup are still counted/audience-eligible but may fall outside ad-optimization credit.

## Environment variables

### Client (Next.js — `client/`)
| Var | Required | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | to enable pixel | `1023291530632481` | Public (shipped to browser). Empty = pixel never loads. |

### Server (NestJS — `server/`)
| Var | Required | Example | Notes |
|---|---|---|---|
| `META_CAPI_ACCESS_TOKEN` | to enable CAPI | `EAAB...` | **Secret. Server-only.** Use a non-expiring System User token (below). |
| `META_CAPI_DATASET_ID` | to enable CAPI | `1023291530632481` | Same number as the Pixel ID. |
| `META_CAPI_API_VERSION` | no | `v21.0` | Defaults to `v21.0`. |
| `META_CAPI_TEST_EVENT_CODE` | no | `TEST12345` | Set only while testing; routes events to Events Manager → Test Events. Remove in production. |

> The Pixel ID and Dataset ID are the **same value** — Meta renamed "Pixel" to "Dataset" in Events Manager.

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

- **Browser events:** install the *Meta Pixel Helper* Chrome extension and watch events fire on the page; and/or Events Manager → **Test Events**.
- **Server events:** set `META_CAPI_TEST_EVENT_CODE`, trigger the flow, and watch `CreatorRegistration` / `CreatorProfileListed` appear live in **Test Events**. The server also logs Meta's `events_received` count and `fbtrace_id` on every send.

## Turning it off / removing

- **Off (instant):** clear `NEXT_PUBLIC_META_PIXEL_ID` (client) and/or `META_CAPI_ACCESS_TOKEN` + `META_CAPI_DATASET_ID` (server).
- **Full removal:** delete `client/lib/meta-pixel.ts`, `server/src/meta-capi/`, the pixel `<Script>` in `client/app/layout.tsx`, and the trigger call sites in the two register forms, `server/src/auth/auth.service.ts`, and `server/src/creator-profile/creator-profile.service.ts`; then drop the `metaFbp` / `metaFbc` / `metaSignupIp` / `metaSignupUserAgent` columns on `CreatorProfile`.
