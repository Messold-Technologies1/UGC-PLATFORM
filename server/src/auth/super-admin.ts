/** Only these accounts can open admin Settings and create other admins. */
export const SUPER_ADMIN_EMAILS = [
  'anuj@messold.com',
  'bipasha.roy@messold.com',
] as const;

const SUPER_ADMIN_EMAIL_SET = new Set<string>(SUPER_ADMIN_EMAILS);

export function isSuperAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}
