import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderChatRealtimeNotifier } from './order-chat-realtime.notifier';

type OrderChatParticipants = {
  brandUserId: string;
  creatorUserId: string;
};

@Injectable()
export class OrderChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: OrderChatRealtimeNotifier,
  ) {}

  private async getOrderParticipants(orderId: string): Promise<OrderChatParticipants> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        brand: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { brandUserId: order.brand.userId, creatorUserId: order.creator.userId };
  }

  async getOrderChatParticipantsForAdmin(orderId: string): Promise<OrderChatParticipants> {
    return this.getOrderParticipants(orderId);
  }

  async assertOrderChatAccess(params: {
    orderId: string;
    viewerUserId: string;
  }): Promise<OrderChatParticipants> {
    const participants = await this.getOrderParticipants(params.orderId);
    const ok =
      params.viewerUserId === participants.brandUserId ||
      params.viewerUserId === participants.creatorUserId;
    if (!ok) throw new ForbiddenException('Not allowed to access this order chat');
    return participants;
  }

  async listMessages(params: {
    orderId: string;
    viewerUserId: string;
    limit: number;
    cursor?: string;
    after?: string;
  }): Promise<{
    items: Array<{
      id: string;
      orderId: string;
      senderUserId: string;
      text: string;
      clientMessageId: string | null;
      createdAt: Date;
    }>;
    nextCursor?: string;
  }> {
    await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.viewerUserId,
    });

    const take = Math.min(Math.max(params.limit, 1), 50);

    if (params.after) {
      const after = new Date(params.after);
      if (Number.isNaN(after.getTime())) {
        throw new BadRequestException('Invalid after timestamp');
      }
      const rows = await this.prisma.orderChatMessage.findMany({
        where: { orderId: params.orderId, createdAt: { gt: after } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take,
        select: {
          id: true,
          orderId: true,
          senderUserId: true,
          text: true,
          clientMessageId: true,
          createdAt: true,
        },
      });
      return { items: rows, nextCursor: rows.at(-1)?.id };
    }

    const rows = await this.prisma.orderChatMessage.findMany({
      where: { orderId: params.orderId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(params.cursor
        ? { cursor: { id: params.cursor }, skip: 1 }
        : undefined),
      select: {
        id: true,
        orderId: true,
        senderUserId: true,
        text: true,
        clientMessageId: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items.at(-1)?.id : undefined;

    return { items, nextCursor };
  }

  async listMessagesForAdmin(params: {
    orderId: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    items: Array<{
      id: string;
      orderId: string;
      senderUserId: string;
      text: string;
      clientMessageId: string | null;
      createdAt: Date;
    }>;
    nextCursor?: string;
  }> {
    await this.getOrderParticipants(params.orderId); // validates order exists

    const take = Math.min(Math.max(params.limit, 1), 50);
    const rows = await this.prisma.orderChatMessage.findMany({
      where: { orderId: params.orderId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : undefined),
      select: {
        id: true,
        orderId: true,
        senderUserId: true,
        text: true,
        clientMessageId: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items.at(-1)?.id : undefined;

    return { items, nextCursor };
  }

  async sendMessage(params: {
    orderId: string;
    senderUserId: string;
    text: string;
    clientMessageId?: string;
  }): Promise<{
    id: string;
    orderId: string;
    senderUserId: string;
    text: string;
    clientMessageId: string | null;
    createdAt: Date;
  }> {
    await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.senderUserId,
    });

    const text = params.text.trim();
    if (!text) throw new BadRequestException('Message text is required');
    if (text.length > 5000) throw new BadRequestException('Message too long');

    const created = await (async () => {
      try {
        return await this.prisma.orderChatMessage.create({
          data: {
            orderId: params.orderId,
            senderUserId: params.senderUserId,
            text,
            clientMessageId: params.clientMessageId ?? null,
          },
          select: {
            id: true,
            orderId: true,
            senderUserId: true,
            text: true,
            clientMessageId: true,
            createdAt: true,
          },
        });
      } catch (err: any) {
        if (params.clientMessageId && err?.code === 'P2002') {
          const existing = await this.prisma.orderChatMessage.findFirst({
            where: {
              orderId: params.orderId,
              senderUserId: params.senderUserId,
              clientMessageId: params.clientMessageId,
            },
            select: {
              id: true,
              orderId: true,
              senderUserId: true,
              text: true,
              clientMessageId: true,
              createdAt: true,
            },
          });
          if (existing) return existing;
        }
        throw err;
      }
    })();

    await this.realtime.emitChatMessage({
      orderId: params.orderId,
      message: {
        id: created.id,
        orderId: created.orderId,
        senderUserId: created.senderUserId,
        text: created.text,
        clientMessageId: created.clientMessageId,
        createdAt: created.createdAt.toISOString(),
      },
    });

    return created;
  }

  async markRead(params: {
    orderId: string;
    viewerUserId: string;
    lastReadMessageId: string;
  }): Promise<{
    orderId: string;
    userId: string;
    lastReadMessageId: string | null;
    lastReadAt: Date | null;
  }> {
    await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.viewerUserId,
    });

    const msg = await this.prisma.orderChatMessage.findUnique({
      where: { id: params.lastReadMessageId },
      select: { id: true, orderId: true, createdAt: true },
    });
    if (msg?.orderId !== params.orderId) {
      throw new BadRequestException('Message does not belong to this order');
    }

    const row = await this.prisma.orderChatReadState.upsert({
      where: { orderId_userId: { orderId: params.orderId, userId: params.viewerUserId } },
      create: {
        orderId: params.orderId,
        userId: params.viewerUserId,
        lastReadMessageId: msg.id,
        lastReadAt: msg.createdAt,
      },
      update: {
        lastReadMessageId: msg.id,
        lastReadAt: msg.createdAt,
      },
      select: { orderId: true, userId: true, lastReadMessageId: true, lastReadAt: true },
    });

    await this.realtime.emitReadUpdated({
      orderId: row.orderId,
      userId: row.userId,
      lastReadMessageId: row.lastReadMessageId,
      lastReadAt: row.lastReadAt ? row.lastReadAt.toISOString() : null,
    });

    return {
      orderId: row.orderId,
      userId: row.userId,
      lastReadMessageId: row.lastReadMessageId,
      lastReadAt: row.lastReadAt,
    };
  }

  async getState(params: {
    orderId: string;
    viewerUserId: string;
  }): Promise<{
    orderId: string;
    viewerUserId: string;
    brandUserId: string;
    creatorUserId: string;
    brandLastReadMessageId?: string;
    brandLastReadAt?: Date;
    creatorLastReadMessageId?: string;
    creatorLastReadAt?: Date;
  }> {
    const participants = await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.viewerUserId,
    });

    const states = await this.prisma.orderChatReadState.findMany({
      where: { orderId: params.orderId, userId: { in: [participants.brandUserId, participants.creatorUserId] } },
      select: { userId: true, lastReadMessageId: true, lastReadAt: true },
    });

    const brand = states.find((s) => s.userId === participants.brandUserId);
    const creator = states.find((s) => s.userId === participants.creatorUserId);

    return {
      orderId: params.orderId,
      viewerUserId: params.viewerUserId,
      brandUserId: participants.brandUserId,
      creatorUserId: participants.creatorUserId,
      brandLastReadMessageId: brand?.lastReadMessageId ?? undefined,
      brandLastReadAt: brand?.lastReadAt ?? undefined,
      creatorLastReadMessageId: creator?.lastReadMessageId ?? undefined,
      creatorLastReadAt: creator?.lastReadAt ?? undefined,
    };
  }

  async getStateForAdmin(params: { orderId: string }): Promise<{
    orderId: string;
    brandUserId: string;
    creatorUserId: string;
    brandLastReadMessageId?: string;
    brandLastReadAt?: Date;
    creatorLastReadMessageId?: string;
    creatorLastReadAt?: Date;
  }> {
    const participants = await this.getOrderParticipants(params.orderId);
    const states = await this.prisma.orderChatReadState.findMany({
      where: {
        orderId: params.orderId,
        userId: { in: [participants.brandUserId, participants.creatorUserId] },
      },
      select: { userId: true, lastReadMessageId: true, lastReadAt: true },
    });

    const brand = states.find((s) => s.userId === participants.brandUserId);
    const creator = states.find((s) => s.userId === participants.creatorUserId);

    return {
      orderId: params.orderId,
      brandUserId: participants.brandUserId,
      creatorUserId: participants.creatorUserId,
      brandLastReadMessageId: brand?.lastReadMessageId ?? undefined,
      brandLastReadAt: brand?.lastReadAt ?? undefined,
      creatorLastReadMessageId: creator?.lastReadMessageId ?? undefined,
      creatorLastReadAt: creator?.lastReadAt ?? undefined,
    };
  }
}

