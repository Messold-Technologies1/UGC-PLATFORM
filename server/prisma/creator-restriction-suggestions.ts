/**
 * Canonical creator "Open to" labels (seed + backfill) — the sensitive
 * categories a creator can opt into.
 */
export const CREATOR_RESTRICTION_SUGGESTIONS = [
  'Gambling',
  'Lingerie',
  'Intimacy / Adult',
  'Dating / Dating Apps',
  'Night Clubs',
] as const;

/** Legacy labels — removed from the catalog (deleted or migrated). */
export const DEPRECATED_CREATOR_RESTRICTION_SUGGESTIONS = [
  'gambling / betting',
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
] as const;

/**
 * Old labels mapped to the current catalog entry. "Gambling / Betting" and
 * "Intimate wear / lingerie" were both shown next to the shorter label they
 * duplicate, so the short one wins and the pair is collapsed; note that this
 * reverses the earlier direction for gambling, which used to canonicalize the
 * other way.
 */
export const CREATOR_RESTRICTION_LEGACY_MIGRATIONS: Record<string, string> = {
  'accepts intimate wear / lingerie': 'Lingerie',
  'intimate wear / lingerie': 'Lingerie',
  'accepts gambling': 'Gambling',
  'gambling / betting': 'Gambling',
};

export function normalizeRestrictionSuggestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
