import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateKey } from './whatsapp.types';

const orderWhatsAppSelect = {
  id: true,
  packageNameSnapshot: true,
  priceAmountSnapshot: true,
  currency: true,
  revisionCount: true,
  maxRevisionsSnapshot: true,
  brand: {
    select: {
      id: true,
      brandName: true,
      contactPhone: true,
      userId: true,
      agency: { select: { ownerUserId: true } },
    },
  },
  creator: {
    select: {
      displayName: true,
      user: { select: { name: true, phone: true } },
    },
  },
} as const;

type OrderWhatsAppRow = Prisma.OrderGetPayload<{
  select: typeof orderWhatsAppSelect;
}>;

@Injectable()
export class OrderWhatsAppNotifier {
  private readonly logger = new Logger(OrderWhatsAppNotifier.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
    private readonly config: ConfigService,
  ) {}

  notifyBriefSubmitted(orderId: string, briefSubmittedAt: Date): void {
    void this.run('brief_submitted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToCreator(
        order,
        WhatsAppTemplateKey.ORDER_BRIEF_SUBMITTED_FOR_CREATOR,
        [order.brand.brandName, order.packageNameSnapshot],
        [order.id],
      );
    });
  }

  notifyBriefAccepted(
    orderId: string,
    deliveryDeadlineAt: Date | null,
  ): void {
    void this.run('brief_accepted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToBrand(
        order,
        WhatsAppTemplateKey.ORDER_BRIEF_ACCEPTED_FOR_BRAND,
        [order.creator.displayName, order.id],
        [order.id],
      );
    });
  }

  notifyProductShipped(
    orderId: string,
    params: {
      courierName: string;
      trackingId: string | null;
      dispatchedAt: Date;
    },
  ): void {
    void this.run('product_shipped', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToCreator(
        order,
        WhatsAppTemplateKey.ORDER_PRODUCT_SHIPPED_FOR_CREATOR,
        [
          order.brand.brandName,
          params.courierName,
          params.trackingId ?? 'N/A',
        ],
        [order.id],
      );
    });
  }

  notifyProductReceived(
    orderId: string,
    deliveryDeadlineAt: Date,
  ): void {
    void this.run('product_received', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToBrand(
        order,
        WhatsAppTemplateKey.ORDER_PRODUCT_RECEIVED_FOR_BRAND,
        [
          order.creator.displayName,
          order.id,
          this.formatDate(deliveryDeadlineAt),
        ],
        [order.id],
      );
    });
  }

  notifyRevisionRequested(orderId: string, note?: string | null): void {
    void this.run('revision_requested', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const revisionsRemaining = Math.max(
        0,
        order.maxRevisionsSnapshot - order.revisionCount,
      );

      await this.sendToCreator(
        order,
        WhatsAppTemplateKey.ORDER_REVISION_REQUESTED_FOR_CREATOR,
        [
          order.brand.brandName,
          String(order.revisionCount),
          String(revisionsRemaining),
        ],
        [order.id],
      );
    });
  }

  notifyContentAccepted(orderId: string): void {
    void this.run('content_accepted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToCreator(
        order,
        WhatsAppTemplateKey.ORDER_CONTENT_ACCEPTED_FOR_CREATOR,
        [order.brand.brandName, order.packageNameSnapshot],
        [order.id],
      );
    });
  }

  notifyOrderRejected(
    orderId: string,
    resolutionNotes?: string | null,
  ): void {
    void this.run('order_rejected', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToBrand(
        order,
        WhatsAppTemplateKey.ORDER_REJECTED_FOR_BRAND,
        [order.creator.displayName, order.packageNameSnapshot],
        [order.id],
      );

      await this.sendToCreator(
        order,
        WhatsAppTemplateKey.ORDER_REJECTED_FOR_CREATOR,
        [order.brand.brandName, order.packageNameSnapshot],
        [order.id],
      );
    });
  }

  notifyOrderRefunded(orderId: string, refundedAt: Date): void {
    void this.run('order_refunded', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToBrand(
        order,
        WhatsAppTemplateKey.ORDER_REFUNDED_FOR_BRAND,
        [order.packageNameSnapshot, this.formatMoney(order.priceAmountSnapshot, order.currency)],
      );
    });
  }

  private async run(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `order whatsapp ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async loadOrder(orderId: string): Promise<OrderWhatsAppRow | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: orderWhatsAppSelect,
    });
    if (!order) {
      this.logger.warn(`order whatsapp: order not found ${orderId}`);
      return null;
    }
    return order;
  }

  private async sendToBrand(
    order: OrderWhatsAppRow,
    templateKey: WhatsAppTemplateKey,
    variables: string[],
    buttonVariables?: string[],
  ): Promise<void> {
    const phone = await this.resolveBrandPhone(order);
    if (!phone) {
      this.logger.debug(
        `skip whatsapp ${templateKey}: no phone found for brand on order ${order.id}`,
      );
      return;
    }
    await this.whatsapp.send({ to: phone, templateKey, variables, buttonVariables });
  }

  private async sendToCreator(
    order: OrderWhatsAppRow,
    templateKey: WhatsAppTemplateKey,
    variables: string[],
    buttonVariables?: string[],
  ): Promise<void> {
    const phone = this.creatorPhone(order);
    if (!phone) {
      this.logger.debug(
        `skip whatsapp ${templateKey}: no phone found for creator on order ${order.id}`,
      );
      return;
    }
    await this.whatsapp.send({ to: phone, templateKey, variables, buttonVariables });
  }

  private async resolveBrandPhone(
    order: OrderWhatsAppRow,
  ): Promise<string | null> {
    if (order.brand.contactPhone?.trim()) {
      return order.brand.contactPhone.trim();
    }

    const brandUserId =
      await this.brandAccess.resolveBrandActorUserIdForProfile(order.brand.id);
    const user = await this.prisma.user.findUnique({
      where: { id: brandUserId },
      select: { phone: true },
    });
    if (!user?.phone?.trim()) {
      this.logger.debug(
        `skip whatsapp: no phone or contactPhone found for brand on order ${order.id}`,
      );
      return null;
    }
    return user.phone.trim();
  }

  private creatorPhone(order: OrderWhatsAppRow): string | null {
    const { phone } = order.creator.user;
    if (!phone?.trim()) return null;
    return phone.trim();
  }

  private formatDate(d: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(d);
  }

  private formatMoney(amount: Prisma.Decimal, currency: string): string {
    const value = Number.parseFloat(amount.toString());
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(value);
  }
}
