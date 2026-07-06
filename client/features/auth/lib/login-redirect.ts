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

  if (pathname.startsWith("/creator")) return "creator";
  if (pathname.startsWith("/brand")) return "brand";
  return null;
}

/** Build a login URL that preserves callback and selects the right workspace role. */
export function buildLoginHref(callbackPath: string): string {
  const path = normalizeCallbackPath(callbackPath);
  const params = new URLSearchParams({ callbackUrl: path });
  
  if (path.startsWith("/admin")) {
    return `/admin/login?${params.toString()}`;
  }
  
  const role = inferLoginRoleFromPath(path);
  if (role) {
    params.set("role", role);
  }
  return `/login?${params.toString()}`;
}
