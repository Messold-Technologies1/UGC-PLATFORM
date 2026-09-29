import { NotificationTemplateImportService } from './template-import.service';

type Tx = {
  $executeRaw: jest.Mock;
  notificationTemplate: { findUnique: jest.Mock; upsert: jest.Mock };
  notificationEvent: { findUnique: jest.Mock; update: jest.Mock };
  notificationSchedule: { findUnique: jest.Mock; create: jest.Mock };
};

function makeTx(overrides: Partial<Tx> = {}): Tx {
  let seq = 0;
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    notificationTemplate: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(() => ({ id: `tpl_${++seq}` })),
    },
    notificationEvent: {
      findUnique: jest.fn().mockResolvedValue({ emailTemplateId: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    notificationSchedule: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function makeService(tx: Tx) {
  const prisma = {
    $transaction: jest.fn((fn: (t: Tx) => unknown) => fn(tx)),
  };
  return {
    service: new NotificationTemplateImportService(prisma as never),
    prisma,
  };
}

describe('NotificationTemplateImportService', () => {
  it('imports every bundled template and seeds the event rows', async () => {
    const tx = makeTx();
    const { service } = makeService(tx);

    const result = await service.run();

    // 32 keys with the two drips split into 4 and 3 stages.
    expect(result.templates).toBe(37);
    expect(tx.notificationTemplate.upsert).toHaveBeenCalledTimes(37);
    expect(result.schedules).toBeGreaterThan(0);
  });

  it('takes an advisory lock before writing anything', async () => {
    const tx = makeTx();
    const { service } = makeService(tx);

    await service.run();

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    // The lock has to come first, or two booting processes race on the same
    // unique names and one dies with P2002.
    const lockOrder = tx.$executeRaw.mock.invocationCallOrder[0];
    const firstWrite =
      tx.notificationTemplate.upsert.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(firstWrite);
  });

  it('never overwrites a template an admin has edited', async () => {
    const tx = makeTx();
    tx.notificationTemplate.findUnique.mockResolvedValue({
      id: 'tpl_admin',
      updatedByUserId: 'user_1',
    });
    const { service } = makeService(tx);

    const result = await service.run();

    expect(tx.notificationTemplate.upsert).not.toHaveBeenCalled();
    expect(result.templates).toBe(0);
  });

  it('refreshes an untouched template so a new .hbs reaches the database', async () => {
    const tx = makeTx();
    tx.notificationTemplate.findUnique.mockResolvedValue({
      id: 'tpl_1',
      updatedByUserId: null,
    });
    const { service } = makeService(tx);

    await service.run();

    expect(tx.notificationTemplate.upsert).toHaveBeenCalledTimes(37);
  });

  it('leaves an event that already points somewhere alone', async () => {
    const tx = makeTx();
    tx.notificationEvent.findUnique.mockResolvedValue({
      emailTemplateId: 'tpl_chosen_by_admin',
    });
    const { service } = makeService(tx);

    const result = await service.run();

    expect(tx.notificationEvent.update).not.toHaveBeenCalled();
    expect(result.linked).toBe(0);
  });

  it('skips an event the registry sync has not created yet', async () => {
    const tx = makeTx();
    tx.notificationEvent.findUnique.mockResolvedValue(null);
    const { service } = makeService(tx);

    const result = await service.run();

    expect(result.linked).toBe(0);
    expect(tx.notificationSchedule.create).not.toHaveBeenCalled();
  });

  it('does not duplicate a schedule row that already exists', async () => {
    const tx = makeTx();
    tx.notificationSchedule.findUnique.mockResolvedValue({ id: 'sched_1' });
    const { service } = makeService(tx);

    const result = await service.run();

    expect(tx.notificationSchedule.create).not.toHaveBeenCalled();
    expect(result.schedules).toBe(0);
  });

  it('raises the transaction timeout above the 5s interactive default', async () => {
    const tx = makeTx();
    const { service, prisma } = makeService(tx);

    await service.run();

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 120_000 }),
    );
  });
});
