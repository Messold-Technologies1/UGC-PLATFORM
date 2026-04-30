export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REGISTER_ADMIN: "/api/auth/register-admin",
    GOOGLE: "/api/auth/google",
    GOOGLE_CALLBACK: "/api/auth/google/callback",
    REFRESH: "/api/auth/refresh",
    ME: "/api/auth/me",
    LOGOUT: "/api/auth/logout",
  },
  CREATORS: {
    LIST: "/api/creators",
    PROFILE: "/api/creators/profile",
    PROFILE_ME: "/api/creators/profile/me",
    PROFILE_PAYOUT_DETAILS: "/api/creators/profile/me/payout-details",
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
    BRAND_LIST: "/api/orders/brand",
    BRAND_DETAIL: (id: string) => `/api/orders/brand/${encodeURIComponent(id)}`,
    BRAND_DELIVERIES: (id: string) =>
      `/api/orders/brand/${encodeURIComponent(id)}/deliveries`,
    CREATOR_LIST: "/api/orders/creator",
    CREATOR_DETAIL: (id: string) =>
      `/api/orders/creator/${encodeURIComponent(id)}`,
    CHECKOUT: "/api/orders/checkout",
    GET_BRIEF: (id: string) => `/api/orders/${encodeURIComponent(id)}/brief`,
    SUBMIT_BRIEF: (id: string) => `/api/orders/${encodeURIComponent(id)}/brief`,
    DELIVERY_UPLOADS_PRESIGN: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/deliveries/presign`,
    SUBMIT_DELIVERY: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/deliveries`,
    BRAND_DISPUTE: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/disputes/brand`,
    CREATOR_DISPUTE: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/disputes/creator`,
    ACCEPT: (id: string) => `/api/orders/${encodeURIComponent(id)}/accept`,
    REQUEST_REVISION: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/revisions/request`,
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
      APPROVE: (id: string) =>
        `/api/admin/creators/${encodeURIComponent(id)}/approve`,
      REJECT: (id: string) =>
        `/api/admin/creators/${encodeURIComponent(id)}/reject`,
    },
    BRANDS: {
      LIST: "/api/admin/brands",
      REMOVE: (userId: string) =>
        `/api/admin/brands/user/${encodeURIComponent(userId)}/role`,
    },
  },
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
