import {
  AUTO_ACCEPT_DAYS,
  computeAutoAcceptAt,
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
    expect(computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt })).toEqual(
      new Date('2026-03-15T09:00:00.000Z'),
    );
  });

  it('counts from the delivery when the creator delivered late', () => {
    const deliveredAt = new Date('2026-03-18T09:00:00.000Z');
    // Not 15 March: a late delivery must not eat into the brand's window.
    expect(computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt })).toEqual(
      new Date('2026-03-23T09:00:00.000Z'),
    );
  });

  it('counts from the due date when delivery lands exactly on it', () => {
    expect(
      computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt: due }),
    ).toEqual(new Date('2026-03-15T09:00:00.000Z'));
  });

  it('falls back to the delivery on orders with no due date recorded', () => {
    const deliveredAt = new Date('2026-03-04T09:00:00.000Z');
    expect(computeAutoAcceptAt({ deliveryDueAt: null, deliveredAt })).toEqual(
      new Date('2026-03-09T09:00:00.000Z'),
    );
  });

  it('returns null when nothing has been delivered', () => {
    expect(
      computeAutoAcceptAt({ deliveryDueAt: due, deliveredAt: null }),
    ).toBeNull();
  });

  it('crosses a month boundary by calendar days, not by 30-day arithmetic', () => {
    const deliveredAt = new Date('2026-02-26T09:00:00.000Z');
    expect(computeAutoAcceptAt({ deliveryDueAt: null, deliveredAt })).toEqual(
      new Date('2026-03-03T09:00:00.000Z'),
    );
  });

  it('is the documented five days', () => {
    expect(AUTO_ACCEPT_DAYS).toBe(5);
  });
});
