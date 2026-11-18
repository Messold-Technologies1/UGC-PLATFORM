import { BadRequestException } from '@nestjs/common';
import {
  hasEnded,
  notExpiredFilter,
  resolveEventDates,
} from './creator-event-dates.util';

/**
 * The expiry rule, which is the whole point of putting dates on a post: once
 * the thing has finished, it stops being something a brand should see.
 */
describe('creator event dates', () => {
  const noon = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  describe('resolveEventDates', () => {
    it('accepts a range and stores both ends as calendar dates', () => {
      const range = resolveEventDates({
        startsOn: '2026-11-20',
        endsOn: '2026-11-28',
      });
      expect(range.startsOn).toEqual(day('2026-11-20'));
      expect(range.endsOn).toEqual(day('2026-11-28'));
    });

    // Plenty of posts are about nothing dated — "set up a home studio". Making
    // a range mandatory would mean inventing one.
    it('accepts a post with no dates at all', () => {
      expect(resolveEventDates({})).toEqual({ startsOn: null, endsOn: null });
    });

    it.each([
      ['start only', { startsOn: '2026-11-20' }, 'startsOn'],
      ['end only', { endsOn: '2026-11-28' }, 'endsOn'],
    ])('accepts %s', (_label, input, field) => {
      const range = resolveEventDates(input);
      expect(range[field as 'startsOn' | 'endsOn']).not.toBeNull();
    });

    it('rejects an end before the start', () => {
      expect(() =>
        resolveEventDates({ startsOn: '2026-11-28', endsOn: '2026-11-20' }),
      ).toThrow(BadRequestException);
    });

    it('allows a single-day range', () => {
      expect(() =>
        resolveEventDates({ startsOn: '2026-11-20', endsOn: '2026-11-20' }),
      ).not.toThrow();
    });

    it('rejects a date that does not exist', () => {
      expect(() => resolveEventDates({ endsOn: '2026-02-30' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('hasEnded', () => {
    it('is false for a post with no end date', () => {
      expect(hasEnded(null, noon('2026-11-18'))).toBe(false);
    });

    // The boundary that matters: a post ending today is still running today.
    it('is false on the last day', () => {
      expect(hasEnded(day('2026-11-18'), noon('2026-11-18'))).toBe(false);
    });

    it('is true the day after', () => {
      expect(hasEnded(day('2026-11-18'), noon('2026-11-19'))).toBe(true);
    });

    it('is false before it starts running out', () => {
      expect(hasEnded(day('2026-11-28'), noon('2026-11-18'))).toBe(false);
    });
  });

  describe('notExpiredFilter', () => {
    it('keeps undated posts and anything ending today or later', () => {
      expect(notExpiredFilter(noon('2026-11-18'))).toEqual({
        OR: [{ endsOn: null }, { endsOn: { gte: day('2026-11-18') } }],
      });
    });

    // gte against midnight, not the current instant: a filter built from
    // `new Date()` would hide a post at noon on the day it ends.
    it('compares against midnight, not the moment of the request', () => {
      const filter = notExpiredFilter(noon('2026-11-18')) as {
        OR: [unknown, { endsOn: { gte: Date } }];
      };
      expect(filter.OR[1].endsOn.gte.getUTCHours()).toBe(0);
    });
  });
});
