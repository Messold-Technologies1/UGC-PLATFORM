import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderChatMessageType } from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PresignedUploadResult } from '../storage/storage.types';
import { StorageService } from '../storage/storage.service';
import {
  FormattedOrderChatMessage,
  OrderChatMessageRow,
  toRealtimeChatMessagePayload,
} from './order-chat-message.mapper';
import { buildOrderLastChatSnapshotUpdate } from './order-chat-order-snapshot';
import { OrderChatRealtimeNotifier } from './order-chat-realtime.notifier';

type OrderChatParticipants = {
  brandUserId: string;
  creatorUserId: string;
};

const MESSAGE_SELECT = {
  id: true,
  orderId: true,
  senderUserId: true,
  type: true,
  text: true,
  audioKey: true,
  audioDurationMs: true,
  audioMimeType: true,
  clientMessageId: true,
  createdAt: true,
} as const;

@Injectable()
export class OrderChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly realtime: OrderChatRealtimeNotifier,
    private readonly brandAccess: BrandAccessService,
  ) {}

  private formatMessage(row: OrderChatMessageRow): FormattedOrderChatMessage {
    return {
      id: row.id,
      orderId: row.orderId,
      senderUserId: row.senderUserId,
      type: row.type,
      text: row.type === OrderChatMessageType.TEXT ? row.text : null,
      audioUrl: row.audioKey ? this.storage.buildCdnUrl(row.audioKey) : null,
      audioDurationMs: row.audioDurationMs,
      audioMimeType: row.audioMimeType,
      clientMessageId: row.clientMessageId,
      createdAt: row.createdAt,
    };
  }

  private async emitFormattedMessage(
    orderId: string,
    message: FormattedOrderChatMessage,
  ): Promise<void> {
    await this.realtime.emitChatMessage({
      orderId,
      message: toRealtimeChatMessagePayload(message),
    });
  }

  private async getOrderParticipants(orderId: string): Promise<OrderChatParticipants> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const brandUserId = await this.brandAccess.resolveBrandActorUserIdForProfile(
      order.brand.id,
    );
    return { brandUserId, creatorUserId: order.creator.userId };
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
    items: FormattedOrderChatMessage[];
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
        select: MESSAGE_SELECT,
      });
      return {
        items: rows.map((row) => this.formatMessage(row)),
        nextCursor: rows.at(-1)?.id,
      };
    }

    const rows = await this.prisma.orderChatMessage.findMany({
      where: { orderId: params.orderId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(params.cursor
        ? { cursor: { id: params.cursor }, skip: 1 }
        : undefined),
      select: MESSAGE_SELECT,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? page.at(-1)?.id : undefined;

    return {
      items: page.map((row) => this.formatMessage(row)),
      nextCursor,
    };
  }

  async listMessagesForAdmin(params: {
    orderId: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    items: FormattedOrderChatMessage[];
    nextCursor?: string;
  }> {
    await this.getOrderParticipants(params.orderId);

    const take = Math.min(Math.max(params.limit, 1), 50);
    const rows = await this.prisma.orderChatMessage.findMany({
      where: { orderId: params.orderId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : undefined),
      select: MESSAGE_SELECT,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? page.at(-1)?.id : undefined;

    return {
      items: page.map((row) => this.formatMessage(row)),
      nextCursor,
    };
  }

  async presignVoiceUpload(params: {
    orderId: string;
    senderUserId: string;
    contentType: string;
    contentLength?: number;
  }): Promise<PresignedUploadResult> {
    await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.senderUserId,
    });

    let key: string;
    try {
      key = this.storage.buildObjectKey({
        kind: 'order_chat_voice_message',
        userId: params.senderUserId,
        orderId: params.orderId,
        contentType: params.contentType,
      });
    } catch {
      throw new BadRequestException('Unsupported audio content type');
    }

    return this.storage.createPresignedPutUpload({
      key,
      contentType: params.contentType,
      contentLength: params.contentLength,
    });
  }

  async sendMessage(params: {
    orderId: string;
    senderUserId: string;
    text: string;
    clientMessageId?: string;
  }): Promise<FormattedOrderChatMessage> {
    await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.senderUserId,
    });

    const text = params.text.trim();
    if (!text) throw new BadRequestException('Message text is required');
    if (text.length > 5000) throw new BadRequestException('Message too long');

    const created = await this.createMessageWithIdempotency({
      orderId: params.orderId,
      senderUserId: params.senderUserId,
      clientMessageId: params.clientMessageId,
      data: {
        orderId: params.orderId,
        senderUserId: params.senderUserId,
        type: OrderChatMessageType.TEXT,
        text,
        clientMessageId: params.clientMessageId ?? null,
      },
    });

    const formatted = this.formatMessage(created);
    await this.emitFormattedMessage(params.orderId, formatted);
    return formatted;
  }

  async sendVoiceMessage(params: {
    orderId: string;
    senderUserId: string;
    audioKey: string;
    audioDurationMs: number;
    clientMessageId?: string;
  }): Promise<FormattedOrderChatMessage> {
    await this.assertOrderChatAccess({
      orderId: params.orderId,
      viewerUserId: params.senderUserId,
    });

    if (
      !this.storage.isOrderChatVoiceKeyForUser(
        params.orderId,
        params.senderUserId,
        params.audioKey,
      )
    ) {
      throw new BadRequestException('Invalid audioKey');
    }

    const audioMimeType =
      this.storage.mimeTypeFromObjectKey(params.audioKey) ??
      'application/octet-stream';

    const created = await this.createMessageWithIdempotency({
      orderId: params.orderId,
      senderUserId: params.senderUserId,
      clientMessageId: params.clientMessageId,
      data: {
        orderId: params.orderId,
        senderUserId: params.senderUserId,
        type: OrderChatMessageType.VOICE,
        text: null,
        audioKey: params.audioKey,
        audioDurationMs: params.audioDurationMs,
        audioMimeType,
        clientMessageId: params.clientMessageId ?? null,
      },
    });

    const formatted = this.formatMessage(created);
    await this.emitFormattedMessage(params.orderId, formatted);
    return formatted;
  }

  private async createMessageWithIdempotency(params: {
    orderId: string;
    senderUserId: string;
    clientMessageId?: string;
    data: {
      orderId: string;
      senderUserId: string;
      type: OrderChatMessageType;
      text: string | null;
      audioKey?: string | null;
      audioDurationMs?: number | null;
      audioMimeType?: string | null;
      clientMessageId: string | null;
    };
  }): Promise<OrderChatMessageRow> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const message = await tx.orderChatMessage.create({
          data: params.data,
          select: MESSAGE_SELECT,
        });
        await tx.order.update({
          where: { id: params.orderId },
          data: buildOrderLastChatSnapshotUpdate(message),
        });
        return message;
      });
    } catch (err: unknown) {
      if (params.clientMessageId && (err as { code?: string })?.code === 'P2002') {
        const existing = await this.prisma.orderChatMessage.findFirst({
          where: {
            orderId: params.orderId,
            senderUserId: params.senderUserId,
            clientMessageId: params.clientMessageId,
          },
          select: MESSAGE_SELECT,
        });
        if (existing) return existing;
      }
      throw err;
    }
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
