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

const orderSelect = {
  id: true,
  status: true,
  packageNameSnapshot: true,
  updatedAt: true,
} as const;

type InboxOrderRow = Prisma.OrderGetPayload<{
  select: typeof orderSelect & {
    brand?: { select: typeof orderBrandSnapshotSelect };
    creator?: {
      select: {
        id: true;
        displayName: true;
        introVideoUrl: true;
        city: true;
      };
    };
  };
}>;

type LatestMessageRow = {
  id: string;
  orderId: string;
  senderUserId: string;
  type: OrderChatMessageType;
  text: string | null;
  createdAt: Date;
};

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  private isChatLocked(status: OrderStatus): boolean {
    return CHAT_LOCKED_ORDER_STATUSES.includes(status);
  }

  private toLastMessageDto(row: LatestMessageRow): ChatLastMessageDto {
    return {
      id: row.id,
      senderUserId: row.senderUserId,
      type: row.type,
      previewText:
        row.type === OrderChatMessageType.TEXT
          ? row.text
          : row.type === OrderChatMessageType.VOICE
            ? 'Voice message'
            : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async fetchLatestMessagesByOrderId(
    orderIds: string[],
  ): Promise<Map<string, LatestMessageRow>> {
    if (orderIds.length === 0) return new Map();

    const rows = await this.prisma.orderChatMessage.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['orderId'],
      select: {
        id: true,
        orderId: true,
        senderUserId: true,
        type: true,
        text: true,
        createdAt: true,
      },
    });

    return new Map(rows.map((row) => [row.orderId, row]));
  }

  private async fetchUnreadCounts(params: {
    orderIds: string[];
    viewerUserId: string;
  }): Promise<Map<string, number>> {
    if (params.orderIds.length === 0) return new Map();

    const readStates = await this.prisma.orderChatReadState.findMany({
      where: {
        orderId: { in: params.orderIds },
        userId: params.viewerUserId,
      },
      select: { orderId: true, lastReadAt: true },
    });
    const lastReadByOrderId = new Map(
      readStates.map((s) => [s.orderId, s.lastReadAt]),
    );

    const counts = await Promise.all(
      params.orderIds.map(async (orderId) => {
        const lastReadAt = lastReadByOrderId.get(orderId);
        const count = await this.prisma.orderChatMessage.count({
          where: {
            orderId,
            senderUserId: { not: params.viewerUserId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        return [orderId, count] as const;
      }),
    );

    return new Map(counts);
  }

  private sortOrdersByActivity(
    orders: InboxOrderRow[],
    latestByOrderId: Map<string, LatestMessageRow>,
  ): InboxOrderRow[] {
    return [...orders].sort((a, b) => {
      const aAt =
        latestByOrderId.get(a.id)?.createdAt.getTime() ?? a.updatedAt.getTime();
      const bAt =
        latestByOrderId.get(b.id)?.createdAt.getTime() ?? b.updatedAt.getTime();
      return bAt - aAt;
    });
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
    const where = {
      creatorId: creator.id,
      status: { notIn: CHAT_INBOX_EXCLUDED_STATUSES },
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: {
          ...orderSelect,
          brand: { select: orderBrandSnapshotSelect },
        },
      }),
    ]);

    const latestByOrderId = await this.fetchLatestMessagesByOrderId(
      rows.map((r) => r.id),
    );
    const pageRows = this.sortOrdersByActivity(rows, latestByOrderId).slice(
      (page - 1) * limit,
      page * limit,
    );
    const orderIds = pageRows.map((r) => r.id);

    const unreadByOrderId = await this.fetchUnreadCounts({
      orderIds,
      viewerUserId: params.creatorUserId,
    });

    const items = pageRows.map((row) => {
      const last = latestByOrderId.get(row.id);
      return {
        orderId: row.id,
        status: row.status,
        packageName: row.packageNameSnapshot,
        isChatLocked: this.isChatLocked(row.status),
        brand: {
          id: row.brand!.id,
          brandName: row.brand!.brandName,
          logoUrl: row.brand!.logoUrl ?? null,
        },
        lastMessage: last ? this.toLastMessageDto(last) : undefined,
        unreadCount: unreadByOrderId.get(row.id) ?? 0,
        updatedAt: row.updatedAt.toISOString(),
      };
    });

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
    const where = {
      brandId: brand.id,
      status: { notIn: CHAT_INBOX_EXCLUDED_STATUSES },
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: {
          ...orderSelect,
          creator: {
            select: {
              id: true,
              displayName: true,
              introVideoUrl: true,
              city: true,
            },
          },
        },
      }),
    ]);

    const latestByOrderId = await this.fetchLatestMessagesByOrderId(
      rows.map((r) => r.id),
    );
    const pageRows = this.sortOrdersByActivity(rows, latestByOrderId).slice(
      (page - 1) * limit,
      page * limit,
    );
    const orderIds = pageRows.map((r) => r.id);

    const brandActorUserId = await this.brandAccess.resolveBrandActorUserIdForProfile(
      brand.id,
    );

    const unreadByOrderId = await this.fetchUnreadCounts({
      orderIds,
      viewerUserId: brandActorUserId,
    });

    const items = pageRows.map((row) => {
      const last = latestByOrderId.get(row.id);
      return {
        orderId: row.id,
        status: row.status,
        packageName: row.packageNameSnapshot,
        isChatLocked: this.isChatLocked(row.status),
        creator: {
          id: row.creator!.id,
          displayName: row.creator!.displayName,
          introVideoUrl: row.creator!.introVideoUrl ?? null,
          city: row.creator!.city ?? null,
        },
        lastMessage: last ? this.toLastMessageDto(last) : undefined,
        unreadCount: unreadByOrderId.get(row.id) ?? 0,
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    return { items, total, page, limit };
  }
}
