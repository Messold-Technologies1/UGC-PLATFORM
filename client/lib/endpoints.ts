export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    GOOGLE: "/api/auth/google",
    GOOGLE_CALLBACK: "/api/auth/google/callback",
    REFRESH: "/api/auth/refresh",
    ME: "/api/auth/me",
    LOGOUT: "/api/auth/logout",
  },
} as const;
