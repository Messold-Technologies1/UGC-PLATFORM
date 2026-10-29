import { OrderStatus } from '@prisma/client';

/**
 * What each thing a brand does is worth when the browse order is recomputed.
 *
 * The order of the weights is the order of the funnel, and the gaps between
 * them are the point: one completed order outranks four initiated checkouts,
 * which outrank ten add-to-carts, and so on down to a profile view. A creator
 * can still climb on soft signals alone — a hundred profile views is worth one
 * order — but they have to earn a lot of them.
 *
 * An order that completed also counted as a checkout and an add-to-cart on its
 * way through, and is deliberately paid for all three: getting further down the
 * funnel should be worth more than stopping short of it, not instead of it.
 */
export const RANK_WEIGHTS = {
  completedOrder: 100,
  initiatedCheckout: 25,
  addToCart: 10,
  wishlistAdd: 5,
  profileView: 1,
} as const;

/** The orders that count — the same pair the card's "orders completed" uses. */
export const RANK_COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.CREATOR_PAYMENT_DONE,
];

/**
 * How far back the ranking looks.
 *
 * Long enough that a quiet fortnight does not throw a good creator down the
 * board, short enough that a creator who has stopped delivering drifts down
 * rather than holding a lead they earned a year ago.
 */
export const RANK_WINDOW_DAYS = 90;

/**
 * A creator listed within this many days is treated as new.
 *
 * Without it the ranking cannot start: a new creator has none of the five
 * signals, lands last, is therefore seen by nobody, and so never earns any —
 * the position they were given is the reason they keep it.
 */
export const RANK_NEW_CREATOR_DAYS = 30;

/**
 * Where a new creator is placed, as a percentile of everyone else's score.
 *
 * Expressed as a percentile rather than a slot count so it holds whether the
 * board has forty creators or four thousand: they start in the top quarter,
 * with a real position among their peers, and the next two reshuffles move
 * them on what they actually did with it.
 */
export const RANK_NEW_CREATOR_PERCENTILE = 0.75;

/**
 * How long engagement days are kept.
 *
 * The ranking only reads the last {@link RANK_WINDOW_DAYS}; the rest is held a
 * while longer so a window can be widened, or a past reshuffle re-examined,
 * without the table growing without end.
 */
export const ENGAGEMENT_RETENTION_DAYS = 400;

/**
 * 04:00 UTC on the 1st and the 16th — a fortnightly cadence on dates that do
 * not drift, so "when does the board next move" has a calendar answer rather
 * than one that depends on when the server last restarted.
 */
export const BROWSE_RESHUFFLE_CRON = '0 4 1,16 * *';

/**
 * The next 04:00 UTC on the 1st or the 16th, strictly after `from`.
 *
 * Derived rather than stored: the cron expression is the single definition of
 * when the board moves, and anything that reads this agrees with it by
 * construction.
 */
export function nextReshuffleAt(from: Date): Date {
  const candidates = [1, 16].flatMap((dayOfMonth) => [
    new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), dayOfMonth, 4),
    ),
    new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, dayOfMonth, 4),
    ),
  ]);
  return candidates
    .filter((date) => date.getTime() > from.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];
}
