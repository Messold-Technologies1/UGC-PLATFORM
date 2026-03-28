export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    GOOGLE: "/api/auth/google",
    GOOGLE_CALLBACK: "/api/auth/google/callback",
    REFRESH: "/api/auth/refresh",
    ME: "/api/auth/me",
    WORKSPACE: "/api/auth/workspace",
    LOGOUT: "/api/auth/logout",
  },
  CREATORS: {
    LIST: "/api/creators",
    PROFILE: "/api/creators/profile",
    PROFILE_IMAGE_PRESIGN: "/api/creators/profile/uploads/presign",
  },
} as const;

export function creatorsByIdPath(id: string): string {
  return `/api/creators/${encodeURIComponent(id)}`;
}
