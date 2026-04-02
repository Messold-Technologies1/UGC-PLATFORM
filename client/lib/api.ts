import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { ENDPOINTS } from "@/lib/endpoints";

const api = axios.create({
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
  window.location.href = "/login";
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
