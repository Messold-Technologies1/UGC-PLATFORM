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
