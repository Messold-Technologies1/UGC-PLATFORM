export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REGISTER_CREATOR: "/api/auth/register/creator",
    REGISTER_BRAND: "/api/auth/register/brand",
    REGISTER_ADMIN: "/api/auth/register-admin",
    GOOGLE: "/api/auth/google",
    GOOGLE_CALLBACK: "/api/auth/google/callback",
    PHONE_SEND_OTP: "/api/auth/phone/send-otp",
    PHONE_VERIFY_OTP: "/api/auth/phone/verify-otp",
    SIGNUP_PHONE_SEND_OTP: "/api/auth/signup/phone/send-otp",
    SIGNUP_CREATOR_PORTFOLIO_VIDEO_PRESIGN:
      "/api/auth/signup/presign/creator-portfolio-video",
    SIGNUP_BRAND_LOGO_PRESIGN: "/api/auth/signup/presign/brand-logo",
    SIGNUP_BRAND_PRONUNCIATION_PRESIGN:
      "/api/auth/signup/presign/brand-pronunciation",
    REFRESH: "/api/auth/refresh",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    CHANGE_PASSWORD: "/api/auth/password",
    ME: "/api/auth/me",
    LOGOUT: "/api/auth/logout",
  },
  CREATORS: {
    LIST: "/api/creators",
    PROFILE: "/api/creators/profile",
    PROFILE_ME: "/api/creators/profile/me",
    PROFILE_PAYOUT_DETAILS: "/api/creators/profile/me/payout-details",
    PROFILE_IMAGE_PRESIGN:
      "/api/creators/profile/uploads/presign-profile-image",
    PROFILE_INTRO_VIDEO_PRESIGN:
      "/api/creators/profile/uploads/presign-intro-video",
    FACET_OPTIONS: "/api/creators/facet-options",
    ADD_ON_OPTIONS: "/api/creators/add-on-options",
    SUGGESTIONS_CATEGORIES: "/api/creators/suggestions/categories",
    SUGGESTIONS_PERSONA_TAGS: "/api/creators/suggestions/persona-tags",
    SUGGESTIONS_RESTRICTIONS: "/api/creators/suggestions/restrictions",
    RATING_REVIEWS: (id: string) =>
      `/api/creators/${encodeURIComponent(id)}/rating-reviews`,
    PUBLIC_PROFILE: (slug: string) =>
      `/api/creators/public/${encodeURIComponent(slug)}`,
  },
  BRANDS: {
    PROFILE: "/api/brands/profile",
    PROFILE_ME: "/api/brands/profile/me",
    PROFILE_LOGO_PRESIGN: "/api/brands/profile/uploads/presign",
    PROFILE_PRONUNCIATION_PRESIGN:
      "/api/brands/profile/uploads/presign-pronunciation",
    PROFILE_BRAND_CATEGORY_OPTIONS:
      "/api/brands/profile/brand-category-options",
  },
  AGENCY: {
    PROFILE: "/api/agency/profile",
    PROFILE_ME: "/api/agency/profile/me",
    PROFILE_LOGO_PRESIGN: "/api/agency/profile/uploads/presign",
    CONTACT_PHONE_SEND_OTP: "/api/agency/profile/contact-phone/send-otp",
    BRANDS: "/api/agency/brands",
    BRANDS_SWITCH: "/api/agency/brands/switch",
  },
  BRIEFS: {
    LIST: "/api/briefs",
    FIELD_OPTIONS: "/api/briefs/field-options",
    PRODUCT_IMAGE_PRESIGN: "/api/briefs/uploads/presign-product-image",
    DETAIL: (id: string) => `/api/briefs/${encodeURIComponent(id)}`,
  },
  ORDERS: {
    BRAND_LIST: "/api/orders/brand",
    BRAND_DETAIL: (id: string) => `/api/orders/brand/${encodeURIComponent(id)}`,
    BRAND_DELIVERIES: (id: string) =>
      `/api/orders/brand/${encodeURIComponent(id)}/deliveries`,
    CREATOR_LIST: "/api/orders/creator",
    CREATOR_DELIVERIES: "/api/orders/creator/deliveries",
    CREATOR_DETAIL: (id: string) =>
      `/api/orders/creator/${encodeURIComponent(id)}`,
    CHECKOUT: "/api/orders/checkout",
    RESUME_CHECKOUT: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/resume-checkout`,
    GET_BRIEF: (id: string) => `/api/orders/${encodeURIComponent(id)}/brief`,
    SUBMIT_BRIEF: (id: string) => `/api/orders/${encodeURIComponent(id)}/brief`,
    ACCEPT_BRIEF: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/brief/accept`,
    PRODUCT_SHIPMENT: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/product-shipment`,
    PRODUCT_RECEIVED: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/product-received`,
    CHAT_MESSAGES: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/chat/messages`,
    CHAT_MESSAGES_VOICE_PRESIGN: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/chat/messages/presign-voice`,
    CHAT_MESSAGES_VOICE: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/chat/messages/voice`,
    CHAT_READ: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/chat/read`,
    CHAT_STATE: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/chat/state`,
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
    RATING_REVIEW: (id: string) =>
      `/api/orders/${encodeURIComponent(id)}/rating-review`,
  },
  WISHLISTS: {
    LIST: "/api/wishlists",
    CREATE: "/api/wishlists",
    DETAIL: (id: string) => `/api/wishlists/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/api/wishlists/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/api/wishlists/${encodeURIComponent(id)}`,
    ADD_CREATOR: (id: string) => `/api/wishlists/${encodeURIComponent(id)}/creators`,
    REMOVE_CREATOR: (wishlistId: string, creatorId: string) =>
      `/api/wishlists/${encodeURIComponent(wishlistId)}/creators/${encodeURIComponent(creatorId)}`,
    TOGGLE_SHARE: (id: string) => `/api/wishlists/${encodeURIComponent(id)}/share`,
    SHARE: (id: string) => `/api/wishlists/${encodeURIComponent(id)}/share`,
    UNSHARE: (id: string) => `/api/wishlists/${encodeURIComponent(id)}/share`,
    PUBLIC: (shareToken: string) => `/api/wishlists/public/${encodeURIComponent(shareToken)}`,
    IMPORT_SHARED: (shareToken: string) =>
      `/api/wishlists/public/${encodeURIComponent(shareToken)}/import`,
  },
  CHATS: {
    CREATOR: "/api/chats/creator",
    BRAND: "/api/chats/brand",
    MESSAGES: (orderId: string) =>
      `/api/chats/${encodeURIComponent(orderId)}/messages`,
  },
  CREATOR_PORTFOLIO: {
    UPLOADS_PRESIGN: "/api/creator-portfolio/uploads/presign",
    VIDEOS: "/api/creator-portfolio/videos",
    VIDEOS_ME: "/api/creator-portfolio/videos/me",
    VIDEOS_ADMIN: "/api/creator-portfolio/videos/admin",
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
    ORDERS: {
      LIST: "/api/admin/orders",
      DETAIL: (id: string) => `/api/admin/orders/${encodeURIComponent(id)}`,
      CHAT_MESSAGES: (id: string) =>
        `/api/admin/orders/${encodeURIComponent(id)}/chat/messages`,
      CHAT_STATE: (id: string) =>
        `/api/admin/orders/${encodeURIComponent(id)}/chat/state`,
      MARK_CREATOR_PAID: (id: string) =>
        `/api/admin/orders/${encodeURIComponent(id)}/mark-creator-paid`,
      REJECT: (id: string) =>
        `/api/admin/orders/${encodeURIComponent(id)}/reject`,
      REFUND: (id: string) =>
        `/api/admin/orders/${encodeURIComponent(id)}/refund`,
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

export function creatorsByPublicSlugPath(slug: string): string {
  return `/api/creators/public/${encodeURIComponent(slug)}`;
}

export function suggestedCreatorsPath(id: string): string {
  return `/api/creators/${encodeURIComponent(id)}/suggested`;
}
