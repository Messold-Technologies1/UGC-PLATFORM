import { withOrderInboxActivityOnUpdate } from './order-chat-order-snapshot';

describe('withOrderInboxActivityOnUpdate', () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds lastChatActivityAt when order has no chat messages', async () => {
    prisma.order.findUnique.mockResolvedValue({ lastChatMessageId: null });

    const result = await withOrderInboxActivityOnUpdate(prisma, {
      where: { id: 'order-1' },
      data: { status: 'DELIVERED' },
    });

    expect(result.data).toMatchObject({
      status: 'DELIVERED',
      lastChatActivityAt: expect.any(Date),
    });
  });

  it('does not override when order already has a last chat message', async () => {
    prisma.order.findUnique.mockResolvedValue({ lastChatMessageId: 'msg-1' });

    const result = await withOrderInboxActivityOnUpdate(prisma, {
      where: { id: 'order-1' },
      data: { status: 'DELIVERED' },
    });

    expect(result.data).toEqual({ status: 'DELIVERED' });
  });
});
