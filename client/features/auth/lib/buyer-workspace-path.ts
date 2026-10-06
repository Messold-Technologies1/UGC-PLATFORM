import type { AuthUser } from "@/features/auth/hooks/use-me-query";

export type BuyerWorkspaceBase = "/brand" | "/agency";

/** Pathname-only: use when auth user isn't available yet. */
export function buyerWorkspaceBaseFromPathname(
  pathname: string | null | undefined,
): BuyerWorkspaceBase {
  if (pathname?.startsWith("/agency")) return "/agency";
  return "/brand";
}

/** Prefer agency base for agency-only accounts even on shared /brand URLs. */
export function buyerWorkspaceBaseForUser(
  pathname: string | null | undefined,
  user: Pick<AuthUser, "primaryRole" | "hasAgencyProfile" | "hasBrandProfile"> | null | undefined,
): BuyerWorkspaceBase {
  if (pathname?.startsWith("/agency")) return "/agency";
  if (
    user?.primaryRole === "AGENCY" ||
    (user?.hasAgencyProfile && !user.hasBrandProfile)
  ) {
    return "/agency";
  }
  return "/brand";
}

/** Build an absolute buyer-workspace path from a relative segment (e.g. `/orders`). */
export function buyerWorkspaceHref(
  base: BuyerWorkspaceBase,
  path: string,
): string {
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Remap a hardcoded `/brand/...` href onto the active buyer workspace. */
export function remapBuyerHref(
  href: string,
  base: BuyerWorkspaceBase,
): string {
  if (href.startsWith("/brand/") || href === "/brand") {
    return `${base}${href.slice("/brand".length)}`;
  }
  return href;
}
