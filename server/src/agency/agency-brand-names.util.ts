export const MAX_AGENCY_BRAND_NAME_LENGTH = 200;

export class AgencyBrandNameConstraintError extends Error {
  constructor() {
    super('too_long');
    this.name = 'AgencyBrandNameConstraintError';
  }
}

/** Append a brief brand name to the agency list (case-insensitive dedup). */
export function appendAgencyBrandName(
  existing: string[],
  brandName: string,
): string[] {
  const trimmed = brandName.trim();
  if (!trimmed) return existing;
  if (trimmed.length > MAX_AGENCY_BRAND_NAME_LENGTH) {
    throw new AgencyBrandNameConstraintError();
  }

  const lower = trimmed.toLowerCase();
  if (existing.some((n) => n.toLowerCase() === lower)) {
    return existing;
  }
  return [...existing, trimmed];
}
