import { OrdersService } from './orders.service';

/**
 * listOrdersForAdmin must derive the status-tab counts from an aggregate over
 * the whole dataset (groupBy), never from the paginated page — otherwise a tab
 * badge undercounts once there are more orders than one page holds.
 */
describe('OrdersService.listOrdersForAdmin', () => {
  function makeService() {
    const count = jest.fn().mockResolvedValue(15);
    const findMany = jest.fn().mockResolvedValue([]); // empty page → no mapping
    const groupBy = jest.fn().mockResolvedValue([
      { status: 'CREATOR_PAYMENT_DONE', _count: 12 },
      { status: 'ACCEPTED', _count: 3 },
      { status: 'DELIVERED', _count: 7 },
    ]);
    const prisma = {
      $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
        Promise.all(ops),
      ),
      order: { count, findMany, groupBy },
    };
    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, count, findMany, groupBy };
  }

  it('returns per-status counts from the aggregate, independent of the page', async () => {
    const { service, groupBy } = makeService();

    const res = await service.listOrdersForAdmin({ page: 1, limit: 2 });

    expect(res.statusCounts).toEqual({
      CREATOR_PAYMENT_DONE: 12,
      ACCEPTED: 3,
      DELIVERED: 7,
    });
    // The badge count is a groupBy over the base scope, not the page.
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['status'], _count: true }),
    );
  });

  it('applies the status filter to the list + total but not to the counts', async () => {
    const { service, count, findMany, groupBy } = makeService();

    await service.listOrdersForAdmin({
      statuses: ['ACCEPTED', 'CREATOR_PAYMENT_DONE'] as never,
      page: 1,
      limit: 20,
    });

    // List and its total are filtered by the active tab's statuses.
    const listWhere = { status: { in: ['ACCEPTED', 'CREATOR_PAYMENT_DONE'] } };
    expect(count).toHaveBeenCalledWith({ where: listWhere });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: listWhere }),
    );
    // The badge aggregate ignores the status filter (where is the base scope).
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('scopes counts to a single brand when brandId is given', async () => {
    const { service, groupBy } = makeService();

    await service.listOrdersForAdmin({ brandId: 'brand-1' });

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { brandId: 'brand-1' } }),
    );
  });
});
