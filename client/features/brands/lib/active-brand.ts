import type { AuthUser } from "@/features/auth/hooks/use-me-query";

export const ACTIVE_BRAND_STORAGE_PREFIX = "ugc:active-brand:";
export const ACTIVE_BRAND_HEADER = "x-brand-profile-id";

export function activeBrandStorageKey(userId: string): string {
  return `${ACTIVE_BRAND_STORAGE_PREFIX}${userId}`;
}

export function readStoredActiveBrandId(userId: string): string | null {
  try {
    const raw = sessionStorage.getItem(activeBrandStorageKey(userId));
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function writeStoredActiveBrandId(
  userId: string,
  brandProfileId: string,
): void {
  try {
    sessionStorage.setItem(activeBrandStorageKey(userId), brandProfileId);
  } catch {}
}

export function clearStoredActiveBrandId(userId: string): void {
  try {
    sessionStorage.removeItem(activeBrandStorageKey(userId));
  } catch {}
}

export function resolveClientActiveBrandId(user: AuthUser): string | null {
  const allowed = new Set(user.accessibleBrands.map((b) => b.id));

  if (user.activeBrandProfileId && allowed.has(user.activeBrandProfileId)) {
    return user.activeBrandProfileId;
  }

  const stored = readStoredActiveBrandId(user.id);
  if (stored && allowed.has(stored)) {
    return stored;
  }

  if (user.accessibleBrands.length === 1) {
    return user.accessibleBrands[0]!.id;
  }

  return null;
}

export function userNeedsBrandSelection(user: AuthUser): boolean {
  const isAgency = user.roles.includes("AGENCY");
  if (!isAgency && !user.hasBrandProfile) return false;
  if (user.accessibleBrands.length === 0) return isAgency;
  if (user.accessibleBrands.length === 1) return false;
  return resolveClientActiveBrandId(user) === null;
}

export function userCanUseBrandWorkspace(user: AuthUser): boolean {
  if (user.roles.includes("AGENCY") && user.hasAgencyProfile) {
    return user.accessibleBrands.length > 0;
  }
  return (
    user.roles.includes("BRAND") &&
    !user.brandAccessRevoked &&
    (user.hasBrandProfile || user.accessibleBrands.length > 0)
  );
}
