import {
  DELIVERY_GRACE_DAYS,
  REVISION_DELIVERY_DAYS,
  computeAutoAcceptAt,
  computeDeliveryDeadlines,
  computeRevisionDeadlines,
} from './delivery-deadline.util';

/**
 * A revision restarts the creator's clock.
 *
 * Before this, the due date was written once at brief acceptance and never
 * moved, so any order that went through a revision was permanently "late" —
 * late by exactly the time the brand spent reviewing and the creator spent
 * waiting, neither of which the creator controls.
 */
describe('revision deadlines', () => {
  const at = (iso: string) => new Date(`${iso}T10:00:00.000Z`);
  const dayOf = (d: Date) => d.toISOString().slice(0, 10);

  it(`adds ${REVISION_DELIVERY_DAYS} days to the due date`, () => {
    const { deliveryDueAt } = computeRevisionDeadlines(at('2026-11-09'));
    expect(dayOf(deliveryDueAt)).toBe('2026-11-11');
  });

  it(`keeps the grace window at ${DELIVERY_GRACE_DAYS} days past the new due date`, () => {
    const { deliveryGraceDeadlineAt } = computeRevisionDeadlines(
      at('2026-11-09'),
    );
    expect(dayOf(deliveryGraceDeadlineAt)).toBe('2026-11-13');
  });

  /**
   * The point of the whole change: counted from the request, not added to the
   * old date. Adding to a due date the brand's review time has already carried
   * into the past would hand the creator a deadline that expired before they
   * were told about it.
   */
  it('counts from the revision request, not from the original due date', () => {
    // 5-day package accepted 1 Nov -> due 6 Nov. Brand asks for changes 9 Nov.
    const original = computeDeliveryDeadlines(at('2026-11-01'), 5);
    expect(dayOf(original.deliveryDueAt)).toBe('2026-11-06');

    const revised = computeRevisionDeadlines(at('2026-11-09'));

    expect(dayOf(revised.deliveryDueAt)).toBe('2026-11-11');
    // Not 8 Nov, which is what extending the original due date would give.
    expect(revised.deliveryDueAt.getTime()).toBeGreaterThan(
      original.deliveryDueAt.getTime(),
    );
    expect(revised.deliveryDueAt.getTime()).toBeGreaterThan(
      at('2026-11-09').getTime(),
    );
  });

  it('gives every revision its own window', () => {
    const first = computeRevisionDeadlines(at('2026-11-09'));
    const second = computeRevisionDeadlines(at('2026-11-14'));

    expect(dayOf(first.deliveryDueAt)).toBe('2026-11-11');
    expect(dayOf(second.deliveryDueAt)).toBe('2026-11-16');
  });

  describe('auto-accept follows the extended due date', () => {
    const AUTO_ACCEPT_DAYS = 5;

    it('anchors to the new due date when the creator resubmits early', () => {
      const { deliveryDueAt } = computeRevisionDeadlines(at('2026-11-09'));

      const autoAcceptAt = computeAutoAcceptAt({
        deliveryDueAt,
        deliveredAt: at('2026-11-10'), // resubmitted a day early
        days: AUTO_ACCEPT_DAYS,
      });

      // 11 Nov is later than the resubmission, so it wins the anchor.
      expect(dayOf(autoAcceptAt!)).toBe('2026-11-16');
    });

    it('anchors to the resubmission when that is later', () => {
      const { deliveryDueAt } = computeRevisionDeadlines(at('2026-11-09'));

      const autoAcceptAt = computeAutoAcceptAt({
        deliveryDueAt,
        deliveredAt: at('2026-11-13'), // two days late
        days: AUTO_ACCEPT_DAYS,
      });

      expect(dayOf(autoAcceptAt!)).toBe('2026-11-18');
    });
  });
});
