import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class OrderChatRealtimeNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  private async getParticipants(orderId: string): Promise<{
    brandUserId: string;
    creatorUserId: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        brand: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new Error('Order not found');
    return { brandUserId: order.brand.userId, creatorUserId: order.creator.userId };
  }

  async emitChatMessage(params: {
    orderId: string;
    message: {
      id: string;
      orderId: string;
      senderUserId: string;
      text: string;
      clientMessageId: string | null;
      createdAt: string;
    };
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

