/**
 * Mirrors CREATOR_EVENT_MAX_LENGTH on the server. The server is the authority;
 * this is here so the counter can go red before a post is rejected.
 */
export const CREATOR_EVENT_MAX_LENGTH = 500;

/** Mirrors CREATOR_EVENT_DAILY_LIMIT. Shown as "x of 10 today". */
export const CREATOR_EVENT_DAILY_LIMIT = 10;

/**
 * Mirrors the @MaxLength(200) on HideCreatorEventDto.reason. The creator
 * reads this text on their own card, so the limit keeps it to a line.
 */
export const CREATOR_EVENT_HIDE_REASON_MAX_LENGTH = 200;
