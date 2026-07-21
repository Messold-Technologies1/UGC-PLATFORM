/**
 * Shared browse-list constants. Kept in a server-safe module (no "use client")
 * so both the client `CreatorListing` and the server component that fetches
 * `initialData` reference the same page size — the SSR `initialData` is only
 * consumed when its `limit` matches the client's list limit.
 */
export const BROWSE_LIST_LIMIT = 24;
