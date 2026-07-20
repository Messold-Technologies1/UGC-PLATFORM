import { Injectable } from '@nestjs/common';
import { OrderChatMessageType } from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway, orderRoom } from './chat.gateway';

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

  /**
   * Recipients of an order's live chat events: the brand and creator (via their
   * user rooms) plus any admin viewing the order (via the order room). Passing
   * them as a single array lets socket.io deliver one copy per socket even when
   * a socket belongs to more than one of these rooms.
   */
  private async chatRooms(orderId: string): Promise<string[]> {
    const { brandUserId, creatorUserId } = await this.getParticipants(orderId);
    return [
      ...new Set([
        `user:${brandUserId}`,
        `user:${creatorUserId}`,
        orderRoom(orderId),
      ]),
    ];
  }

  async emitChatMessage(params: {
    orderId: string;
    message: OrderChatRealtimeMessagePayload;
  }): Promise<void> {
    const rooms = await this.chatRooms(params.orderId);
    this.gateway.server.to(rooms).emit('chat.message', params);
  }

  async emitReadUpdated(params: {
    orderId: string;
    userId: string;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
  }): Promise<void> {
    const rooms = await this.chatRooms(params.orderId);
    this.gateway.server.to(rooms).emit('chat.read_updated', params);
  }
}
