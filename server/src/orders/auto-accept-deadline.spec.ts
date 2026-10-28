import {
  DEFAULT_AUTO_ACCEPT_DAYS,
  computeAutoAcceptAt,
  resolveAutoAcceptDays,
} from './delivery-deadline.util';

/**
 * The anchor is the whole design decision, and both halves of it are easy to
 * lose in a refactor: anchoring to the due date alone silently robs a brand of
 * its review window on a late delivery, and anchoring to the delivery alone
 * silently closes an early one. Neither failure throws.
 */
describe('computeAutoAcceptAt', () => {
  const due = new Date('2026-03-10T09:00:00.000Z');

  it('counts from the due date when the creator delivered early', () => {
    const deliveredAt = new Date('2026-03-04T09:00:00.000Z');
    expect(
      computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt, days: 5 }),
    ).toEqual(new Date('2026-03-15T09:00:00.000Z'));
  });

  it('counts from the delivery when the creator delivered late', () => {
    const deliveredAt = new Date('2026-03-18T09:00:00.000Z');
    // Not 15 March: a late delivery must not eat into the brand's window.
    expect(
      computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt, days: 5 }),
    ).toEqual(new Date('2026-03-23T09:00:00.000Z'));
  });

  it('counts from the due date when delivery lands exactly on it', () => {
    expect(
      computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt: due, days: 5 }),
    ).toEqual(new Date('2026-03-15T09:00:00.000Z'));
  });

  it('falls back to the delivery on orders with no due date recorded', () => {
    const deliveredAt = new Date('2026-03-04T09:00:00.000Z');
    expect(
      computeAutoAcceptAt({ deliveryDueAt: null, deliveredAt, days: 5 }),
    ).toEqual(new Date('2026-03-09T09:00:00.000Z'));
  });

  it('returns null when nothing has been delivered', () => {
    expect(
      computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt: null, days: 5 }),
    ).toBeNull();
  });

  it('crosses a month boundary by calendar days, not by 30-day arithmetic', () => {
    const deliveredAt = new Date('2026-02-26T09:00:00.000Z');
    expect(
      computeAutoAcceptAt({ deliveryDueAt: null, deliveredAt, days: 5 }),
    ).toEqual(new Date('2026-03-03T09:00:00.000Z'));
  });

  it('defaults to the documented five days', () => {
    expect(DEFAULT_AUTO_ACCEPT_DAYS).toBe(5);
  });

  /**
   * A fractional window exists so the whole flow can be watched in one sitting
   * on test. `setDate` truncates, so it has to be added as elapsed time or an
   * ORDER_AUTO_ACCEPT_DAYS of 0.01 would mean no window at all.
   */
  it('honours a fractional window instead of truncating it away', () => {
    const deliveredAt = new Date('2026-03-04T09:00:00.000Z');
    expect(
      computeAutoAcceptAt({ deliveryDueAt: null, deliveredAt, days: 0.5 }),
    ).toEqual(new Date('2026-03-04T21:00:00.000Z'));
  });
});

/**
 * The window is env-driven so it can be shortened on test. Every unreadable
 * value falls back to the default rather than disabling the deadline: a typo
 * must not quietly strand every order in DELIVERED again, which is the bug the
 * deadline exists to fix.
 */
describe('resolveAutoAcceptDays', () => {
  it('reads a configured number of days', () => {
    expect(resolveAutoAcceptDays('7')).toBe(7);
    expect(resolveAutoAcceptDays(7)).toBe(7);
  });

  it('allows a fractional window for testing', () => {
    expect(resolveAutoAcceptDays('0.01')).toBeCloseTo(0.01);
  });

  it('tolerates surrounding whitespace from a pasted value', () => {
    expect(resolveAutoAcceptDays(' 3 ')).toBe(3);
  });

  it.each([undefined, '', '   ', 'soon', '0', '-1', 'NaN'])(
    'falls back to the default for %p',
    (raw) => {
      expect(resolveAutoAcceptDays(raw)).toBe(DEFAULT_AUTO_ACCEPT_DAYS);
    },
  );
});
