/**
 * The identity band at the top of a feed card is tinted by the creator's
 * primary niche, so a column of text posts has some rhythm to it.
 *
 * Derived on the client from `categories[0]` — nothing is stored, and a niche
 * that isn't in this list falls back to the neutral surface rather than
 * picking an arbitrary colour. Values are the gc-tint-* tokens from
 * globals.css; the `ink` shades are the ones that clear 4.5:1 on their band.
 */
export interface NicheTint {
  band: string;
  /** Readable body text on the band. */
  ink: string;
  /** Solid pill behind the niche label, with white text. */
  pill: string;
}

const NEUTRAL: NicheTint = {
  band: "var(--color-gc-surface)",
  ink: "var(--color-gc-ink-muted)",
  pill: "var(--color-gc-ink-soft)",
};

const TINTS: Record<string, NicheTint> = {
  rose: { band: "#ffe3ea", ink: "#8e0d32", pill: "#c9283f" },
  sky: { band: "#e1edfd", ink: "#19488f", pill: "#1f5fc2" },
  violet: { band: "#ede4fd", ink: "#58299f", pill: "#6b34c4" },
  mint: { band: "#ddf5e8", ink: "#0b5c35", pill: "#0e7a46" },
  amber: { band: "#ffebd6", ink: "#8a4d12", pill: "#a85f17" },
};

const ORDER = ["rose", "sky", "violet", "mint", "amber"] as const;

/**
 * Same niche, same colour, every time and for every viewer — a hash of the
 * label rather than the row's position, which would repaint on every page.
 */
export function nicheTint(category: string | undefined | null): NicheTint {
  const label = category?.trim().toLowerCase();
  if (!label) return NEUTRAL;

  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) % 100_000;
  }
  return TINTS[ORDER[hash % ORDER.length]];
}
