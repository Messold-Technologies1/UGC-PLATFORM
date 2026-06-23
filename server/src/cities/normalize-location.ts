/**
 * Canonical normalization for location lookups. Must stay identical to the
 * normalization used when seeding `aliasesNormalized` (prisma/seed-cities.ts):
 * trim, lowercase, and collapse internal whitespace.
 */
export function normalizeLocationName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
