import { isAxiosError } from "axios";

/**
 * What a failed OTP send/verify told us, in the shape the UI needs.
 *
 * The server already answers a cooldown with both the exact copy
 * ("Please wait 19s before requesting another code.") and the machine-readable
 * `retryAfterSeconds`. Both were being thrown away in favour of a generic
 * "Too many attempts" toast, which left the user guessing how long to wait and
 * the resend button unlocked while the server was still refusing.
 */
export type PhoneOtpErrorInfo = {
  /** Copy to show the user — the server's own message whenever it sent one. */
  message: string;
  /** Seconds until a resend is allowed, when the server said so. */
  retryAfterSeconds?: number;
};

/**
 * Messages the API returns deliberately blank — they exist so the response
 * leaks nothing (the duplicate-number check), or come from the generic
 * throttler and name an internal class. Neither helps the user, so the
 * caller's own copy wins.
 */
function isOpaqueMessage(message: string): boolean {
  return message === "Invalid request." || /throttler/i.test(message);
}

function readBodyMessage(data: unknown): string | undefined {
  if (typeof data === "string") return data.trim() || undefined;
  if (!data || typeof data !== "object") return undefined;

  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") return message.trim() || undefined;
  if (Array.isArray(message)) {
    return message.find(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
  }
  return undefined;
}

function positiveSeconds(value: unknown): number | undefined {
  const seconds = typeof value === "string" ? Number(value) : value;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return Math.ceil(seconds);
}

function readRetryAfterSeconds(
  data: unknown,
  headers: unknown,
): number | undefined {
  const fromBody =
    data && typeof data === "object"
      ? positiveSeconds((data as { retryAfterSeconds?: unknown }).retryAfterSeconds)
      : undefined;
  if (fromBody !== undefined) return fromBody;

  // Standard HTTP spelling, in case a proxy or a future handler sets it.
  const header =
    headers && typeof headers === "object"
      ? (headers as Record<string, unknown>)["retry-after"]
      : undefined;
  return positiveSeconds(header);
}

/**
 * Turn an OTP send/verify failure into the message to show and, for a 429, how
 * long the caller must actually wait.
 */
export function readPhoneOtpError(
  error: unknown,
  fallback: string,
): PhoneOtpErrorInfo {
  if (!isAxiosError(error)) return { message: fallback };

  const status = error.response?.status;
  const retryAfterSeconds = readRetryAfterSeconds(
    error.response?.data,
    error.response?.headers,
  );
  const serverMessage = readBodyMessage(error.response?.data);

  if (serverMessage && !isOpaqueMessage(serverMessage)) {
    return { message: serverMessage, retryAfterSeconds };
  }

  if (status === 429) {
    return {
      message: retryAfterSeconds
        ? `Please wait ${retryAfterSeconds}s before requesting another code.`
        : "Too many code requests. Please wait a while before trying again.",
      retryAfterSeconds,
    };
  }

  if (status === 503) {
    return { message: "Phone verification is temporarily unavailable." };
  }

  return { message: fallback, retryAfterSeconds };
}
