# Microsoft Clarity

Session replay and heatmaps via [Microsoft Clarity](https://clarity.microsoft.com/), using the official `@microsoft/clarity` npm SDK.

- **Loader** — `ClarityInit` in `client/components/clarity.tsx` calls `Clarity.init(projectId)` once on the client, mounted from `client/app/layout.tsx`.
- **User linkage** — `ClarityUserSync` (same file) calls `Clarity.identify(user.id, …, role)` whenever the signed-in user changes, so sessions group per user. Only the **opaque user id** is sent — never email or other PII. The role is also set as a Clarity tag.
- **Helpers** — `client/lib/clarity.ts` (`identifyClarityUser`, `CLARITY_MASK`).

It is **env-gated**: leave `NEXT_PUBLIC_CLARITY_PROJECT_ID` empty and the SDK never initializes — every Clarity call becomes a silent no-op, no code change needed.

## PII masking

On top of Clarity's dashboard masking mode, sensitive UI is force-masked in code via the `data-clarity-mask="true"` attribute (spread from the `CLARITY_MASK` constant). Masked surfaces:

| Surface | File |
|---|---|
| Chat message thread | `client/features/messages/components/messages-chat-thread.tsx` |
| Creator payout details | `client/features/account/components/creator-account/dashboard-payout-details.tsx` |
| Admin banking details | `client/features/admin/components/creator-banking-details-card.tsx` |
| Shipping address | `client/features/orders/components/brand-order-detail/order-shipping/shipping-address-card.tsx` |
| Creator profile phone/email | `client/features/account/components/creator-account/creator-account-profile-view.tsx` |

Add `{...CLARITY_MASK}` to any new element that renders user PII.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | client | Clarity project ID (e.g. `xk7yl8ttic`). Empty = Clarity disabled. |

Set it in your hosting/deployment env config (Vercel project settings, `.env.local`, etc.). It is a public value by design (it ships to the browser), but it lives in env config rather than being hardcoded so it can be swapped or disabled per environment.

## Removal

Delete `client/components/clarity.tsx`, `client/lib/clarity.ts`, the two `<Clarity* />` mounts in `client/app/layout.tsx`, the `clarityProjectId` entry in `client/lib/env.ts`, and the `{...CLARITY_MASK}` attributes, then `npm remove @microsoft/clarity`.
