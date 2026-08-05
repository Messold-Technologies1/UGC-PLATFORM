/**
 * Brand outbound mail recipient resolution.
 * Prefer BrandProfile.contactEmail when set; otherwise the account (User) email.
 */
export function resolveBrandMailAddress(params: {
  contactEmail?: string | null;
  accountEmail?: string | null;
}): string | null {
  return params.contactEmail?.trim() || params.accountEmail?.trim() || null;
}

export function resolveBrandMailDisplayName(params: {
  contactFullName?: string | null;
  brandName?: string | null;
  accountName?: string | null;
  fallback?: string;
}): string {
  return (
    params.contactFullName?.trim() ||
    params.brandName?.trim() ||
    params.accountName?.trim() ||
    params.fallback ||
    'there'
  );
}
