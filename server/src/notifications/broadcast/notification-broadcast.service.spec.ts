import {
  BroadcastAudience,
  BroadcastStatus,
  NotificationChannel,
} from '@prisma/client';
import { NotificationBroadcastService } from './notification-broadcast.service';

function build(opts: { pages?: string[][] } = {}) {
  const pages = opts.pages ?? [['c1', 'c2'], []];
  let call = 0;

  const created = {
    id: 'run-1',
    createdAt: new Date('2026-11-03T10:00:00Z'),
    startedAt: new Date('2026-11-03T10:00:00Z'),
  };

  const prisma = {
    creatorProfile: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockImplementation(() => {
        const page = pages[Math.min(call++, pages.length - 1)];
        return Promise.resolve(page.map((id) => ({ id })));
      }),
    },
    brandProfile: {
      count: jest.fn().mockResolvedValue(7),
      findMany: jest.fn(),
    },
    agency: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn() },
    notificationEvent: {
      findUnique: jest.fn().mockResolvedValue({ isActive: true }),
    },
    notificationBroadcast: {
      create: jest.fn().mockResolvedValue(created),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ ...created, ...data }),
        ),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const queues = { enqueueStep: jest.fn().mockResolvedValue(undefined) };
  const service = new NotificationBroadcastService(
    prisma as never,
    queues as never,
  );
  return { service, prisma, queues };
}

const input = {
  audience: BroadcastAudience.CREATORS_WITH_OPEN_TO,
  channels: [
    NotificationChannel.EMAIL,
    NotificationChannel.WHATSAPP,
    NotificationChannel.PUSH,
  ],
  emailTemplateId: 'tpl-1',
  whatsappTemplateName: 'broadcast_creators_open_to',
};

describe('NotificationBroadcastService.send', () => {
  it('enqueues one job per profile in the audience', async () => {
    const { service, queues } = build();

    const run = await service.send(input);

    expect(queues.enqueueStep).toHaveBeenCalledTimes(2);
    expect(run.status).toBe(BroadcastStatus.COMPLETED);
    expect(run.enqueued).toBe(2);
  });

  it('uses the run id as the occurrence key, so the audience can be messaged again', async () => {
    const { service, queues } = build();

    await service.send(input);

    // The delivery log is unique on (event, entity, occurrence, recipient,
    // channel, offset). A fixed occurrence key would let this audience be
    // messaged exactly once, ever, and silently refuse every later
    // announcement as a duplicate.
    for (const [job] of queues.enqueueStep.mock.calls as Array<
      [{ occurrenceKey: string }]
    >) {
      expect(job.occurrenceKey).toBe('run-1');
    }
  });

  it('sends on the bulk lane, never the transactional one', async () => {
    const { service, queues } = build();

    await service.send(input);

    // A broadcast to every listed creator must not hold an order
    // confirmation behind its rate limiter.
    for (const call of queues.enqueueStep.mock.calls as Array<
      [unknown, string]
    >) {
      expect(call[1]).toBe('bulk');
    }
  });

  it('carries the run’s template, not the event’s', async () => {
    const { service, queues } = build();

    await service.send(input);

    const [job] = queues.enqueueStep.mock.calls[0] as [
      { templateOverrideId: string; whatsappTemplateOverride: string },
    ];
    expect(job.templateOverrideId).toBe('tpl-1');
    expect(job.whatsappTemplateOverride).toBe('broadcast_creators_open_to');
  });

  it('sends immediately — a broadcast has no delayed stage', async () => {
    const { service, queues } = build();

    await service.send(input);

    const [job] = queues.enqueueStep.mock.calls[0] as [
      { offsetMinutes: number },
    ];
    expect(job.offsetMinutes).toBe(0);
  });

  it('records what was already queued when the walk fails part-way', async () => {
    const { service, prisma, queues } = build({ pages: [['c1', 'c2']] });
    queues.enqueueStep
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('redis gone'));

    const run = await service.send(input);

    // Whatever reached the queue still sends, so the row has to say how far it
    // got rather than reading as if nothing happened.
    expect(run.status).toBe(BroadcastStatus.FAILED);
    expect(run.enqueued).toBe(1);
    expect(run.error).toContain('redis gone');
    expect(prisma.notificationBroadcast.update).toHaveBeenCalled();
  });

  it('writes a run row before walking, so a crash leaves a record', async () => {
    const { service, prisma } = build();

    await service.send(input);

    const [args] = prisma.notificationBroadcast.create.mock.calls[0] as [
      { data: { status: BroadcastStatus; matched: number } },
    ];
    expect(args.data.status).toBe(BroadcastStatus.SENDING);
    expect(args.data.matched).toBe(2);
  });
});

describe('NotificationBroadcastService.preview', () => {
  it('counts the audience without writing anything', async () => {
    const { service, prisma } = build();

    const out = await service.preview(BroadcastAudience.ACTIVE_BRANDS);

    expect(out.size).toBe(7);
    expect(prisma.notificationBroadcast.create).not.toHaveBeenCalled();
  });

  it('counts each audience through its own query', async () => {
    const { service } = build();

    expect(
      (await service.preview(BroadcastAudience.ACTIVE_AGENCIES)).size,
    ).toBe(3);
    expect(
      (await service.preview(BroadcastAudience.LISTED_CREATORS)).size,
    ).toBe(2);
  });
});

describe('NotificationBroadcastService.listAudiences', () => {
  it('describes every audience with its event key', async () => {
    const { service } = build();

    const list = await service.listAudiences();

    expect(list.map((a) => a.eventKey).sort()).toEqual([
      'broadcast-agencies',
      'broadcast-brands',
      'broadcast-creators-listed',
      'broadcast-creators-open-to',
      'broadcast-orders-awaiting-payment',
    ]);
  });

  it('reports whether each audience’s event is switched on', async () => {
    const { service, prisma } = build();
    prisma.notificationEvent.findUnique.mockResolvedValue({ isActive: false });

    const list = await service.listAudiences();

    // The UI says so up front rather than letting an admin press Send and
    // collect a refusal.
    expect(list.every((a) => a.isActive === false)).toBe(true);
  });

  it('treats an event with no registry row as not sendable', async () => {
    const { service, prisma } = build();
    prisma.notificationEvent.findUnique.mockResolvedValue(null);

    const list = await service.listAudiences();

    expect(list.every((a) => a.isActive === false)).toBe(true);
  });
});

describe('NotificationBroadcastService.send — the active gate', () => {
  it('refuses to send through an event that is switched off', async () => {
    const { service, prisma, queues } = build();
    prisma.notificationEvent.findUnique.mockResolvedValue({ isActive: false });

    // Otherwise every job reaches the worker, finds the event off and records
    // `event_inactive` — thousands of skip rows, and an admin told the
    // broadcast was queued while nothing was sent.
    await expect(service.send(input)).rejects.toThrow(/switched off/i);
    expect(queues.enqueueStep).not.toHaveBeenCalled();
    expect(prisma.notificationBroadcast.create).not.toHaveBeenCalled();
  });

  it('refuses when the event is not in the registry at all', async () => {
    const { service, prisma, queues } = build();
    prisma.notificationEvent.findUnique.mockResolvedValue(null);

    await expect(service.send(input)).rejects.toThrow(/event registry/i);
    expect(queues.enqueueStep).not.toHaveBeenCalled();
  });
});
