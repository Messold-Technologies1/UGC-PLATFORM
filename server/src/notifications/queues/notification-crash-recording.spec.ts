import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@prisma/client';
import { NotificationQueueService } from './notification-queue.service';
import type { NotificationDispatchService } from '../dispatch/notification-dispatch.service';
import type { NotificationStepService } from '../dispatch/notification-step.service';
import type { NotificationLogService } from '../log/notification-log.service';
import type { EventJobData, StepJobData } from './notification-queues';

/**
 * What the delivery log is told when a job dies for good.
 *
 * The point of these is the shape of the *absence*: a step that throws before
 * resolving a recipient, and an event that throws before it can create any
 * step at all, both used to leave the log completely empty — and an admin
 * cannot tell an empty log from an event that was never fired.
 */
function makeService(opts: { plan?: jest.Mock }): {
  service: NotificationQueueService;
  recordCrash: jest.Mock;
  errors: string[];
} {
  const recordCrash = jest.fn().mockResolvedValue(undefined);
  const errors: string[] = [];

  const service = new NotificationQueueService(
    { get: () => undefined } as unknown as ConfigService,
    { plan: opts.plan ?? jest.fn() } as unknown as NotificationDispatchService,
    {} as unknown as NotificationStepService,
    { recordCrash } as unknown as NotificationLogService,
  );
  (service as unknown as { logger: { error: unknown; warn: unknown } }).logger =
    {
      error: (m: string) => errors.push(m),
      warn: (m: string) => errors.push(m),
    };

  return { service, recordCrash, errors };
}

const event: EventJobData = {
  eventKey: 'order-brief-submitted-for-creator',
  entityId: 'ord-1',
  occurrenceKey: 'ord-1',
  occurredAt: '2026-10-08T10:00:00.000Z',
};

const step = (offsetMinutes: number): StepJobData => ({
  ...event,
  offsetMinutes,
  channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
});

const callRecordDispatchCrash = (
  service: NotificationQueueService,
  err: Error,
) =>
  (
    service as unknown as {
      recordDispatchCrash: (
        id: string,
        d: EventJobData,
        e: Error,
      ) => Promise<void>;
    }
  ).recordDispatchCrash('nev-1', event, err);

describe('recording a dispatch crash', () => {
  it('records every send the schedule says the event owed', async () => {
    // The job itself has no offset or channels — fanning out is what it failed
    // at — so the schedule is the only thing that knows what was lost.
    const plan = jest.fn().mockResolvedValue([step(0), step(1440)]);
    const { service, recordCrash } = makeService({ plan });

    await callRecordDispatchCrash(service, new Error('db went away'));

    expect(recordCrash).toHaveBeenCalledTimes(2);

    const calls = recordCrash.mock.calls as unknown as Array<
      [StepJobData, Error]
    >;
    expect(calls.map(([step]) => step.offsetMinutes)).toEqual([0, 1440]);
    // The original dispatch error, not whatever the re-read returned.
    expect(calls[0][1].message).toBe('db went away');
  });

  it('says so plainly when the schedule cannot be read either', async () => {
    // If reading the schedule is the thing that was broken, there is nothing
    // to record — and guessing a row would be worse than an honest log line.
    const plan = jest.fn().mockRejectedValue(new Error('still down'));
    const { service, recordCrash, errors } = makeService({ plan });

    await callRecordDispatchCrash(service, new Error('db went away'));

    expect(recordCrash).not.toHaveBeenCalled();
    expect(errors.join(' ')).toContain('nothing could be');
  });

  it('records nothing for an event with no active schedule', async () => {
    // Inactive, deprecated, or every row switched off: no send was going to
    // happen, so an empty log is correct rather than a gap.
    const plan = jest.fn().mockResolvedValue([]);
    const { service, recordCrash, errors } = makeService({ plan });

    await callRecordDispatchCrash(service, new Error('db went away'));

    expect(recordCrash).not.toHaveBeenCalled();
    // Says which of the two silences this is, so "no rows" is not left
    // looking like the gap this whole change exists to close.
    expect(errors.join(' ')).toContain('no active schedule');
  });

  it('never lets a logging failure escape into the worker', async () => {
    const plan = jest.fn().mockResolvedValue([step(0)]);
    const { service, recordCrash } = makeService({ plan });
    recordCrash.mockRejectedValue(new Error('log write failed'));

    await expect(
      callRecordDispatchCrash(service, new Error('db went away')),
    ).resolves.toBeUndefined();
  });
});
