import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import {
  ACTIVE_BRAND_HEADER,
  readStoredActiveBrandId,
  resolveClientActiveBrandId,
  writeStoredActiveBrandId,
} from "@/features/brands/lib/active-brand";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";
import { buildLoginHref } from "@/features/auth/lib/login-redirect";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

const AUTH_ME_SNAPSHOT_KEY = "ugc:auth-me-snapshot";
const AUTH_USER_ID_KEY = "ugc:current-user-id";

export function persistAuthMeSnapshot(user: AuthUser | null): void {
  try {
    if (!user) {
      sessionStorage.removeItem(AUTH_ME_SNAPSHOT_KEY);
      sessionStorage.removeItem(AUTH_USER_ID_KEY);
      return;
    }
    sessionStorage.setItem(AUTH_ME_SNAPSHOT_KEY, JSON.stringify(user));
    sessionStorage.setItem(AUTH_USER_ID_KEY, user.id);
    const active = resolveClientActiveBrandId(user);
    if (active) {
      writeStoredActiveBrandId(user.id, active);
    }
  } catch {
    // ignore
  }
}

const api = axios.create({
  // In the browser, hit the frontend's own origin so requests go through the
  // Next BFF rewrite (`/api/*` → backend) and the auth cookie stays
  // first-party — required for in-app browsers / Safari ITP. On the server
  // (SSR) there is no same origin to proxy through, so call the API directly.
  baseURL: typeof window === "undefined" ? env.apiUrl : "",
  withCredentials: true,
});

type ConfigWithRetry = InternalAxiosRequestConfig & { _retry?: boolean };

function authPathMatches(url: string, path: string) {
  return url.includes(path);
}

function shouldSkipRefreshOn401(url: string) {
  return (
    authPathMatches(url, ENDPOINTS.AUTH.LOGIN) ||
    authPathMatches(url, ENDPOINTS.AUTH.REGISTER) ||
    authPathMatches(url, ENDPOINTS.AUTH.REFRESH) ||
    authPathMatches(url, ENDPOINTS.AUTH.LOGOUT)
  );
}

function isPublicBrowsingPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname === "/signup") return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/creators/")) return true;
  if (pathname.startsWith("/wishlists/share/")) return true;
  return false;
}

function notifySessionExpiredAndGoToLogin() {
  if (
    typeof window === "undefined" ||
    isPublicBrowsingPath(window.location.pathname)
  ) {
    return;
  }
  toast.error("Session expired", {
    id: "session-expired",
    description: "Please log in again.",
  });
  const currentPath = window.location.pathname + window.location.search;
  window.location.href = buildLoginHref(currentPath);
}

let refreshPromise: Promise<void> | null = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post(ENDPOINTS.AUTH.REFRESH)
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

if (typeof window !== "undefined") {
  api.interceptors.request.use((config) => {
    try {
      const userId = sessionStorage.getItem(AUTH_USER_ID_KEY);
      let brandId: string | null = null;
      const meRaw = sessionStorage.getItem(AUTH_ME_SNAPSHOT_KEY);
      if (meRaw) {
        brandId = resolveClientActiveBrandId(JSON.parse(meRaw) as AuthUser);
      } else if (userId) {
        brandId = readStoredActiveBrandId(userId);
      }
      if (brandId) {
        config.headers = config.headers ?? {};
        config.headers[ACTIVE_BRAND_HEADER] = brandId;
      }
    } catch {
      // ignore
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as ConfigWithRetry | undefined;
      const status = error.response?.status;
      const url = originalRequest?.url ?? "";

      if (status !== 401 || !originalRequest) {
        return Promise.reject(error);
      }

      if (shouldSkipRefreshOn401(url)) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        if (!authPathMatches(url, ENDPOINTS.AUTH.ME)) {
          notifySessionExpiredAndGoToLogin();
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await refreshSession();
        return api(originalRequest);
      } catch {
        const isMe = authPathMatches(
          originalRequest.url ?? "",
          ENDPOINTS.AUTH.ME,
        );
        if (!isMe) {
          notifySessionExpiredAndGoToLogin();
        }
        return Promise.reject(error);
      }
    },
  );
}

export default api;
