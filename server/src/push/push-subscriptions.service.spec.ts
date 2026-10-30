import { PushSubscriptionsService } from './push-subscriptions.service';

describe('PushSubscriptionsService', () => {
  const endpoint = 'https://push.example/abc';
  const dto = { endpoint, p256dh: 'key', auth: 'auth', userAgent: 'Firefox' };

  let prisma: {
    pushSubscription: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let service: PushSubscriptionsService;

  beforeEach(() => {
    prisma = {
      pushSubscription: {
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    service = new PushSubscriptionsService(prisma as never);
  });

  // A browser re-subscribing hands back the endpoint it already had. Insert
  // instead of upsert and every notification arrives on that device twice.
  it('upserts on the endpoint, so a re-subscribe cannot create a second row', async () => {
    await service.save('user-1', dto);

    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { endpoint } }),
    );
  });

  // Shared machine: whoever logged in last owns the browser. Without this the
  // previous account keeps receiving push on a device it no longer has.
  it('re-points an existing endpoint at the current user', async () => {
    await service.save('user-2', dto);

    const [call] = prisma.pushSubscription.upsert.mock.calls as [
      [{ update: { userId: string; failureCount: number } }],
    ];
    expect(call[0].update.userId).toBe('user-2');
    expect(call[0].update.failureCount).toBe(0);
  });

  // The endpoint travels in client code, so an unscoped delete would let
  // anyone holding one unsubscribe somebody else's device.
  it('scopes the delete to the caller, not to the endpoint alone', async () => {
    await service.remove('user-1', endpoint);

    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', endpoint },
    });
  });

  it('reports how many browsers the account now receives push on', async () => {
    prisma.pushSubscription.count.mockResolvedValue(3);

    await expect(service.save('user-1', dto)).resolves.toEqual({
      subscriptionCount: 3,
    });
  });
});
