import { isAxiosError } from "axios";

/**
 * The server's own wording, when it has any.
 *
 * Every refusal here is something the creator can act on — the daily ceiling,
 * a profile that is not live yet — so a generic "something went wrong" would
 * throw away the only useful part of the response. class-validator returns an
 * array of messages; Nest's own exceptions return a string.
 */
export function eventErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) return message.join(", ");
  }
  return fallback;
}
