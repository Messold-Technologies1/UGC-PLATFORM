# Client Implementation Plan: Brand Revocation and Admin Brand Management

## Goal

Update the client to align with the new server-side brand revocation behavior without changing the underlying product rules:

1. Admin brand management should use the real backend list and removal API.
2. Users whose brand access was removed should not be guided into brand setup flows.
3. Brand workspace switching should surface a clear revoked-access message.
4. Brand profile screens should distinguish between:
   - a normal missing profile state
   - a permanently revoked brand-access state
5. Mock brand-profile placeholders should be removed from account/profile UI.

This plan assumes the current server behavior is final:

- `GET /api/admin/brands` returns only active, non-revoked brand users with real `BrandProfile` data
- `DELETE /api/admin/brands/user/:userId/role` permanently removes brand access
- `POST /api/auth/workspace` returns `403` if a revoked user tries to enter `BRAND`
- `POST /api/brands/profile` returns `403` for revoked users
- there is no restore flow

### Required backend support before or alongside client work

The client implementation also requires one small supporting backend enhancement:

- `/api/auth/me` must return `brandAccessRevoked: boolean`

Without that field, some client states can still be inferred from `403` responses, but the UI cannot pre-emptively and consistently render the correct locked state.

---

## 1. Admin Brand Management Page

### Target file
`client/app/admin/brandManagement/page.tsx`

### Problem

The page is currently static placeholder UI. It does not:

- fetch the real brand list
- call the remove-brand API
- reflect deleted rows
- reflect the actual backend payload shape
- function as a real management screen yet

### Client changes

Replace the mock table with a real data-driven screen:

1. Add a query for `GET /api/admin/brands`
2. Render the returned `items`
3. Add a remove action per row using `DELETE /api/admin/brands/user/:userId/role`
4. On success:
   - optimistically remove the row from the table, or
   - invalidate/refetch the brands query
5. Replace “Delete Brand” wording with:
   - `Remove Brand Access`
   - or `Remove Brand`

### Suggested data contract

Expected response item:

```ts
type AdminBrandListItem = {
  userId: string;
  brandProfileId: string | null;
  email: string;
  name: string | null;
  companyName: string | null;
  industry: string | null;
  contactPerson: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};
```

### Required table alignment

The current mock UI has columns for:

- `Campaigns`
- `Total Spend`

But the current backend payload does not include those fields.

For this implementation, align the table to the real API and use columns like:

- `Brand`
- `Email`
- `Industry`
- `Contact Person`
- `Status`
- `Actions`

Do not keep unsupported columns unless a separate backend source is added for them.

### UX notes

- show loading state for initial fetch
- show empty state when no brands are returned
- confirm before removal
- disable the remove button while request is pending

### Scope note

This is not just a small tightening pass.

The current file is mostly a design mock, so this step should be treated as building the real admin brand management screen on top of the existing visual shell.

---

## 2. Admin Brand API Layer

### Suggested new client files

- `client/features/admin-brands/api/fetch-admin-brands.ts`
- `client/features/admin-brands/api/remove-brand-access.ts`
- `client/features/admin-brands/api/types.ts`

### Shared endpoint updates

Add admin brand endpoints in:

`client/lib/endpoints.ts`

Suggested shape:

```ts
ADMIN: {
  CREATORS: { ... },
  BRANDS: {
    LIST: "/api/admin/brands",
    REMOVE: (userId: string) =>
      `/api/admin/brands/user/${encodeURIComponent(userId)}/role`,
  },
}
```

### Reason

Keeping admin brand API logic isolated will make the page simpler and easier to maintain.

### Suggested functions

```ts
export async function fetchAdminBrands(params?: {
  page?: number;
  limit?: number;
}): Promise<BrandsListResponse>

export async function removeBrandAccess(userId: string): Promise<void>
```

### Query key

Use a dedicated key, for example:

```ts
export const adminBrandsQueryKey = ["admin", "brands"] as const;
```

---

## 3. Workspace Switching: Handle Revoked Brand Access

### Target file
`client/features/auth/hooks/use-workspace-navigation.ts`

### Problem

All workspace-switch failures currently show the same generic toast:

```ts
toast.error("Could not switch workspace. Try again.");
```

That is too vague now that the server returns a meaningful `403` when brand access has been revoked.

### Client changes

Update the `catch` branch to inspect the error response:

- if status is `403` while switching to `BRAND`
  - show a specific message like:
    - `Your brand access has been removed by admin.`
- otherwise keep the generic fallback

### Desired behavior

- do not redirect into `/brand/...`
- keep the user in their current valid workspace
- clear switching overlay state

### Implementation note

Use `isAxiosError(err)` to branch on status safely.

---

## 4. Shared Workspace Selection Helper

### Target file
`client/features/auth/lib/ensure-workspace-selection.ts`

### Problem

Revoked brand access is not only exercised through `useWorkspaceNavigation`.

This helper is also used by:

- onboarding flows
- post-auth continuation
- brand profile setup

Right now it always falls back to a generic role-based toast.

### Client changes

Update the helper itself to inspect Axios errors:

- if `role === "BRAND"` and response status is `403`
  - show `Your brand access has been removed by admin.`
- otherwise keep the current generic message

### Why this is required

Without this, several brand flows would still show:

- `Could not continue as brand. Try again.`

even after improving `useWorkspaceNavigation`.

---

## 5. Expose Revocation State in Auth User Payload

### Target files

- `client/features/auth/hooks/use-me-query.ts`
- server `/auth/me` response

### Problem

Several client behaviors in this plan depend on knowing whether brand access was revoked:

- onboarding gating
- profile screen locked state
- setup form short-circuiting
- redirect safety

That cannot be fully reliable if `brandAccessRevoked` remains only a future optional field.

### Final requirement

Treat `brandAccessRevoked` as a required server-supported field for the client implementation.

Updated intended type:

```ts
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  roles: WorkspaceRole[];
  activeRole: WorkspaceRole | null;
  primaryRole: WorkspaceRole | null;
  hasCreatorProfile: boolean;
  hasBrandProfile: boolean;
  brandAccessRevoked: boolean;
};
```

### Why this matters

This will let the client:

- suppress brand onboarding for revoked users
- block “Create profile” messaging for revoked users
- show clear locked states without waiting for a failed API call

### Note

This client plan assumes a small supporting backend enhancement to `/auth/me`.

---

## 6. Dashboard Onboarding Gate

### Target file
`client/components/onboarding/dashboard-onboarding-gate.tsx`

### Problem

Current brand onboarding logic is:

```ts
!hasWorkspaceRole(user, "BRAND") || (!user.hasBrandProfile && !brandOverlayDismissed)
```

That logic treats “missing profile” as a setup case, but after revocation a user should not be nudged toward brand onboarding at all.

### Client changes

Refine brand onboarding visibility:

1. If `brandAccessRevoked === true`
   - never show brand onboarding
2. If user lacks `BRAND` role because access was removed
   - do not show the brand onboarding overlay
3. Only show brand onboarding when:
   - the user is still allowed to be in brand workspace
   - and the profile is incomplete

### Suggested logic

```ts
const canUseBrandWorkspace =
  hasWorkspaceRole(user, "BRAND") && !user.brandAccessRevoked;

const showBrandBlockingOnboarding =
  role === "brand" &&
  !isLoading &&
  !!user &&
  canUseBrandWorkspace &&
  !user.hasBrandProfile &&
  !brandOverlayDismissed;
```

### Desired outcome

Revoked users should not see:

- brand onboarding
- brand setup prompts
- dismissible “complete profile” gates

---

## 7. Brand Settings/Profile Screen

### Target file
`client/app/brand/(dashboard)/settings/profile/page.tsx`

### Problem

This page currently treats `!user.hasBrandProfile` as a normal setup state and still renders the setup form.

That is no longer correct for revoked users.

### Client changes

Split the page into four explicit states:

1. `auth loading`
2. `brand access revoked`
3. `brand profile missing but still allowed`
4. `brand profile exists`

### Desired branching

1. If `authLoading`, show spinner
2. If `!user`, return null
3. If `user.brandAccessRevoked`, render a clear locked state:
   - title: `Brand Access Removed`
   - description: `Your brand access has been removed by admin.`
   - do not render `BrandProfileSetupForm`
4. If `user.hasBrandProfile`, fetch and render edit mode
5. If `!user.hasBrandProfile` and not revoked, render create/setup mode

### Important correction

When no profile exists but user is still valid, render:

```tsx
<BrandProfileSetupForm variant="settings" mode="create" />
```

not update mode with a null profile.

### Required companion change

The form copy currently depends on `variant`, not just `mode`.

So if we render:

```tsx
<BrandProfileSetupForm variant="settings" mode="create" />
```

the form would still incorrectly say:

- `Edit your brand profile`
- `Update your company details and logo.`

This plan therefore also requires updating:

`client/features/brands/components/brand-profile-setup-form.tsx`

Suggested rule:

- if `mode === "create"`, show create/setup copy
- if `mode === "update"`, show edit/update copy

---

## 8. Brand Account/Profile Summary Screen

### Target file
`client/features/account/components/dashboard-brand-account-profile.tsx`

### Problem

This component still contains hardcoded mock fallback profile data:

- company name
- website
- industry
- contact person
- logo key

That can make a revoked or missing-profile state appear valid.

### Client changes

Remove the `staticProfile` fallback entirely.

### Replace with explicit states

1. `auth loading`
2. `profile loading`
3. `revoked`
4. `missing profile`
5. `fetch failed`
6. `profile loaded`

### Desired UI behavior

- revoked:
  - `Brand access has been removed by admin.`
- missing profile:
  - `Your brand profile is not set up yet.`
- fetch failed:
  - `We could not load your brand profile. Try again shortly.`
- loaded:
  - show real data only

### Important rule

Never render fake brand profile data in account/profile surfaces.

---

## 9. Brand Profile Setup Form

### Target file
`client/features/brands/components/brand-profile-setup-form.tsx`

### Problem

The form currently treats most failures as generic:

- `Could not create profile`
- `Could not update profile`

That is not enough now that the server can reject revoked users with `403`.

### Client changes

In both create and update flows:

- inspect Axios errors
- if status is `403`
  - show a specific toast:
    - `Your brand access has been removed by admin.`
  - do not continue setup flow
  - optionally redirect user away from brand setup surfaces later

### Suggested handling

```ts
if (isAxiosError(err) && err.response?.status === 403) {
  toast.error("Your brand access has been removed by admin.");
  return;
}
```

### Additional tightening

Before calling `ensureWorkspaceSelection(queryClient, user, "BRAND")`, prefer checking:

- if `user?.brandAccessRevoked` is true, fail immediately on the client

That avoids unnecessary round trips once `/auth/me` exposes the flag.

### Copy behavior

The form title/description logic should be driven by `mode`, not only `variant`, so that:

- create mode shows setup wording
- update mode shows edit wording

This is required for the settings page create-state to read correctly.

---

## 10. Brand Profile Fetching and Empty-State Semantics

### Target files

- `client/features/brands/api/fetch-brand-profile-me.ts`
- `client/app/brand/(dashboard)/settings/profile/page.tsx`
- `client/features/account/components/dashboard-brand-account-profile.tsx`

### Problem

The client currently mixes together:

- `no profile`
- `query failed`
- `brand access revoked`

These need to be handled separately.

### Client changes

Treat response semantics as:

- `200`: profile exists
- `404`: no profile exists
- `403`: brand access revoked or no longer permitted

### Chosen approach

Use a normalized fetch helper instead of relying only on `isError`.

Current consumers mostly read query booleans like:

- `isLoading`
- `isError`
- `data`

That is not enough to distinguish `404` from `403`.

So update the fetch layer to return structured states like:

```ts
type BrandProfileState =
  | { kind: "ready"; profile: BrandProfileItemApi }
  | { kind: "missing" }
  | { kind: "revoked" };
```

Then the consuming pages should branch on `kind` instead of generic query failure.

### Required consumer updates

This change must be implemented together in:

- `client/app/brand/(dashboard)/settings/profile/page.tsx`
- `client/features/account/components/dashboard-brand-account-profile.tsx`

Those files currently rely on generic React Query booleans like:

- `isLoading`
- `isError`
- `data`

So they must be rewritten to use the normalized profile state directly rather than left half-migrated.

### Important integration note

`fetchBrandProfileMe()` is also used in:

- `client/features/brands/components/brand-profile-setup-form.tsx`

inside the create-flow recovery path that currently re-fetches the profile after some `500` responses.

Because of that, do one of these explicitly:

1. Keep `fetchBrandProfileMe()` returning the raw profile and introduce a new normalized helper for UI state handling, or
2. If `fetchBrandProfileMe()` itself is changed to return normalized state, also update the recovery logic in `brand-profile-setup-form.tsx`

### Recommended choice

Prefer option 1:

- keep `fetchBrandProfileMe()` as the raw profile fetcher for mutation recovery
- add a new UI-oriented helper, for example:

```ts
export async function fetchBrandProfileState(): Promise<BrandProfileState>
```

This avoids breaking the existing create-flow recovery logic while still giving the UI a clean way to branch on `ready | missing | revoked`.

---

## 11. Post-Login and Workspace Redirect Safety

### Target files

- `client/features/auth/lib/post-auth-destination.ts`
- `client/features/auth/lib/resolve-immediate-post-auth-path.ts`

### Problem

The current routing logic assumes that if the user has a role, redirecting toward that workspace is valid.

After permanent brand revocation, that assumption may be stale in some transitions.

### Client changes

Tighten redirect rules once `brandAccessRevoked` is available:

- never route a revoked user toward `/brand/...`
- if their only non-admin path used to be brand, route them toward:
  - `/auth/continue`
  - or a safe creator/default path if available

### Minimal safe fallback

If the user:

- does not have `BRAND` in `roles`
- or `brandAccessRevoked === true`

then brand destinations should not be selected by redirect helpers.

---

## 12. Implementation Order

Recommended order for client work:

1. Expose `brandAccessRevoked` in `/auth/me` and update `AuthUser`
2. Add admin brand API helpers
3. Replace static admin brand management page with a real management screen using live data and aligned columns
4. Add specific `403` handling in both `useWorkspaceNavigation` and `ensureWorkspaceSelection`
5. Normalize brand profile fetch state into `ready | missing | revoked`
6. Split brand profile/account screens into revoked vs missing vs loaded states
7. Update `BrandProfileSetupForm` copy logic for create vs update mode
8. Remove mock brand profile fallback data
9. Tighten onboarding gate
10. Tighten post-login redirect logic

---

## 13. Verification Checklist

After client implementation:

1. Admin brand page loads real brands from the backend
2. Removing a brand updates the UI correctly
3. Removed users no longer appear in admin brand list
4. A revoked user trying to switch to brand workspace gets a specific message
5. A revoked user hitting any path that uses `ensureWorkspaceSelection` also gets the correct message
6. A revoked user is not shown brand onboarding
7. A revoked user cannot see a brand setup form
8. Brand account/profile screens never show placeholder/mock brand data
9. A normal non-revoked user with no brand profile still sees setup flow correctly
10. A valid user with an existing brand profile still sees edit/update flow correctly
11. Brand settings create mode uses create/setup copy, not edit/update copy
12. Admin table no longer shows unsupported columns like campaigns/spend unless backed by real data

---

## Final Outcome

After these client changes:

- admin brand management will be fully connected to the real backend
- revoked users will see clear, correct UI states
- brand setup flows will only appear for users who are still allowed to create a brand profile
- the client will no longer confuse missing-profile, revoked-access, and error states
