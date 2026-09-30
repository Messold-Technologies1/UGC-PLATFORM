import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import {
  PhoneOtpRateLimitError,
  PhoneOtpSendError,
} from './phone-verification.service';

/**
 * Best-effort client IP for OTP rate limiting.
 *
 * Behind a proxy Express only sees the hop address, so prefer the leftmost
 * `X-Forwarded-For` entry. This feeds a rate-limit counter and is stored only
 * as a hash, so a spoofed header costs an attacker nothing more than the
 * per-number limits already cost them — those are the real ceiling.
 */
export function clientIpFrom(req: Request): string | undefined {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

/**
 * Translate the send failures into HTTP. A rate limit is a 429 (the client
 * already backs off on that); anything else is a 400 naming the problem, so the
 * user can fix the number rather than seeing a bare 500.
 */
export function toSendHttpException(err: unknown): HttpException {
  if (err instanceof PhoneOtpRateLimitError) {
    return new HttpException(
      { message: err.message, retryAfterSeconds: err.retryAfterSeconds },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (err instanceof PhoneOtpSendError) {
    return new HttpException(err.message, HttpStatus.BAD_REQUEST);
  }
  if (err instanceof HttpException) return err;
  return new HttpException(
    'Could not send the verification code. Please try again.',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
