import { OrderStatus } from '@prisma/client';

/**
 * The five signals the browse order is decided on, strongest first.
 *
 * Read strictly, in this order: completed orders decide it, and nothing below
 * can make up for one. Only when two creators have the same number of orders
 * does the next line get a say, and so on down. A creator with one order is
 * ahead of a creator with none however many checkouts, carts, saves or views
 * the second one has — the funnel is a ladder, not a pot to be filled from any
 * direction.
 *
 * An order that completed also counted as a checkout on its way through, and
 * keeps that checkout: two creators level on orders are then separated by
 * everything else they drew, completed or not.
 *
 * The array is the single definition of the order — {@link compareSignals}
 * walks it, so adding a signal here is the whole change.
 */
export const RANK_SIGNAL_ORDER = [
  'completedOrders',
  'initiatedCheckouts',
  'addToCarts',
  'wishlistAdds',
  'profileViews',
] as const;

/** One of the five counts the order is read from. */
export type RankSignal = (typeof RANK_SIGNAL_ORDER)[number];

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
 * Where a new creator is placed, as a percentile of the established board.
 *
 * They are lent the counts of whoever sits a quarter of the way down, and then
 * ranked on those as if they were their own — so a newcomer enters the top
 * quarter rather than at the very top, and is still ordered among the other
 * newcomers by what little they have done.
 *
 * Expressed as a percentile rather than a slot count so it holds whether the
 * board has forty creators or four thousand: the next two reshuffles move them
 * on what they actually did with the position.
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
