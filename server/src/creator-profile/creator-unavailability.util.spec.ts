import {
  formatDateOnly,
  isDateWithinInclusiveRange,
  mapUnavailabilityToPublicAvailability,
  parseDateOnly,
  todayDateOnlyUtc,
} from './creator-unavailability.util';

describe('creator-unavailability.util', () => {
  it('parses and formats ISO date-only values', () => {
    const parsed = parseDateOnly('2026-08-10');
    expect(parsed).not.toBeNull();
    expect(formatDateOnly(parsed!)).toBe('2026-08-10');
  });

  it('rejects invalid calendar dates', () => {
    expect(parseDateOnly('2026-02-31')).toBeNull();
    expect(parseDateOnly('08/10/2026')).toBeNull();
  });

  it('treats missing schedule as available', () => {
    expect(mapUnavailabilityToPublicAvailability(null)).toEqual({
      available: true,
      startsOn: null,
      endsOn: null,
    });
  });

  it('marks future schedules as available until startsOn', () => {
    const today = todayDateOnlyUtc();
    const startsOn = new Date(today);
    startsOn.setUTCDate(startsOn.getUTCDate() + 3);
    const endsOn = new Date(today);
    endsOn.setUTCDate(endsOn.getUTCDate() + 10);

    const result = mapUnavailabilityToPublicAvailability({ startsOn, endsOn });
    expect(result.available).toBe(true);
    expect(result.startsOn).toBe(formatDateOnly(startsOn));
    expect(result.endsOn).toBe(formatDateOnly(endsOn));
  });

  it('marks active ranges as unavailable', () => {
    const today = todayDateOnlyUtc();
    const startsOn = new Date(today);
    startsOn.setUTCDate(startsOn.getUTCDate() - 1);
    const endsOn = new Date(today);
    endsOn.setUTCDate(endsOn.getUTCDate() + 2);

    expect(
      isDateWithinInclusiveRange(today, startsOn, endsOn),
    ).toBe(true);
    expect(mapUnavailabilityToPublicAvailability({ startsOn, endsOn }).available).toBe(
      false,
    );
  });
});
