import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderChatMessageType,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BrandChatsListResponseDto } from './dto/chats-list-response.dto';
import type { CreatorChatsListResponseDto } from './dto/chats-list-response.dto';
import type { ChatLastMessageDto } from './dto/chat-last-message.dto';
import {
  CHAT_INBOX_EXCLUDED_STATUSES,
  CHAT_LOCKED_ORDER_STATUSES,
} from './chats.constants';

const orderBrandSnapshotSelect = {
  id: true,
  brandName: true,
  logoUrl: true,
} as const;

const orderCreatorSnapshotSelect = {
  id: true,
  displayName: true,
  introVideoUrl: true,
  profileImageUrl: true,
  city: true,
} as const;

const orderInboxSelect = {
  id: true,
  status: true,
  packageNameSnapshot: true,
  updatedAt: true,
  lastChatActivityAt: true,
  lastChatMessageId: true,
  lastChatMessageSenderUserId: true,
  lastChatMessageType: true,
  lastChatMessageText: true,
} as const;

type OrderInboxRow = Prisma.OrderGetPayload<{
  select: typeof orderInboxSelect;
}>;

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  private isChatLocked(status: OrderStatus): boolean {
    return CHAT_LOCKED_ORDER_STATUSES.includes(status);
  }

  private lastMessageFromOrder(row: OrderInboxRow): ChatLastMessageDto | undefined {
    if (
      !row.lastChatMessageId ||
      !row.lastChatMessageSenderUserId ||
      !row.lastChatMessageType
    ) {
      return undefined;
    }

    return {
      id: row.lastChatMessageId,
      senderUserId: row.lastChatMessageSenderUserId,
      type: row.lastChatMessageType,
      previewText:
        row.lastChatMessageType === OrderChatMessageType.TEXT
          ? row.lastChatMessageText
          : row.lastChatMessageType === OrderChatMessageType.VOICE
            ? 'Voice message'
            : null,
      createdAt: row.lastChatActivityAt.toISOString(),
    };
  }

  private async fetchUnreadCounts(params: {
    orderIds: string[];
    viewerUserId: string;
  }): Promise<Map<string, number>> {
    if (params.orderIds.length === 0) return new Map();

    const countsByOrderId = new Map(
      params.orderIds.map((orderId) => [orderId, 0]),
    );

    const orderIdList = Prisma.join(
      params.orderIds.map((orderId) => Prisma.sql`${orderId}::uuid`),
    );

    const rows = await this.prisma.$queryRaw<{ orderId: string; count: number }[]>(
      Prisma.sql`
        SELECT m."orderId" AS "orderId", COUNT(*)::int AS count
        FROM "OrderChatMessage" m
        LEFT JOIN "OrderChatReadState" rs
          ON rs."orderId" = m."orderId"
         AND rs."userId" = ${params.viewerUserId}::uuid
        WHERE m."orderId" IN (${orderIdList})
          AND m."senderUserId" <> ${params.viewerUserId}::uuid
          AND (
            rs."lastReadAt" IS NULL
            OR m."createdAt" > rs."lastReadAt"
          )
        GROUP BY m."orderId"
      `,
    );

    for (const row of rows) {
      countsByOrderId.set(row.orderId, Number(row.count));
    }

    return countsByOrderId;
  }

  async listChatsForCreator(params: {
    creatorUserId: string;
    page?: number;
    limit?: number;
  }): Promise<CreatorChatsListResponseDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where = {
      creatorId: creator.id,
      status: { notIn: CHAT_INBOX_EXCLUDED_STATUSES },
    };

    const [total, pageRows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { lastChatActivityAt: 'desc' },
        skip,
        take: limit,
        select: {
          ...orderInboxSelect,
          brand: { select: orderBrandSnapshotSelect },
        },
      }),
    ]);

    const orderIds = pageRows.map((r) => r.id);
    const unreadByOrderId = await this.fetchUnreadCounts({
      orderIds,
      viewerUserId: params.creatorUserId,
    });

    const items = pageRows.map((row) => ({
      orderId: row.id,
      status: row.status,
      packageName: row.packageNameSnapshot,
      isChatLocked: this.isChatLocked(row.status),
      brand: {
        id: row.brand!.id,
        brandName: row.brand!.brandName,
        logoUrl: row.brand!.logoUrl ?? null,
      },
      lastMessage: this.lastMessageFromOrder(row),
      unreadCount: unreadByOrderId.get(row.id) ?? 0,
      updatedAt: row.updatedAt.toISOString(),
    }));

    return { items, total, page, limit };
  }

  async listChatsForBrand(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    page?: number;
    limit?: number;
  }): Promise<BrandChatsListResponseDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where = {
      brandId: brand.id,
      status: { notIn: CHAT_INBOX_EXCLUDED_STATUSES },
    };

    const brandActorUserId = await this.brandAccess.resolveBrandActorUserIdForProfile(
      brand.id,
    );

    const [total, pageRows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { lastChatActivityAt: 'desc' },
        skip,
        take: limit,
        select: {
          ...orderInboxSelect,
          creator: { select: orderCreatorSnapshotSelect },
        },
      }),
    ]);

    const orderIds = pageRows.map((r) => r.id);
    const unreadByOrderId = await this.fetchUnreadCounts({
      orderIds,
      viewerUserId: brandActorUserId,
    });

    const items = pageRows.map((row) => ({
      orderId: row.id,
      status: row.status,
      packageName: row.packageNameSnapshot,
      isChatLocked: this.isChatLocked(row.status),
      creator: {
        id: row.creator!.id,
        displayName: row.creator!.displayName,
        introVideoUrl: row.creator!.introVideoUrl ?? null,
        profileImageUrl: row.creator!.profileImageUrl ?? null,
        city: row.creator!.city ?? null,
      },
      lastMessage: this.lastMessageFromOrder(row),
      unreadCount: unreadByOrderId.get(row.id) ?? 0,
      updatedAt: row.updatedAt.toISOString(),
    }));

    return { items, total, page, limit };
  }
}
