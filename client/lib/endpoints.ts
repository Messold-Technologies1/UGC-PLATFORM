export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REGISTER_ADMIN: "/api/auth/register-admin",
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
    PROFILE_ME: "/api/creators/profile/me",
    PROFILE_IMAGE_PRESIGN: "/api/creators/profile/uploads/presign",
    SUGGESTIONS_CATEGORIES: "/api/creators/suggestions/categories",
    SUGGESTIONS_PERSONA_TAGS: "/api/creators/suggestions/persona-tags",
    SUGGESTIONS_RESTRICTIONS: "/api/creators/suggestions/restrictions",
  },
  BRANDS: {
    PROFILE: "/api/brands/profile",
    PROFILE_ME: "/api/brands/profile/me",
    PROFILE_LOGO_PRESIGN: "/api/brands/profile/uploads/presign",
  },
  ORDERS: {
    CHECKOUT: "/api/orders/checkout",
    BRAND_DISPUTE: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/disputes/brand`,
  },
  CREATOR_PORTFOLIO: {
    UPLOADS_PRESIGN: "/api/creator-portfolio/uploads/presign",
    VIDEOS: "/api/creator-portfolio/videos",
    VIDEOS_ME: "/api/creator-portfolio/videos/me",
    SUGGESTIONS_INDUSTRIES: "/api/creator-portfolio/suggestions/industries",
    SUGGESTIONS_TAGS: "/api/creator-portfolio/suggestions/tags",
    SUGGESTIONS_LANGUAGES: "/api/creator-portfolio/suggestions/languages",
  },
  ADMIN: {
    CREATORS: {
      PENDING_APPROVALS: "/api/admin/creators/pending-approvals",
      APPROVE: (id: string) => `/api/admin/creators/${encodeURIComponent(id)}/approve`,
      REJECT: (id: string) => `/api/admin/creators/${encodeURIComponent(id)}/reject`,
    },
    BRANDS: {
      LIST: "/api/admin/brands",
      REMOVE: (userId: string) =>
        `/api/admin/brands/user/${encodeURIComponent(userId)}/role`,
    },
  }
} as const;

export function creatorPortfolioVideoPath(id: string): string {
  return `/api/creator-portfolio/videos/${encodeURIComponent(id)}`;
}

export function creatorPortfolioPublicVideosPath(creatorId: string): string {
  return `/api/creator-portfolio/creators/${encodeURIComponent(creatorId)}/videos`;
}

export function creatorsByIdPath(id: string): string {
  return `/api/creators/${encodeURIComponent(id)}`;
}
