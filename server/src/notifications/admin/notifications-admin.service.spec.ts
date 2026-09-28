import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NotificationsAdminService } from './notifications-admin.service';
import { TemplateValidatorService } from '../rendering/template-validator.service';

const EVENT = 'order-content-delivered-for-brand';
/** Has a stillRelevant check, so delayed rows are allowed. */
const DELAYABLE = 'order-brief-submitted-for-creator';

function build(overrides: { supportsDelay?: boolean; eventKey?: string } = {}) {
  const tx = {
    notificationSchedule: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    notificationTemplateVersion: { create: jest.fn().mockResolvedValue({}) },
    notificationTemplate: {
      update: jest.fn().mockResolvedValue({ id: 't1', version: 2 }),
    },
  };

  const prisma = {
    notificationEvent: {
      findUnique: jest.fn().mockResolvedValue({
        key: overrides.eventKey ?? EVENT,
        label: 'x',
        supportsDelay: overrides.supportsDelay ?? false,
        vars: {},
        schedule: [],
        recipient: 'BRAND',
        isActive: true,
        deprecated: false,
        alwaysSend: false,
        emailTemplateId: null,
        whatsappTemplateName: null,
        emailTemplate: null,
      }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ key: overrides.eventKey ?? EVENT }]),
      update: jest.fn().mockResolvedValue({}),
    },
    notificationTemplate: {
      findUnique: jest.fn().mockResolvedValue({
        id: 't1',
        name: EVENT,
        description: null,
        subjectHbs: 'old',
        htmlHbs: '<p>old</p>',
        textHbs: null,
        referencedVars: [],
        isActive: true,
        version: 1,
        updatedAt: new Date(),
        updatedByUserId: null,
      }),
      create: jest.fn().mockResolvedValue({ id: 't2', version: 1 }),
    },
    notificationLog: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: (t: unknown) => unknown) =>
      Promise.resolve(fn(tx)),
    ),
  };

  const queues = { enqueueStep: jest.fn().mockResolvedValue(undefined) };
  const renderer = { invalidate: jest.fn(), render: jest.fn() };

  const sweeps = {
    preview: jest.fn().mockResolvedValue({ scanned: 0, wouldSend: 0 }),
    sweep: jest
      .fn()
      .mockResolvedValue({ scanned: 0, enqueued: 0, superseded: 0 }),
  };

  const service = new NotificationsAdminService(
    prisma as never,
    new TemplateValidatorService(),
    renderer as never,
    queues as never,
    sweeps as never,
  );

  return { service, prisma, tx, queues, renderer, sweeps };
}

describe('replaceSchedule', () => {
  const rows = (offsets: number[]) =>
    offsets.map((offsetMinutes) => ({
      offsetMinutes,
      channels: [NotificationChannel.EMAIL],
    }));

  it('refuses a delayed row on an event with no relevance check', async () => {
    const { service } = build({ supportsDelay: false });

    // Without a check, "+24h you haven't accepted the brief" would go to
    // someone who accepted an hour ago. Refused, not warned about.
    await expect(
      service.replaceSchedule(EVENT, { rows: rows([0, 1440]) }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('allows an immediate row on any event', async () => {
    const { service, tx } = build({ supportsDelay: false });

    await service.replaceSchedule(EVENT, { rows: rows([0]) });
    expect(tx.notificationSchedule.createMany).toHaveBeenCalled();
  });

  it('allows delayed rows when the event can say it is still relevant', async () => {
    const { service, tx } = build({ supportsDelay: true, eventKey: DELAYABLE });

    await service.replaceSchedule(DELAYABLE, {
      rows: rows([0, 30, 1440, 10080]),
    });

    expect(tx.notificationSchedule.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ offsetMinutes: 10080 }),
        ]) as unknown,
      }),
    );
  });

  it('rejects two rows sharing an offset', async () => {
    const { service } = build({ supportsDelay: true });

    await expect(
      service.replaceSchedule(EVENT, { rows: rows([1440, 1440]) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces the set in one transaction, so re-timing cannot collide', async () => {
    const { service, prisma, tx } = build({ supportsDelay: true });

    await service.replaceSchedule(EVENT, { rows: rows([0, 2880]) });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Delete-then-create inside one transaction means there is never a moment
    // where the old 24h row and the new 48h row both exist.
    expect(tx.notificationSchedule.deleteMany).toHaveBeenCalled();
  });

  it('accepts an empty schedule as turning every send off', async () => {
    const { service, tx } = build();

    await service.replaceSchedule(EVENT, { rows: [] });

    expect(tx.notificationSchedule.deleteMany).toHaveBeenCalled();
    expect(tx.notificationSchedule.createMany).not.toHaveBeenCalled();
  });
});

describe('saveTemplate', () => {
  it('refuses to save a template referencing a variable the event lacks', async () => {
    const { service } = build();

    await expect(
      service.saveTemplate(
        {
          name: EVENT,
          subjectHbs: 'Hi {{nonsense}}',
          htmlHbs: '<p>x</p>',
        },
        'admin-1',
        't1',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('snapshots the previous content and bumps the version', async () => {
    const { service, tx, renderer } = build();

    await service.saveTemplate(
      {
        name: EVENT,
        subjectHbs: 'Delivered: {{packageName}}',
        htmlHbs: '<p>Hi {{recipientName}}</p>',
        note: 'tightened the copy',
      },
      'admin-1',
      't1',
    );

    // The old content is kept so a bad edit is one click from undo.
    expect(tx.notificationTemplateVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 1,
          subjectHbs: 'old',
        }) as unknown,
      }),
    );
    expect(tx.notificationTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: { increment: 1 } }) as unknown,
      }),
    );
    // The compiled cache is keyed by version, so the edit is live immediately.
    expect(renderer.invalidate).toHaveBeenCalled();
  });

  it('stores the variables the template actually references', async () => {
    const { service, tx } = build();

    await service.saveTemplate(
      {
        name: EVENT,
        subjectHbs: 'Delivered',
        htmlHbs: '<p>{{recipientName}} / {{packageName}}</p>',
      },
      'admin-1',
      't1',
    );

    expect(tx.notificationTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referencedVars: ['packageName', 'recipientName'],
        }) as unknown,
      }),
    );
  });
});

describe('backfill', () => {
  it('reports the count without enqueueing on a dry run', async () => {
    const { service, prisma, queues } = build();
    prisma.notificationEvent.findUnique.mockResolvedValue({
      schedule: [
        { offsetMinutes: 10080, channels: [NotificationChannel.EMAIL] },
      ],
    });
    prisma.notificationLog.findMany.mockResolvedValue([
      { entityId: 'ord_1', occurrenceKey: 'ord_1', queuedAt: new Date() },
      { entityId: 'ord_2', occurrenceKey: 'ord_2', queuedAt: new Date() },
    ]);

    await expect(
      service.backfill(EVENT, { offsetMinutes: 10080, dryRun: true }),
    ).resolves.toEqual({ matched: 2, enqueued: 0 });
    expect(queues.enqueueStep).not.toHaveBeenCalled();
  });

  it('measures the delay from when the event happened, not from now', async () => {
    const { service, prisma, queues } = build();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    prisma.notificationEvent.findUnique.mockResolvedValue({
      schedule: [
        { offsetMinutes: 10080, channels: [NotificationChannel.EMAIL] },
      ],
    });
    prisma.notificationLog.findMany.mockResolvedValue([
      { entityId: 'ord_1', occurrenceKey: 'ord_1', queuedAt: threeDaysAgo },
    ]);

    await service.backfill(EVENT, { offsetMinutes: 10080 });

    // A 7-day row on a 3-day-old order must fire in 4 days, not 7.
    expect(queues.enqueueStep).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: threeDaysAgo.toISOString() }),
    );
  });

  it('refuses to backfill a row that does not exist', async () => {
    const { service, prisma } = build();
    prisma.notificationEvent.findUnique.mockResolvedValue({ schedule: [] });

    await expect(
      service.backfill(EVENT, { offsetMinutes: 99 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('sweepPopulation', () => {
  it('previews without sending', async () => {
    const { service, sweeps } = build();

    await service.sweepPopulation('creator-profile-completion-reminder', true);

    // The admin sees the number before deciding; nothing is enqueued.
    expect(sweeps.preview).toHaveBeenCalled();
    expect(sweeps.sweep).not.toHaveBeenCalled();
  });

  it('sends when asked for real', async () => {
    const { service, sweeps } = build();

    await service.sweepPopulation('creator-profile-completion-reminder', false);

    expect(sweeps.sweep).toHaveBeenCalled();
  });

  it('refuses an event that is emitted when it happens', async () => {
    const { service } = build();

    // An order event has a moment to emit from, so there is nothing to sweep.
    await expect(
      service.sweepPopulation('order-content-delivered-for-brand', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
