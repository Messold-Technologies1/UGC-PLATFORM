import Clarity from "@microsoft/clarity";
import { env } from "@/lib/env";

/**
 * Thin wrapper around Microsoft Clarity (`@microsoft/clarity`).
 *
 * Everything is a no-op when {@link env.clarityProjectId} is empty or when not
 * running in the browser, so callers never have to guard. Removal later is just:
 * delete this file, the `<ClarityInit />` mount in `app/layout.tsx`, and the
 * `identifyClarityUser` call site.
 */

let started = false;

/** True once Clarity has been initialized in the browser. */
function ready(): boolean {
  return typeof window !== "undefined" && Boolean(env.clarityProjectId);
}

/** Initialize Clarity once, on the client. Safe to call repeatedly. */
export function initClarity(): void {
  if (!ready() || started) return;
  try {
    Clarity.init(env.clarityProjectId);
    started = true;
  } catch {
    // Never let analytics break the app.
  }
}

/**
 * Associate the current session with a signed-in user so recordings can be
 * filtered by person/role. `customId` is hashed by Clarity before storage.
 */
export function identifyClarityUser(
  customId: string,
  friendlyName?: string,
): void {
  initClarity(); // ensure init regardless of effect ordering
  if (!started) return;
  try {
    Clarity.identify(customId, undefined, undefined, friendlyName);
  } catch {
    // Never let analytics break the app.
  }
}

/** Attach a filterable custom tag to the current session (e.g. role). */
export function setClarityTag(key: string, value: string | string[]): void {
  initClarity();
  if (!started) return;
  try {
    Clarity.setTag(key, value);
  } catch {
    // Never let analytics break the app.
  }
}
