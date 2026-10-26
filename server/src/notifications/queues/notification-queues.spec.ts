import {
  eventJobId,
  stepDelayMs,
  stepJobId,
  type EventJobData,
  type StepJobData,
} from './notification-queues';

const base: EventJobData = {
  eventKey: 'order-brief-submitted-for-creator',
  entityId: 'ord_1',
  occurrenceKey: 'ord_1',
  occurredAt: '2026-09-28T10:00:00.000Z',
};

describe('notification queue identity', () => {
  it('gives the same event the same job id, so a repeat emit is refused', () => {
    expect(eventJobId(base)).toBe(eventJobId({ ...base }));
  });

  it('separates repeat occurrences of one event on one entity', () => {
    // Revision 2 must not be swallowed as a duplicate of revision 1.
    expect(eventJobId({ ...base, occurrenceKey: '1' })).not.toBe(
      eventJobId({ ...base, occurrenceKey: '2' }),
    );
  });

  it('separates the rows of one sequence', () => {
    const step: StepJobData = { ...base, offsetMinutes: 0, channels: [] };
    expect(stepJobId(step)).not.toBe(
      stepJobId({ ...step, offsetMinutes: 1440 }),
    );
  });

  /**
   * BullMQ throws 'Custom Id cannot contain :' from Queue.add, and emit()
   * only logs what it throws — so a colon anywhere in a key dropped the
   * notification without failing the request. Both the agency-link events
   * and the creator resubmit drip shipped with one.
   */
  describe('ids BullMQ will accept', () => {
    const withColons = {
      ...base,
      entityId: 'a38ca5dd-fead-491a-a14a-2accd52a0aaf',
      occurrenceKey: '2026-10-26T10:36:05.699Z',
    };

    it('never emits a colon, whatever the caller passed', () => {
      expect(eventJobId(withColons)).not.toContain(':');
      expect(
        stepJobId({ ...withColons, offsetMinutes: 1440, channels: [] }),
      ).not.toContain(':');
    });

    it('leaves an already-safe key untouched', () => {
      // Events that work today must keep the ids they already have, or every
      // queued job is suddenly a different one.
      expect(eventJobId(base)).toBe(
        'nev-order-brief-submitted-for-creator-ord_1-ord_1',
      );
    });

    it('still tells two unsafe keys apart', () => {
      // The whole point of the key: a second withdraw must not be swallowed
      // as a duplicate of the first.
      expect(eventJobId(withColons)).not.toBe(
        eventJobId({
          ...withColons,
          occurrenceKey: '2026-10-26T10:36:06.699Z',
        }),
      );
    });

    it('is deterministic for an unsafe key', () => {
      expect(eventJobId(withColons)).toBe(eventJobId({ ...withColons }));
    });
  });
});

describe('stepDelayMs', () => {
  const occurred = new Date('2026-09-28T10:00:00.000Z');
  const at = (iso: string) => new Date(iso).getTime();

  it('is immediate for a zero offset', () => {
    expect(stepDelayMs(0, occurred, at('2026-09-28T10:00:00.000Z'))).toBe(0);
  });

  it('measures from the event, not from enqueue time', () => {
    // Enqueued 10 minutes late: a +30m row is still due 20 minutes from now,
    // not 30 — otherwise a backlog pushes the whole drip out.
    expect(stepDelayMs(30, occurred, at('2026-09-28T10:10:00.000Z'))).toBe(
      20 * 60_000,
    );
  });

  it('fires immediately when the offset has already passed', () => {
    // A row recovered by the backstop long after it was due must not be
    // scheduled into the past.
    expect(stepDelayMs(30, occurred, at('2026-09-29T10:00:00.000Z'))).toBe(0);
  });

  it('handles the longest offsets the admin can configure', () => {
    expect(stepDelayMs(20160, occurred, occurred.getTime())).toBe(
      14 * 24 * 60 * 60_000,
    );
  });
});
