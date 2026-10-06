import { NotFoundException } from '@nestjs/common';
import { OrderChatMessageType, OrderStatus } from '@prisma/client';
import { ChatsService } from './chats.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

describe('ChatsService', () => {
  const prisma = {
    creatorProfile: { findUnique: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  let brandAccess = createBrandAccessMock({
    brandId: 'brand-1',
    brandActorUserId: 'agency-owner',
  });

  let service: ChatsService;

  beforeEach(() => {
    jest.clearAllMocks();
    brandAccess = createBrandAccessMock({
      brandId: 'brand-1',
      brandActorUserId: 'agency-owner',
    });
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
          agency: null,
          briefRef: null,
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
          agency: null,
          briefRef: null,
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
          where: expect.objectContaining({
            status: {
              notIn: expect.arrayContaining([
                OrderStatus.PENDING_PAYMENT,
                OrderStatus.BRIEF_SUBMISSION_PENDING,
                OrderStatus.BRIEF_SUBMITTED,
              ]),
            },
          }),
          orderBy: { lastChatActivityAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('maps agency-owned orders to an agency buyer snapshot', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'creator-1' });
      prisma.$transaction.mockResolvedValue([
        1,
        [
          {
            id: 'order-agency',
            status: OrderStatus.ACCEPTED,
            packageNameSnapshot: 'UGC 30s',
            updatedAt: new Date('2025-05-03T00:00:00Z'),
            lastChatActivityAt: new Date('2025-05-03T00:00:00Z'),
            lastChatMessageId: null,
            lastChatMessageSenderUserId: null,
            lastChatMessageType: null,
            lastChatMessageText: null,
            brand: null,
            agency: {
              id: 'agency-1',
              name: 'Northstar Agency',
              logoUrl: 'https://agency-logo',
            },
            briefRef: { brandName: 'Client Co' },
          },
        ],
      ]);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.listChatsForCreator({
        creatorUserId: 'user-1',
      });

      expect(result.items[0].brand).toEqual({
        id: 'agency-1',
        brandName: 'Client Co',
        logoUrl: 'https://agency-logo',
      });
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
      expect(result.items[0].creator.displayName).toBe('Creator');
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brandId: 'brand-1',
            status: {
              notIn: expect.arrayContaining([
                OrderStatus.PENDING_PAYMENT,
                OrderStatus.BRIEF_SUBMISSION_PENDING,
                OrderStatus.BRIEF_SUBMITTED,
              ]),
            },
          }),
        }),
      );
      expect(brandAccess.resolveBuyerActorUserId).toHaveBeenCalledWith({
        brandId: 'brand-1',
        agencyId: null,
      });
    });

    it('lists agency-owned order chats without requiring a brand profile', async () => {
      brandAccess = createBrandAccessMock({
        brandId: null,
        agencyId: 'agency-1',
        brandActorUserId: 'agency-owner',
      });
      service = new ChatsService(prisma as any, brandAccess as any);

      prisma.$transaction.mockResolvedValue([
        1,
        [
          {
            id: 'order-agency',
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
        ],
      ]);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.listChatsForBrand({
        actorUserId: 'agency-owner',
      });

      expect(result.items).toHaveLength(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agencyId: 'agency-1' }),
        }),
      );
      expect(brandAccess.requireBrandProfile).not.toHaveBeenCalled();
      expect(brandAccess.resolveBuyerActorUserId).toHaveBeenCalledWith({
        brandId: null,
        agencyId: 'agency-1',
      });
    });
  });
});
