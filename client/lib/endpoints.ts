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
    SUGGESTIONS_PERSONA_TAGS: "/api/creators/suggestions/persona-tags",
    SUGGESTIONS_RESTRICTIONS: "/api/creators/suggestions/restrictions",
  },
  CREATOR_PORTFOLIO: {
    UPLOADS_PRESIGN: "/api/creator-portfolio/uploads/presign",
    VIDEOS: "/api/creator-portfolio/videos",
    VIDEOS_ME: "/api/creator-portfolio/videos/me",
    SUGGESTIONS_INDUSTRIES: "/api/creator-portfolio/suggestions/industries",
    SUGGESTIONS_TAGS: "/api/creator-portfolio/suggestions/tags",
    SUGGESTIONS_LANGUAGES: "/api/creator-portfolio/suggestions/languages",
  },
} as const;

export function creatorPortfolioVideoPath(id: string): string {
  return `/api/creator-portfolio/videos/${encodeURIComponent(id)}`;
}

export function creatorsByIdPath(id: string): string {
  return `/api/creators/${encodeURIComponent(id)}`;
}
