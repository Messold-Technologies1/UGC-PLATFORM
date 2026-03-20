export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login/normal",
    SIGNUP: "/api/auth/signup",
    GOOGLE: "/api/auth/google?context=userLogin",
    ME: "/api/auth/me",
    LOGOUT: "/api/auth/logout",
  },
} as const;
