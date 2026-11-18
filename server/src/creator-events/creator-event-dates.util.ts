import { BadRequestException } from '@nestjs/common';
import {
  formatDateOnly,
  parseDateOnly,
  todayDateOnlyUtc,
} from '../creator-profile/creator-unavailability.util';

export interface EventDateRange {
  startsOn: Date | null;
  endsOn: Date | null;
}

/**
 * Validates the optional range on a post and returns it as @db.Date values.
 *
 * A missing field means "no date", not "leave what is stored alone": an edit
 * replaces the whole post, dates included, exactly as it replaces the body.
 * That is what lets a creator clear a date by emptying the field — the form
 * always sends both, so an absent one really is a cleared one.
 *
 * It does mean a caller that sends only `body` wipes any stored dates. Both
 * clients send the full set; a future partial-update caller would need to
 * read the row first, or this function would need a third state.
 */
export function resolveEventDates(input: {
  startsOn?: string | null;
  endsOn?: string | null;
}): EventDateRange {
  const startsOn = input.startsOn
    ? parseDate(input.startsOn, 'startsOn')
    : null;
  const endsOn = input.endsOn ? parseDate(input.endsOn, 'endsOn') : null;

  // A range that ends before it starts is a typo, not a preference. Caught
  // here rather than at the column, which has no opinion about it.
  if (startsOn && endsOn && endsOn.getTime() < startsOn.getTime()) {
    throw new BadRequestException(
      'The end date cannot be before the start date.',
    );
  }

  return { startsOn, endsOn };
}

function parseDate(value: string, field: string): Date {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    throw new BadRequestException(`${field} must be a real YYYY-MM-DD date.`);
  }
  return parsed;
}

/**
 * The feed's expiry rule, as a Prisma filter.
 *
 * A post is past only once `endsOn` is strictly before today, so one ending
 * today is still shown all of today. A post with no end date never expires.
 *
 * "Today" is the UTC calendar date, matching CreatorUnavailability. For an
 * India-based audience that means a post lingers until 05:30 IST the morning
 * after it ends — the forgiving direction, and the one that never makes a
 * post vanish while the creator can still see it listed as current.
 */
export function notExpiredFilter(now = new Date()) {
  return {
    OR: [{ endsOn: null }, { endsOn: { gte: todayDateOnlyUtc(now) } }],
  };
}

/** Whether a stored post has already finished, for the creator's own list. */
export function hasEnded(endsOn: Date | null, now = new Date()): boolean {
  if (!endsOn) return false;
  return endsOn.getTime() < todayDateOnlyUtc(now).getTime();
}

export { formatDateOnly };
