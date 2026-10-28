import { OrderAutoAcceptService } from './order-auto-accept.service';
import type { OrdersService } from './orders.service';

/**
 * The sweep itself holds no business rules — it finds due orders and hands each
 * to the claim. What it must get right is the things a backlog breaks: never
 * looping on a row it cannot accept, never letting one failure strand the rest,
 * and never selecting an order whose clock is not running.
 */
describe('OrderAutoAcceptService', () => {
  function makeService(pages: Array<Array<{ id: string }>>) {
    const findMany = jest.fn();
    for (const page of pages) findMany.mockResolvedValueOnce(page);
    findMany.mockResolvedValue([]);

    const prisma = { order: { findMany } };
    const autoAcceptDueOrder = jest.fn().mockResolvedValue(true);
    const orders = { autoAcceptDueOrder } as unknown as OrdersService;

    return {
      service: new OrderAutoAcceptService(prisma as never, orders),
      findMany,
      autoAcceptDueOrder,
    };
  }

  const fullPage = Array.from({ length: 25 }, (_, i) => ({ id: `o-${i}` }));

  it('accepts every due order it finds', async () => {
    const { service, autoAcceptDueOrder } = makeService([
      [{ id: 'o-1' }, { id: 'o-2' }],
    ]);

    await service.acceptOverdueOrders();

    expect(autoAcceptDueOrder).toHaveBeenCalledTimes(2);
    expect(autoAcceptDueOrder).toHaveBeenCalledWith('o-1');
    expect(autoAcceptDueOrder).toHaveBeenCalledWith('o-2');
  });

  it('only selects orders with a clock running and nothing accepted yet', async () => {
    const { service, findMany } = makeService([[]]);

    await service.acceptOverdueOrders();

    const calls = findMany.mock.calls as Array<
      [{ where: Record<string, unknown>; orderBy: unknown }]
    >;
    const { where, orderBy } = calls[0][0];
    expect(where.acceptedAt).toBeNull();
    expect(where.status).toEqual({
      in: ['DELIVERED', 'REVISION_SUBMITTED'],
    });
    expect((where.autoAcceptAt as { lte: Date }).lte).toBeInstanceOf(Date);
    // Oldest deadline first: a backlog clears in the order it aged.
    expect(orderBy).toEqual({ autoAcceptAt: 'asc' });
  });

  it('keeps going when one order throws', async () => {
    const { service, autoAcceptDueOrder } = makeService([
      [{ id: 'o-1' }, { id: 'o-2' }],
    ]);
    autoAcceptDueOrder.mockRejectedValueOnce(new Error('wallet down'));

    await expect(service.acceptOverdueOrders()).resolves.toBeUndefined();

    expect(autoAcceptDueOrder).toHaveBeenCalledWith('o-2');
  });

  /**
   * A claimed order clears its own `autoAcceptAt` and drops out of the query,
   * which is what makes paging work without a cursor. A row that threw keeps
   * its deadline, so an unconditional next page would hand back the same
   * failures until the per-run bound stopped it.
   */
  it('stops rather than re-reading a full page it could not accept', async () => {
    const { service, findMany, autoAcceptDueOrder } = makeService([
      fullPage,
      fullPage,
    ]);
    autoAcceptDueOrder.mockResolvedValue(false);

    await service.acceptOverdueOrders();

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(autoAcceptDueOrder).toHaveBeenCalledTimes(25);
  });

  it('pages on while it is making progress', async () => {
    const { service, findMany } = makeService([fullPage, [{ id: 'last' }]]);

    await service.acceptOverdueOrders();

    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('does not overlap itself within one process', async () => {
    // No queued pages: the one-shot implementation below must be what the
    // first call hits, not a pre-queued resolved value.
    const { service, findMany } = makeService([]);
    let release!: () => void;
    findMany.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve([]))),
    );

    const first = service.acceptOverdueOrders();
    await service.acceptOverdueOrders(); // returns immediately, guard is up
    release();
    await first;

    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('releases the guard after a failed run', async () => {
    const { service, findMany } = makeService([]);
    findMany.mockRejectedValueOnce(new Error('db gone'));

    await expect(service.acceptOverdueOrders()).rejects.toThrow('db gone');
    await service.acceptOverdueOrders();

    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
