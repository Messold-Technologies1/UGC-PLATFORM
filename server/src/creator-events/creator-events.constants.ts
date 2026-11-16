/** Longest a post may be, after trimming. About four lines on a feed card. */
export const CREATOR_EVENT_MAX_LENGTH = 500;

/**
 * Posts one creator may publish in a rolling 24 hours.
 *
 * The ThrottlerGuard on the controller is per-IP, which stops a script but not
 * a creator posting all day from one browser. This is the per-creator ceiling
 * that actually keeps the feed readable.
 */
export const CREATOR_EVENT_DAILY_LIMIT = 10;

/** Default and maximum page size for both the creator list and the feed. */
export const CREATOR_EVENT_PAGE_SIZE = 20;
export const CREATOR_EVENT_MAX_PAGE_SIZE = 50;
