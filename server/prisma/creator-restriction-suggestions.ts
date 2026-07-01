/** Canonical creator content-preference labels (seed + backfill). */
export const CREATOR_RESTRICTION_SUGGESTIONS = [
  'swimwear / beachwear',
  'intimate wear / lingerie',
  'alcohol',
  'gambling',
] as const;

/** Legacy labels — removed from the catalog (deleted or migrated). */
export const DEPRECATED_CREATOR_RESTRICTION_SUGGESTIONS = [
  'does not accept lingerie',
  'does not accept alcohol',
  'does not accept gambling',
  'accept alcohol',
  'accept gambling',
  'accepts swimwear / beachwear',
  'accepts intimate wear / lingerie',
  'accepts alcohol',
  'accepts gambling',
] as const;

/** Old "accepts …" labels mapped to the current catalog entry. */
export const CREATOR_RESTRICTION_LEGACY_MIGRATIONS: Record<string, string> = {
  'accepts swimwear / beachwear': 'swimwear / beachwear',
  'accepts intimate wear / lingerie': 'intimate wear / lingerie',
  'accepts alcohol': 'alcohol',
  'accepts gambling': 'gambling',
};

export function normalizeRestrictionSuggestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
