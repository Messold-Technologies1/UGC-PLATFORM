/**
 * Which brand an agency is currently acting as.
 *
 * The server already understands an `x-brand-profile-id` header: given one, it
 * resolves the caller into that brand's workspace, provided an ACTIVE partner
 * link says they may. This module is the browser half — it remembers the
 * choice and makes sure every request carries it.
 *
 * Kept as a plain module rather than React state because the axios interceptor
 * needs to read it synchronously on every request, long before (and
 * independently of) any component render. A React provider wraps this for the
 * UI; this is the source of truth.
 *
 * Only an agency ever sets this. A brand's own session leaves it null and the
 * header is never sent, so the brand's own requests are untouched.
 */

export const ACTIVE_BRAND_PROFILE_ID_HEADER = "x-brand-profile-id";

const STORAGE_KEY = "ugc:active-brand-profile-id";

/** Sentinel for "the agency's own workspace", i.e. no brand context. */
export const MY_AGENCY = "__my_agency__";

let activeBrandProfileId: string | null = null;
let initialized = false;

type Listener = (value: string | null) => void;
const listeners = new Set<Listener>();

/**
 * Restore the last choice.
 *
 * Every access is wrapped: storage throws in private mode and in embedded
 * browsers, and losing the remembered brand is a minor inconvenience, not a
 * reason to break the page.
 */
export function initActiveBrandProfileId(): string | null {
  if (typeof window === "undefined") return null;
  if (initialized) return activeBrandProfileId;

  initialized = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    activeBrandProfileId = stored && stored !== MY_AGENCY ? stored : null;
  } catch {
    activeBrandProfileId = null;
  }
  return activeBrandProfileId;
}

/**
 * The current value, restoring from storage on first read.
 *
 * Stable between changes, which is what `useSyncExternalStore` requires of a
 * snapshot: it must not return a fresh value on every call or React will
 * re-render forever.
 */
export function getActiveBrandProfileId(): string | null {
  if (!initialized && typeof window !== "undefined") {
    initActiveBrandProfileId();
  }
  return activeBrandProfileId;
}

/** Always null on the server: there is no per-request brand context in SSR. */
export function getServerActiveBrandProfileId(): null {
  return null;
}

/**
 * Switch workspace. Pass null (or MY_AGENCY) to go back to the agency's own.
 *
 * Callers must invalidate their query cache after this: the same endpoints now
 * answer for a different brand, and showing one brand's orders under another's
 * name would be worse than a slow refetch.
 */
export function setActiveBrandProfileId(value: string | null): void {
  const next = !value || value === MY_AGENCY ? null : value;
  if (next === activeBrandProfileId) return;

  activeBrandProfileId = next;

  try {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Not remembering the choice across reloads is survivable.
  }

  for (const listener of listeners) listener(next);
}

/**
 * Drop the context without touching storage listeners' expectations — used on
 * logout, and when the server says the link is gone.
 */
export function clearActiveBrandProfileId(): void {
  setActiveBrandProfileId(null);
}

export function subscribeToActiveBrandProfileId(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
