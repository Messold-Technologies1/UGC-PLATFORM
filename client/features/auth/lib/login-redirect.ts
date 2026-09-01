import type { LoginRole } from "./login-role-config";

/** Normalize a callback path or full URL to an internal app path. */
export function normalizeCallbackPath(
  path: string | null | undefined,
  fallback = "/",
): string {
  if (!path?.trim()) return fallback;

  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function inferLoginRoleFromPath(path: string): LoginRole | null {
  const normalized = normalizeCallbackPath(path);
  const pathname = normalized.split("?")[0] ?? normalized;

  if (pathname === "/creator" || pathname.startsWith("/creator/")) return "creator";
  if (pathname === "/brand" || pathname.startsWith("/brand/")) return "brand";
  if (pathname === "/agency" || pathname.startsWith("/agency/")) return "agency";
  return null;
}

export function isAdminPath(path: string): boolean {
  const pathname = normalizeCallbackPath(path).split("?")[0] ?? "";
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Login URL for the workspace the user was in (or their primary role). */
export function getPostLogoutLoginHref(params?: {
  pathname?: string;
  primaryRole?: string | null;
}): string {
  const pathname =
    params?.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");

  if (isAdminPath(pathname)) return "/admin/login";

  const fromPath = inferLoginRoleFromPath(pathname);
  if (fromPath) return `/login?role=${fromPath}`;

  const role = params?.primaryRole?.toUpperCase();
  if (role === "ADMIN") return "/admin/login";
  if (role === "CREATOR") return "/login?role=creator";
  if (role === "BRAND") return "/login?role=brand";
  if (role === "AGENCY") return "/login?role=agency";
  return "/login";
}

/** Build a login URL that preserves callback and selects the right workspace role. */
export function buildLoginHref(callbackPath: string): string {
  const path = normalizeCallbackPath(callbackPath);
  if (isAdminPath(path)) {
    return "/admin/login";
  }
  const params = new URLSearchParams({ callbackUrl: path });
  const role = inferLoginRoleFromPath(path);
  if (role) {
    params.set("role", role);
  }
  return `/login?${params.toString()}`;
}
