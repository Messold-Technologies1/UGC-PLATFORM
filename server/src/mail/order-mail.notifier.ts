import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { EmailTemplateKey } from './mail.types';
import {
  resolveBrandMailAddress,
  resolveBrandMailDisplayName,
} from './brand-mail.recipient';

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
      id: true,
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

      const brandName = this.brandDisplayName(order.brand);
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
    deliveryDueAt: Date | null,
  ): void {
    void this.run('brief_accepted', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const ctx: Record<string, string> = {
        creatorName: order.creator.displayName,
        orderId: order.id,
        actionUrl: this.brandOrderUrl(order.id),
      };
      if (deliveryDueAt) {
        ctx.deliveryDueAt = this.formatDate(deliveryDueAt);
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
        brandName: this.brandDisplayName(order.brand),
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
    deliveryDueAt: Date,
  ): void {
    void this.run('product_received', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      await this.sendToBrand(order, EmailTemplateKey.ORDER_PRODUCT_RECEIVED_FOR_BRAND, {
        creatorName: order.creator.displayName,
        orderId: order.id,
        deliveryDueAt: this.formatDate(deliveryDueAt),
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
        brandName: this.brandDisplayName(order.brand),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        revisionNumber: String(order.revisionCount),
        revisionsRemaining: String(revisionsRemaining),
        actionUrl: this.creatorOrderListUrl(order.id, 'revisions'),
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

  notifyExtraRevisionsPurchased(orderId: string, revisionsAdded: number): void {
    void this.run('extra_revisions_purchased', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      // loadOrder runs after the cap increment, so maxRevisionsSnapshot is fresh.
      const vars: Record<string, string> = {
        brandName: this.brandDisplayName(order.brand),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        revisionsAdded: String(revisionsAdded),
        maxRevisions: String(order.maxRevisionsSnapshot),
        actionUrl: this.creatorOrderListUrl(order.id, 'revisions'),
      };

      await this.sendToCreator(
        order,
        EmailTemplateKey.ORDER_EXTRA_REVISIONS_PURCHASED_FOR_CREATOR,
        vars,
      );
    });
  }

  notifyContentDelivered(
    orderId: string,
    params: { revisionNumber: number; deliveredAt: Date },
  ): void {
    void this.run('content_delivered', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const ctx: Record<string, string> = {
        creatorName: order.creator.displayName,
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        deliveredAt: this.formatDate(params.deliveredAt),
        actionUrl: this.brandOrderUrl(order.id),
      };
      if (params.revisionNumber > 0) {
        ctx.revisionNumber = String(params.revisionNumber);
      }

      await this.sendToBrand(
        order,
        EmailTemplateKey.ORDER_CONTENT_DELIVERED_FOR_BRAND,
        ctx,
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
          brandName: this.brandDisplayName(order.brand),
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          actionUrl: this.creatorOrderUrl(order.id),
        },
      );

      await this.sendToBrand(order, EmailTemplateKey.ORDER_COMPLETED_FOR_BRAND, {
        creatorName: order.creator.displayName,
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        actionUrl: this.brandOrderUrl(order.id),
      });
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
        brandName: this.brandDisplayName(order.brand),
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

  /**
   * A dispute was opened by one party. Notify BOTH the brand and the creator
   * so each side knows a dispute exists, who raised it, and why.
   */
  notifyDisputeOpened(
    orderId: string,
    params: { openedBy: 'BRAND' | 'CREATOR'; reason?: string | null },
  ): void {
    void this.run('dispute_opened', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const raisedByLabel = params.openedBy === 'BRAND' ? 'Brand' : 'Creator';
      const base: Record<string, string> = {
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        raisedByLabel,
      };
      if (params.reason?.trim()) {
        base.reason = params.reason.trim();
      }

      await this.sendToBrand(
        order,
        EmailTemplateKey.ORDER_DISPUTE_OPENED_FOR_BRAND,
        { ...base, actionUrl: this.brandOrderUrl(order.id) },
      );

      await this.sendToCreator(
        order,
        EmailTemplateKey.ORDER_DISPUTE_OPENED_FOR_CREATOR,
        { ...base, actionUrl: this.creatorOrderUrl(order.id) },
      );
    });
  }

  /**
   * Admin resolved/closed a dispute (no-refund path). Notify BOTH parties with
   * the outcome and the admin's resolution note.
   */
  notifyDisputeResolved(
    orderId: string,
    params: { outcome: 'CONTINUED'; resolutionNotes?: string | null },
  ): void {
    void this.run('dispute_resolved', async () => {
      const order = await this.loadOrder(orderId);
      if (!order) return;

      const outcomeMessage =
        params.outcome === 'CONTINUED'
          ? 'The order will continue from the stage it was in before the dispute.'
          : 'The dispute has been closed.';

      const base: Record<string, string> = {
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        outcomeMessage,
      };
      if (params.resolutionNotes?.trim()) {
        base.resolutionNotes = params.resolutionNotes.trim();
      }

      await this.sendToBrand(
        order,
        EmailTemplateKey.ORDER_DISPUTE_RESOLVED_FOR_BRAND,
        { ...base, actionUrl: this.brandOrderUrl(order.id) },
      );

      await this.sendToCreator(
        order,
        EmailTemplateKey.ORDER_DISPUTE_RESOLVED_FOR_CREATOR,
        { ...base, actionUrl: this.creatorOrderUrl(order.id) },
      );
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
      notificationGate: {
        profileType: 'brand',
        profileId: order.brand.id,
      },
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
      notificationGate: {
        profileType: 'creator',
        profileId: order.creator.id,
      },
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
    const email = resolveBrandMailAddress({
      contactEmail: order.brand.contactEmail,
      accountEmail: user?.email,
    });
    const name = resolveBrandMailDisplayName({
      contactFullName: order.brand.contactFullName,
      brandName: order.brand.brandName,
      accountName: user?.name,
    });
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

  private brandDisplayName(brand: OrderMailRow['brand']): string {
    return resolveBrandMailDisplayName({
      contactFullName: brand.contactFullName,
      brandName: brand.brandName,
      fallback: 'Brand',
    });
  }

  private brandOrderUrl(orderId: string): string {
    return `${this.frontendBase()}/brand/orders/${orderId}`;
  }

  private creatorOrderUrl(orderId: string): string {
    return `${this.frontendBase()}/creator/orders/${orderId}`;
  }

  private creatorOrderListUrl(orderId: string, tab?: string): string {
    const params = new URLSearchParams({ orderId });
    if (tab) params.set('tab', tab);
    return `${this.frontendBase()}/creator/orders?${params.toString()}`;
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
