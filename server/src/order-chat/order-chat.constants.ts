/** Max voice message upload size (10 MB — fits ~5 min at typical voice bitrates). */
export const ORDER_CHAT_VOICE_MAX_BYTES = 10 * 1024 * 1024;

/** Max recorded voice duration (5 minutes). */
export const ORDER_CHAT_VOICE_MAX_DURATION_MS = 5 * 60 * 1000; // 300_000