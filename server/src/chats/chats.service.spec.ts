import { NotFoundException } from '@nestjs/common';
import { OrderChatMessageType, OrderStatus } from '@prisma/client';
import { ChatsService } from './chats.service';

describe('ChatsService', () => {
  const prisma = {
    creatorProfile: { findUnique: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn() },
    orderChatMessage: { findMany: jest.fn(), count: jest.fn() },
    orderChatReadState: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const brandAccess = {
    resolveBrandContext: jest.fn(),
    resolveBrandActorUserIdForProfile: jest.fn(),
  };

  let service: ChatsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatsService(prisma as any, brandAccess as any);
  });

  describe('listChatsForCreator', () => {
    it('returns paginated chat threads sorted by latest message', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'creator-1' });
      const orders = [
        {
          id: 'order-a',
          status: OrderStatus.BRIEF_ACCEPTED,
          packageNameSnapshot: 'UGC 60s',
          updatedAt: new Date('2025-05-01T00:00:00Z'),
          brand: { id: 'brand-1', brandName: 'Acme', logoUrl: null },
        },
        {
          id: 'order-b',
          status: OrderStatus.DELIVERED,
          packageNameSnapshot: 'UGC 30s',
          updatedAt: new Date('2025-05-02T00:00:00Z'),
          brand: { id: 'brand-2', brandName: 'Beta', logoUrl: 'https://logo' },
        },
      ];
      prisma.$transaction.mockResolvedValue([2, orders]);
      prisma.orderChatMessage.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          orderId: 'order-b',
          senderUserId: 'brand-user',
          type: OrderChatMessageType.TEXT,
          text: 'Hello',
          createdAt: new Date('2025-05-10T12:00:00Z'),
        },
      ]);
      prisma.orderChatReadState.findMany.mockResolvedValue([]);
      prisma.orderChatMessage.count.mockResolvedValue(1);

      const result = await service.listChatsForCreator({
        creatorUserId: 'user-1',
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(2);
      expect(result.items[0].orderId).toBe('order-b');
      expect(result.items[0].lastMessage?.previewText).toBe('Hello');
      expect(result.items[0].unreadCount).toBe(1);
      expect(result.items[1].orderId).toBe('order-a');
      expect(result.items[1].lastMessage).toBeUndefined();
    });

    it('throws when creator profile is missing', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.listChatsForCreator({ creatorUserId: 'user-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listChatsForBrand', () => {
    it('returns chat threads for the resolved brand', async () => {
      brandAccess.resolveBrandContext.mockResolvedValue({
        brand: { id: 'brand-1' },
      });
      brandAccess.resolveBrandActorUserIdForProfile.mockResolvedValue('agency-owner');
      const orders = [
        {
          id: 'order-1',
          status: OrderStatus.ACCEPTED,
          packageNameSnapshot: 'Package',
          updatedAt: new Date('2025-05-03T00:00:00Z'),
          creator: {
            id: 'creator-1',
            displayName: 'Riya',
            introVideoUrl: null,
            city: 'Mumbai',
          },
        },
      ];
      prisma.$transaction.mockResolvedValue([1, orders]);
      prisma.orderChatMessage.findMany.mockResolvedValue([]);
      prisma.orderChatReadState.findMany.mockResolvedValue([]);
      prisma.orderChatMessage.count.mockResolvedValue(0);

      const result = await service.listChatsForBrand({
        actorUserId: 'agency-owner',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isChatLocked).toBe(true);
      expect(result.items[0].creator.displayName).toBe('Riya');
    });
  });
});
