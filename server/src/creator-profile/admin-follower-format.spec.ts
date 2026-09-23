import { formatFollowers } from '../../../client/features/admin/lib/format-followers';

/**
 * The client has no test runner of its own, so client logic is covered from
 * here — the same arrangement as client-workspace-routing.spec.ts.
 */
describe('formatFollowers (admin creator list)', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1_000, '1.0K'],
    [1_250, '1.2K'],
    [9_999, '9.9K'],
    [10_000, '10K'],
    [12_400, '12K'],
    [999_999, '999K'],
    [1_000_000, '1.0M'],
    [2_300_000, '2.3M'],
    [9_999_999, '9.9M'],
    [10_000_000, '10M'],
    [45_800_000, '45M'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatFollowers(input)).toBe(expected);
  });

  it('never rounds a creator up across a threshold', () => {
    // Showing 9,999 as "10K" or 1,999,999 as "2.0M" overstates reach, which is
    // the number an admin is judging the creator on.
    expect(formatFollowers(9_999)).not.toBe('10K');
    expect(formatFollowers(1_999_999)).not.toBe('2.0M');
    expect(formatFollowers(1_999_999)).toBe('1.9M');
    expect(formatFollowers(999_999)).not.toBe('1.0M');
  });

  it('groups thousands below 1K so small counts stay readable', () => {
    expect(formatFollowers(999)).toBe('999');
  });

  it('returns a dash for values that are not a usable count', () => {
    expect(formatFollowers(Number.NaN)).toBe('—');
    expect(formatFollowers(-5)).toBe('—');
    expect(formatFollowers(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
