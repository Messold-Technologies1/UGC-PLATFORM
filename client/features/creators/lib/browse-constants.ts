/**
 * Shared browse-list constants. Kept in a server-safe module (no "use client")
 * so both the client `CreatorListing` and the server component that fetches
 * `initialData` reference the same page size — the SSR `initialData` is only
 * consumed when its `limit` matches the client's list limit.
 */
export const BROWSE_LIST_LIMIT = 24;

/** Google Form for brands that want a custom creator match. */
export const BRAND_CREATOR_MATCH_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr7KglvvfKo8qFIxp2OdBVIrwuVS5qHkoG9kbVHXs1slOSSA/viewform";
