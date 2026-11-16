/**
 * Longest a post may be, after trimming.
 *
 * Kept in step with the `body` column's VARCHAR width — raising this without
 * the matching migration fails at insert, not at validation.
 */
export const CREATOR_EVENT_MAX_LENGTH = 1000;

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
