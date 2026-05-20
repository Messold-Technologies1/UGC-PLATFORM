export enum PublicSignupRole {
  CREATOR = 'creator',
  BRAND = 'brand',
  AGENCY = 'agency',
}

export function parsePublicSignupRole(
  value: string | undefined,
): PublicSignupRole | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  if (v === PublicSignupRole.CREATOR) return PublicSignupRole.CREATOR;
  if (v === PublicSignupRole.BRAND) return PublicSignupRole.BRAND;
  if (v === PublicSignupRole.AGENCY) return PublicSignupRole.AGENCY;
  return null;
}
