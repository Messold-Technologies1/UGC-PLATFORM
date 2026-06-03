import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { EmailTemplateKey } from './mail.types';

const orderMailInclude = {
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
      contactEmail: true,
      contactFullName: true,
      userId: true,
      agency: { select: { ownerUserId: true } },
    },
  },
  creator: {
    select: {
      displayName: true,
      contactEmail: true,
      user: { select: { email: true, name: true } },
    },
  },
} as const;

type OrderMailRow = Prisma.OrderGetPayload<{
  select: typeof orderMailInclude;
}>;

@Injectable()
export class OrderMailNotifier {
  private readonly logger = new Logger(OrderMailNotifier.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
    private readonly config: ConfigService,
  ) {}

  notifyBriefSubmitted(orderId: string, briefSubmittedAt: Date): void {
    void this.run('brief_submitted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const brandName = order.brand.brandName;
      await this.sendToCreator(order, EmailTemplateKey.ORDER_BRIEF_SUBMITTED_FOR_CREATOR, {
        brandName,
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        briefSubmittedAt: this.formatDate(briefSubmittedAt),
        actionUrl: this.creatorOrderBriefUrl(order.id),
      });
    });
  }

  notifyBriefAccepted(
    orderId: string,
    deliveryDeadlineAt: Date | null,
  ): void {
    void this.run('brief_accepted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const ctx: Record<string, string> = {
        creatorName: order.creator.displayName,
        orderId: order.id,
        actionUrl: this.brandOrderUrl(order.id),
      };
      if (deliveryDeadlineAt) {
        ctx.deliveryDeadlineAt = this.formatDate(deliveryDeadlineAt);
      }

      await this.sendToBrand(order, EmailTemplateKey.ORDER_BRIEF_ACCEPTED_FOR_BRAND, ctx);
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

      const ctx: Record<string, string> = {
        brandName: order.brand.brandName,
        orderId: order.id,
        courierName: params.courierName,
        dispatchedAt: this.formatDate(params.dispatchedAt),
        actionUrl: this.creatorOrderUrl(order.id),
      };
      if (params.trackingId) {
        ctx.trackingId = params.trackingId;
      }

      await this.sendToCreator(
        order,
        EmailTemplateKey.ORDER_PRODUCT_SHIPPED_FOR_CREATOR,
        ctx,
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

      await this.sendToBrand(order, EmailTemplateKey.ORDER_PRODUCT_RECEIVED_FOR_BRAND, {
        creatorName: order.creator.displayName,
        orderId: order.id,
        deliveryDeadlineAt: this.formatDate(deliveryDeadlineAt),
        actionUrl: this.brandOrderUrl(order.id),
      });
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

      const vars: Record<string, string> = {
        brandName: order.brand.brandName,
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        revisionNumber: String(order.revisionCount),
        revisionsRemaining: String(revisionsRemaining),
        actionUrl: this.creatorOrderUrl(order.id),
      };
      if (note?.trim()) {
        vars.revisionNote = note.trim();
      }

      await this.sendToCreator(
        order,
        EmailTemplateKey.ORDER_REVISION_REQUESTED_FOR_CREATOR,
        vars,
      );
    });
  }

  notifyContentAccepted(orderId: string): void {
    void this.run('content_accepted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToCreator(
        order,
        EmailTemplateKey.ORDER_CONTENT_ACCEPTED_FOR_CREATOR,
        {
          brandName: order.brand.brandName,
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          actionUrl: this.creatorOrderUrl(order.id),
        },
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

      const base: Record<string, string> = {
        packageName: order.packageNameSnapshot,
        orderId: order.id,
      };
      if (resolutionNotes?.trim()) {
        base.resolutionNotes = resolutionNotes.trim();
      }

      await this.sendToBrand(order, EmailTemplateKey.ORDER_REJECTED_FOR_BRAND, {
        ...base,
        creatorName: order.creator.displayName,
        actionUrl: this.brandOrderUrl(order.id),
      });

      await this.sendToCreator(order, EmailTemplateKey.ORDER_REJECTED_FOR_CREATOR, {
        ...base,
        brandName: order.brand.brandName,
        actionUrl: this.creatorOrderUrl(order.id),
      });
    });
  }

  notifyOrderRefunded(orderId: string, refundedAt: Date): void {
    void this.run('order_refunded', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToBrand(order, EmailTemplateKey.ORDER_REFUNDED_FOR_BRAND, {
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        refundAmount: this.formatMoney(
          order.priceAmountSnapshot,
          order.currency,
        ),
        refundedAt: this.formatDate(refundedAt),
        actionUrl: this.brandOrderUrl(order.id),
      });
    });
  }

  private async run(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `order email ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async loadOrder(orderId: string): Promise<OrderMailRow | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: orderMailInclude,
    });
    if (!order) {
      this.logger.warn(`order email: order not found ${orderId}`);
      return null;
    }
    return order;
  }

  private async sendToBrand(
    order: OrderMailRow,
    templateKey: EmailTemplateKey,
    context: Record<string, string>,
  ): Promise<void> {
    const { email, name } = await this.resolveBrandRecipient(order);
    if (!email) {
      this.logger.warn(
        `order email ${templateKey}: no brand email for order ${order.id}`,
      );
      return;
    }
    await this.mail.send({
      to: email,
      templateKey,
      context: { recipientName: name, ...context },
    });
  }

  private async sendToCreator(
    order: OrderMailRow,
    templateKey: EmailTemplateKey,
    context: Record<string, string>,
  ): Promise<void> {
    const email = this.creatorEmail(order);
    if (!email) {
      this.logger.warn(
        `order email ${templateKey}: no creator email for order ${order.id}`,
      );
      return;
    }
    await this.mail.send({
      to: email,
      templateKey,
      context: {
        recipientName: this.creatorDisplayName(order),
        ...context,
      },
    });
  }

  private async resolveBrandRecipient(
    order: OrderMailRow,
  ): Promise<{ email: string | null; name: string }> {
    const brandUserId = await this.brandAccess.resolveBrandActorUserIdForProfile(
      order.brand.id,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: brandUserId },
      select: { email: true, name: true },
    });
    const email =
      order.brand.contactEmail?.trim() || user?.email?.trim() || null;
    const name =
      order.brand.contactFullName?.trim() ||
      order.brand.brandName ||
      user?.name?.trim() ||
      'there';
    return { email, name };
  }

  private creatorEmail(order: OrderMailRow): string | null {
    return (
      order.creator.contactEmail?.trim() ||
      order.creator.user.email?.trim() ||
      null
    );
  }

  private creatorDisplayName(order: OrderMailRow): string {
    return (
      order.creator.displayName?.trim() ||
      order.creator.user.name?.trim() ||
      'Creator'
    );
  }

  private brandOrderUrl(orderId: string): string {
    return `${this.frontendBase()}/brand/orders/${orderId}`;
  }

  private creatorOrderUrl(orderId: string): string {
    return `${this.frontendBase()}/creator/orders/${orderId}`;
  }

  private creatorOrderBriefUrl(orderId: string): string {
    return `${this.frontendBase()}/creator/orders/${orderId}/brief`;
  }

  private frontendBase(): string {
    return this.config.get<string>('FRONTEND_URL')!.replace(/\/$/, '');
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
