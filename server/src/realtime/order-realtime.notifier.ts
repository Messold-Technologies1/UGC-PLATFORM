import { Injectable, Logger } from '@nestjs/common';
import { BrandAccessService } from '../brand-access/brand-access.service';
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
    private readonly brandAccess: BrandAccessService,
  ) {}

  private async resolveBrandUserId(brandProfileId: string): Promise<string> {
    return this.brandAccess.resolveBrandActorUserIdForProfile(brandProfileId);
  }

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
        brand: { select: { id: true } },
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

    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    const creatorUserId = order.creator.userId;

    this.gateway.server
      .to(`user:${brandUserId}`)
      .emit('order.payment', payload);
    if (params.audience === 'brand_and_creator') {
      if (creatorUserId !== brandUserId) {
        this.gateway.server
          .to(`user:${creatorUserId}`)
          .emit('order.payment', payload);
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
      select: {
        packageNameSnapshot: true,
        creator: { select: { userId: true } },
        brand: { select: { brandName: true } },
      },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderBriefSubmitted: order not found ${params.orderId}`,
      );
      return;
    }
    const creatorUserId = order.creator.userId;
    this.gateway.server
      .to(`user:${creatorUserId}`)
      .emit('order.brief_submitted', {
        orderId: params.orderId,
        briefSubmittedAt: params.briefSubmittedAt.toISOString(),
        brandName: order.brand.brandName ?? null,
        packageName: order.packageNameSnapshot,
      });
  }

  /** Notify the brand that the creator has accepted the brief. */
  async emitOrderBriefAccepted(params: {
    orderId: string;
    briefAcceptedAt: Date;
    /** Set for non-physical orders; null when a physical product still needs to be received first. */
    deliveryDueAt: Date | null;
    deliveryGraceDeadlineAt: Date | null;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { displayName: true } },
      },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderBriefAccepted: order not found ${params.orderId}`,
      );
      return;
    }
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    this.gateway.server.to(`user:${brandUserId}`).emit('order.brief_accepted', {
      orderId: params.orderId,
      briefAcceptedAt: params.briefAcceptedAt.toISOString(),
      creatorName: order.creator.displayName ?? null,
      deliveryDueAt: params.deliveryDueAt?.toISOString() ?? null,
      deliveryGraceDeadlineAt:
        params.deliveryGraceDeadlineAt?.toISOString() ?? null,
    });
  }

  /** Brand dispatched physical product; notify creator (tracking metadata only). */
  async emitOrderProductShipped(params: {
    orderId: string;
    courierName: string;
    trackingId: string | null;
    dispatchedAt: Date;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { creator: { select: { userId: true } } },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderProductShipped: order not found ${params.orderId}`,
      );
      return;
    }
    const creatorUserId = order.creator.userId;
    this.gateway.server
      .to(`user:${creatorUserId}`)
      .emit('order.product_shipped', {
        orderId: params.orderId,
        courierName: params.courierName,
        trackingId: params.trackingId,
        dispatchedAt: params.dispatchedAt.toISOString(),
      });
  }

  /** Brand requested revision; notify the creator with the revision number and optional note. */
  async emitOrderRevisionRequested(params: {
    orderId: string;
    revisionNumber: number;
    note: string | null;
    revisionsRemaining: number;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { creator: { select: { userId: true } } },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderRevisionRequested: order not found ${params.orderId}`,
      );
      return;
    }
    const creatorUserId = order.creator.userId;
    this.gateway.server
      .to(`user:${creatorUserId}`)
      .emit('order.revision_requested', {
        orderId: params.orderId,
        revisionNumber: params.revisionNumber,
        note: params.note,
        revisionsRemaining: params.revisionsRemaining,
      });
  }

  /**
   * A brand bought extra revisions (cap raised). Notify both parties so the
   * brand's UI re-enables Request Revision and the creator sees the grant.
   */
  async emitOrderRevisionsPurchased(params: {
    orderId: string;
    revisionsAdded: number;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderRevisionsPurchased: order not found ${params.orderId}`,
      );
      return;
    }
    const payload = {
      orderId: params.orderId,
      revisionsAdded: params.revisionsAdded,
    };
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    if (brandUserId) {
      this.gateway.server
        .to(`user:${brandUserId}`)
        .emit('order.revisions_purchased', payload);
    }
    this.gateway.server
      .to(`user:${order.creator.userId}`)
      .emit('order.revisions_purchased', payload);
  }

  /**
   * A brand bought extra usage-rights time on a completed order. Notify both
   * parties so their UIs reflect the extended usage window.
   */
  async emitOrderUsageRightsPurchased(params: {
    orderId: string;
    daysAdded: number;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderUsageRightsPurchased: order not found ${params.orderId}`,
      );
      return;
    }
    const payload = {
      orderId: params.orderId,
      daysAdded: params.daysAdded,
    };
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    if (brandUserId) {
      this.gateway.server
        .to(`user:${brandUserId}`)
        .emit('order.usage_rights_purchased', payload);
    }
    this.gateway.server
      .to(`user:${order.creator.userId}`)
      .emit('order.usage_rights_purchased', payload);
  }

  /** Creator received physical product; notify brand. Includes the now-set delivery deadlines. */
  async emitOrderProductReceived(params: {
    orderId: string;
    productReceivedAt: Date;
    deliveryDueAt: Date;
    deliveryGraceDeadlineAt: Date;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { brand: { select: { id: true } } },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderProductReceived: order not found ${params.orderId}`,
      );
      return;
    }
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    this.gateway.server
      .to(`user:${brandUserId}`)
      .emit('order.product_received', {
        orderId: params.orderId,
        productReceivedAt: params.productReceivedAt.toISOString(),
        deliveryDueAt: params.deliveryDueAt.toISOString(),
        deliveryGraceDeadlineAt: params.deliveryGraceDeadlineAt.toISOString(),
      });
  }

  /**
   * Watermarked previews are ready; notify brand and creator so order status
   * and the deliveries list update together.
   */
  async emitOrderContentDelivered(params: {
    orderId: string;
    status: 'DELIVERED' | 'REVISION_SUBMITTED';
    revisionNumber: number;
    deliveredAt: Date;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) {
      this.logger.warn(
        `emitOrderContentDelivered: order not found ${params.orderId}`,
      );
      return;
    }
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    const payload = {
      orderId: params.orderId,
      status: params.status,
      revisionNumber: params.revisionNumber,
      deliveredAt: params.deliveredAt.toISOString(),
    };
    this.gateway.server
      .to(`user:${brandUserId}`)
      .emit('order.content_delivered', payload);
    const creatorUserId = order.creator.userId;
    if (creatorUserId !== brandUserId) {
      this.gateway.server
        .to(`user:${creatorUserId}`)
        .emit('order.content_delivered', payload);
    }
  }

  /**
   * Notify the brand that watermarked delivery previews are ready to view, so
   * the client can refetch without a manual reload.
   */
  async emitDeliveryWatermarkReady(params: {
    orderId: string;
    revisionNumber: number;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { brand: { select: { id: true } } },
    });
    if (!order) {
      this.logger.warn(
        `emitDeliveryWatermarkReady: order not found ${params.orderId}`,
      );
      return;
    }
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    this.gateway.server
      .to(`user:${brandUserId}`)
      .emit('delivery.watermark_ready', {
        orderId: params.orderId,
        revisionNumber: params.revisionNumber,
      });
  }

  private async emitToBrandAndCreator(
    orderId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        brand: { select: { id: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) {
      this.logger.warn(`${event}: order not found ${orderId}`);
      return;
    }
    const brandUserId = await this.resolveBrandUserId(order.brand.id);
    const creatorUserId = order.creator.userId;
    this.gateway.server.to(`user:${brandUserId}`).emit(event, payload);
    if (creatorUserId !== brandUserId) {
      this.gateway.server.to(`user:${creatorUserId}`).emit(event, payload);
    }
  }

  /** Dispute opened — both parties should switch into the dispute UI. */
  async emitOrderDisputeOpened(params: {
    orderId: string;
    openedBy: 'BRAND' | 'CREATOR';
    reason?: string | null;
  }): Promise<void> {
    await this.emitToBrandAndCreator(params.orderId, 'order.dispute_opened', {
      orderId: params.orderId,
      openedBy: params.openedBy,
      reason: params.reason ?? null,
    });
  }

  /**
   * Dispute resolved / withdrawn / rejected — both parties should leave the
   * dispute UI and return to the restored (or rejected) order stage.
   */
  async emitOrderDisputeResolved(params: {
    orderId: string;
    outcome: 'CONTINUED' | 'WITHDRAWN' | 'REJECTED';
    restoredStatus?: string | null;
    resolutionNotes?: string | null;
  }): Promise<void> {
    await this.emitToBrandAndCreator(params.orderId, 'order.dispute_resolved', {
      orderId: params.orderId,
      outcome: params.outcome,
      restoredStatus: params.restoredStatus ?? null,
      resolutionNotes: params.resolutionNotes ?? null,
    });
  }
}
