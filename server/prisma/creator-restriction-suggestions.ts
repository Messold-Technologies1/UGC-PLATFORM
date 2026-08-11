/**
 * Canonical creator "Open to" labels (seed + backfill) — the sensitive
 * categories a creator can opt into.
 */
export const CREATOR_RESTRICTION_SUGGESTIONS = [
  'Gambling / Betting',
  'Lingerie',
  'Intimacy / Adult',
  'Dating / Dating Apps',
  'Night Clubs',
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
  'swimwear / beachwear',
  'intimate wear / lingerie',
  'alcohol',
  'gambling',
] as const;

/** Old "accepts …" labels mapped to the current catalog entry. */
export const CREATOR_RESTRICTION_LEGACY_MIGRATIONS: Record<string, string> = {
  'accepts intimate wear / lingerie': 'Lingerie',
  'intimate wear / lingerie': 'Lingerie',
  'accepts gambling': 'Gambling / Betting',
  gambling: 'Gambling / Betting',
};

export function normalizeRestrictionSuggestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
