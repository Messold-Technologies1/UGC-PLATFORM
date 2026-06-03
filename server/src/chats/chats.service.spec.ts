import { NotFoundException } from '@nestjs/common';
import { OrderChatMessageType, OrderStatus } from '@prisma/client';
import { ChatsService } from './chats.service';

describe('ChatsService', () => {
  const prisma = {
    creatorProfile: { findUnique: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
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
    it('returns paginated chat threads sorted by lastChatActivityAt', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'creator-1' });
      const pageRows = [
        {
          id: 'order-b',
          status: OrderStatus.DELIVERED,
          packageNameSnapshot: 'UGC 30s',
          updatedAt: new Date('2025-05-02T00:00:00Z'),
          lastChatActivityAt: new Date('2025-05-10T12:00:00Z'),
          lastChatMessageId: 'msg-1',
          lastChatMessageSenderUserId: 'brand-user',
          lastChatMessageType: OrderChatMessageType.TEXT,
          lastChatMessageText: 'Hello',
          brand: { id: 'brand-2', brandName: 'Beta', logoUrl: 'https://logo' },
        },
        {
          id: 'order-a',
          status: OrderStatus.BRIEF_ACCEPTED,
          packageNameSnapshot: 'UGC 60s',
          updatedAt: new Date('2025-05-01T00:00:00Z'),
          lastChatActivityAt: new Date('2025-05-01T00:00:00Z'),
          lastChatMessageId: null,
          lastChatMessageSenderUserId: null,
          lastChatMessageType: null,
          lastChatMessageText: null,
          brand: { id: 'brand-1', brandName: 'Acme', logoUrl: null },
        },
      ];
      prisma.$transaction.mockResolvedValue([2, pageRows]);
      prisma.$queryRaw.mockResolvedValue([{ orderId: 'order-b', count: 1 }]);

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
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastChatActivityAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
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
      const pageRows = [
        {
          id: 'order-1',
          status: OrderStatus.ACCEPTED,
          packageNameSnapshot: 'Package',
          updatedAt: new Date('2025-05-03T00:00:00Z'),
          lastChatActivityAt: new Date('2025-05-03T00:00:00Z'),
          lastChatMessageId: null,
          lastChatMessageSenderUserId: null,
          lastChatMessageType: null,
          lastChatMessageText: null,
          creator: {
            id: 'creator-1',
            displayName: 'Riya',
            introVideoUrl: null,
            city: 'Mumbai',
          },
        },
      ];
      prisma.$transaction.mockResolvedValue([1, pageRows]);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.listChatsForBrand({
        actorUserId: 'agency-owner',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isChatLocked).toBe(true);
      expect(result.items[0].creator.displayName).toBe('Riya');
    });
  });
});
