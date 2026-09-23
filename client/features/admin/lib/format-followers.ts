/**
 * Compact follower counts for the admin creator list.
 *
 * An admin scanning rows wants the magnitude, not the exact figure — and the
 * exact figure would push every other column along. The full number is put on
 * the cell's title attribute instead.
 *
 * Rounds down rather than up at every step, so a creator is never shown as
 * having crossed a threshold they have not: 9,999 reads "9,999" and not "10K",
 * and 1,999,999 reads "1.9M" and not "2.0M".
 */
export function formatFollowers(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "—";

  if (count >= 10_000_000) return `${Math.floor(count / 1_000_000)}M`;
  if (count >= 1_000_000) return `${(Math.floor(count / 100_000) / 10).toFixed(1)}M`;
  if (count >= 10_000) return `${Math.floor(count / 1_000)}K`;
  if (count >= 1_000) return `${(Math.floor(count / 100) / 10).toFixed(1)}K`;

  return count.toLocaleString();
}
