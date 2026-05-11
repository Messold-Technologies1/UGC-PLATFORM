import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsGateway } from './payments.gateway';

export type OrderPaymentEventKind =
  | 'captured'
  | 'failed'
  | 'refund_processed'
  | 'refund_failed';

@Injectable()
export class OrderRealtimeNotifier {
  private readonly logger = new Logger(OrderRealtimeNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentsGateway,
  ) {}

  /**
   * Push payment/refund lifecycle updates to connected users (Socket.IO rooms `user:<userId>`).
   */
  async emitOrderPayment(params: {
    orderId: string;
    kind: OrderPaymentEventKind;
    audience: 'brand_only' | 'brand_and_creator';
    meta?: Record<string, unknown>;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        brand: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) {
      this.logger.warn(`emitOrderPayment: order not found ${params.orderId}`);
      return;
    }

    const payload = {
      kind: params.kind,
      orderId: params.orderId,
      ...params.meta,
    };

    const brandUserId = order.brand.userId;
    const creatorUserId = order.creator.userId;

    this.gateway.server.to(`user:${brandUserId}`).emit('order.payment', payload);
    if (params.audience === 'brand_and_creator') {
      if (creatorUserId !== brandUserId) {
        this.gateway.server.to(`user:${creatorUserId}`).emit('order.payment', payload);
      }
    }
  }

  /**
   * Notify the assigned creator that the brand submitted a brief (no brief payload).
   */
  async emitOrderBriefSubmitted(params: {
    orderId: string;
    briefSubmittedAt: Date;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { creator: { select: { userId: true } } },
    });
    if (!order) {
      this.logger.warn(`emitOrderBriefSubmitted: order not found ${params.orderId}`);
      return;
    }
    const creatorUserId = order.creator.userId;
    this.gateway.server.to(`user:${creatorUserId}`).emit('order.brief_submitted', {
      orderId: params.orderId,
      briefSubmittedAt: params.briefSubmittedAt.toISOString(),
    });
  }

  /** Notify the brand that the client (creator) has accepted the brief (no brief payload). */
  async emitOrderBriefAccepted(params: {
    orderId: string;
    briefAcceptedAt: Date;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { brand: { select: { userId: true } } },
    });
    if (!order) {
      this.logger.warn(`emitOrderBriefAccepted: order not found ${params.orderId}`);
      return;
    }
    const brandUserId = order.brand.userId;
    this.gateway.server.to(`user:${brandUserId}`).emit('order.brief_accepted', {
      orderId: params.orderId,
      briefAcceptedAt: params.briefAcceptedAt.toISOString(),
    });
  }
}
