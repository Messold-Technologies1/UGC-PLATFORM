import { Injectable } from '@nestjs/common';
import { OrderChatMessageType } from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

export type OrderChatRealtimeMessagePayload = {
  id: string;
  orderId: string;
  senderUserId: string;
  type: OrderChatMessageType;
  text: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  audioMimeType: string | null;
  clientMessageId: string | null;
  createdAt: string;
};

@Injectable()
export class OrderChatRealtimeNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
    private readonly brandAccess: BrandAccessService,
  ) {}

  private async getParticipants(orderId: string): Promise<{
    brandUserId: string;
    creatorUserId: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new Error('Order not found');
    const brandUserId = await this.brandAccess.resolveBrandActorUserIdForProfile(
      order.brand.id,
    );
    return { brandUserId, creatorUserId: order.creator.userId };
  }

  async emitChatMessage(params: {
    orderId: string;
    message: OrderChatRealtimeMessagePayload;
  }): Promise<void> {
    const { brandUserId, creatorUserId } = await this.getParticipants(params.orderId);
    this.gateway.server.to(`user:${brandUserId}`).emit('chat.message', params);
    if (creatorUserId !== brandUserId) {
      this.gateway.server.to(`user:${creatorUserId}`).emit('chat.message', params);
    }
  }

  async emitReadUpdated(params: {
    orderId: string;
    userId: string;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
  }): Promise<void> {
    const { brandUserId, creatorUserId } = await this.getParticipants(params.orderId);
    this.gateway.server.to(`user:${brandUserId}`).emit('chat.read_updated', params);
    if (creatorUserId !== brandUserId) {
      this.gateway.server.to(`user:${creatorUserId}`).emit('chat.read_updated', params);
    }
  }
}
