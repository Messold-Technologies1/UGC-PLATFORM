export type AuthContinueSetupRole = "brand" | "creator";

export const AUTH_CONTINUE_SETUP_ROLE_PARAM = "setupRole";

export function parseAuthContinueSetupRole(
  value: string | null,
): AuthContinueSetupRole | null {
  if (value === "brand" || value === "creator") {
    return value;
  }
  return null;
}
