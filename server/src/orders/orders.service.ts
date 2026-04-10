import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../razorpay/razorpay.service';

function toPaise(amount: Prisma.Decimal): number {
  // priceAmount has 2 decimals; paise = * 100
  const n = Number.parseFloat(amount.toString());
  return Math.round(n * 100);
}

function razorpayRefundErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'error' in err &&
    err.error &&
    typeof err.error === 'object' &&
    'description' in err.error &&
    typeof (err.error as { description: unknown }).description === 'string'
  ) {
    return (err.error as { description: string }).description;
  }
  if (err instanceof Error) return err.message;
  return 'Razorpay refund failed';
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  async createCheckout(params: {
    brandUserId: string;
    creatorId: string;
    packageId: string;
  }): Promise<{
    orderId: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    razorpayKeyId: string;
  }> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
    });
    if (!brand) {
      throw new NotFoundException('Brand profile not found');
    }

    const pkg = await this.prisma.creatorPackage.findFirst({
      where: { id: params.packageId, creatorId: params.creatorId },
      include: { creator: true },
    });
    if (!pkg) {
      throw new NotFoundException('Creator package not found');
    }

    const amountPaise = toPaise(pkg.priceAmount);
    if (amountPaise <= 0) {
      throw new BadRequestException('Invalid package amount');
    }

    const created = await this.prisma.order.create({
      data: {
        brandId: brand.id,
        creatorId: pkg.creatorId,
        creatorPackageId: pkg.id,
        status: 'PENDING_PAYMENT',
        packageNameSnapshot: pkg.name,
        // Some Prisma client versions type JsonValue vs InputJsonValue differently.
        deliverablesSnapshot:
          pkg.deliverables as unknown as Prisma.InputJsonValue,
        priceAmountSnapshot: pkg.priceAmount,
        currency: 'INR',
        deliveryDaysSnapshot: pkg.deliveryDays,
        maxRevisionsSnapshot: pkg.maxRevisions,
      },
      select: { id: true, currency: true },
    });

    const rzpOrder = await this.razorpay.createOrder({
      amountPaise,
      currency: created.currency,
      receipt: created.id,
      notes: {
        platformOrderId: created.id,
        brandProfileId: brand.id,
        creatorProfileId: pkg.creatorId,
        creatorPackageId: pkg.id,
      },
    });

    await this.prisma.order.update({
      where: { id: created.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return {
      orderId: created.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise,
      currency: created.currency,
      razorpayKeyId: this.razorpay.getPublicKeyId(),
    };
  }

  async markPaidFromWebhook(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: Date;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, status: true },
    });
    if (!order) return;

    // idempotent: if already paid, do nothing
    if (order.status !== 'PENDING_PAYMENT') return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'BRIEF_SUBMISSION_PENDING',
        paidAt: params.paidAt,
        razorpayPaymentId: params.razorpayPaymentId,
      },
    });
  }

  /**
   * payment.failed webhook: do not advance the order. Stays PENDING_PAYMENT so the brand can retry checkout.
   * If the order already left PENDING_PAYMENT (e.g. race with payment.captured), no update.
   */
  async onPaymentFailedFromWebhook(params: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    errorDescription?: string;
    errorCode?: string;
    errorSource?: string;
    errorStep?: string;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, status: true },
    });
    if (!order) return;

    if (String(order.status) !== 'PENDING_PAYMENT') {
      this.logger.debug(
        `payment.failed ignored for order ${order.id} status=${String(order.status)}`,
      );
      return;
    }

    this.logger.log(
      `payment.failed order=${order.id} payment=${params.razorpayPaymentId ?? '?'} code=${params.errorCode ?? '?'} source=${params.errorSource ?? '?'} step=${params.errorStep ?? '?'} ${params.errorDescription ?? ''} — status remains PENDING_PAYMENT`,
    );
  }

  async submitBrief(params: {
    brandUserId: string;
    orderId: string;
    brief: Record<string, unknown>;
  }): Promise<void> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        status: true,
        deliveryDaysSnapshot: true,
        briefSubmittedAt: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');
    if (order.status !== 'BRIEF_SUBMISSION_PENDING') {
      throw new BadRequestException('Order is not awaiting brief submission');
    }
    if (order.briefSubmittedAt) return; // idempotent

    const now = new Date();
    const deadline = new Date(now);
    // deliveryDays + 2 grace (platform-defined buffer)
    deadline.setDate(deadline.getDate() + order.deliveryDaysSnapshot + 2);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'BRIEF_SUBMITTED',
        brief: params.brief as any,
        briefSubmittedAt: now,
        deliveryDeadlineAt: deadline,
      },
    });
  }

  async markDelivered(params: { creatorUserId: string; orderId: string }): Promise<void> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, creatorId: true, status: true, deliveredAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id) throw new ForbiddenException('Not your order');
    if (order.deliveredAt) return;

    if (order.status !== 'BRIEF_SUBMITTED' && order.status !== 'REVISION_REQUESTED') {
      throw new BadRequestException('Order is not ready for delivery submission');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
  }

  async acceptDelivery(params: { brandUserId: string; orderId: string }): Promise<void> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, brandId: true, status: true, acceptedAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');
    if (order.acceptedAt) return;

    if (order.status !== 'DELIVERED' && order.status !== 'REVISION_SUBMITTED') {
      throw new BadRequestException('Order is not awaiting acceptance');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  async openDispute(params: {
    orderId: string;
    openedBy: 'BRAND' | 'CREATOR';
    openerUserId: string;
    reason: string;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, brandId: true, creatorId: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const noDisputeStatuses = new Set([
      'PENDING_PAYMENT',
      'CREATOR_PAYMENT_DONE',
      'REFUNDED',
      'REJECTED',
    ]);
    if (noDisputeStatuses.has(String(order.status))) {
      throw new BadRequestException('Order cannot be disputed in its current state');
    }

    if (params.openedBy === 'BRAND') {
      const brand = await this.prisma.brandProfile.findUnique({
        where: { userId: params.openerUserId },
        select: { id: true },
      });
      if (!brand) throw new NotFoundException('Brand profile not found');
      if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');
    } else {
      const creator = await this.prisma.creatorProfile.findUnique({
        where: { userId: params.openerUserId },
        select: { id: true },
      });
      if (!creator) throw new NotFoundException('Creator profile not found');
      if (order.creatorId !== creator.id) throw new ForbiddenException('Not your order');
    }

    // One open dispute at a time
    const existing = await this.prisma.orderDispute.findFirst({
      where: { orderId: order.id, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) return;

    await this.prisma.$transaction([
      this.prisma.orderDispute.create({
        data: {
          orderId: order.id,
          openedBy: params.openedBy,
          reason: params.reason,
          status: 'OPEN',
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'DISPUTED' },
      }),
    ]);
  }

  /**
   * Admin: after paying the creator manually from the company bank account.
   */
  async adminMarkCreatorPaymentDone(params: {
    orderId: string;
    adminUserId: string;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, status: true, creatorPaidAt: true } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (String(order.status) !== 'ACCEPTED') {
      throw new BadRequestException('Order must be ACCEPTED before marking creator paid');
    }
    if (order.creatorPaidAt) return;

    await (this.prisma.order as any).update({
      where: { id: order.id },
      data: {
        status: 'CREATOR_PAYMENT_DONE' as any,
        creatorPaidAt: new Date(),
      } as any,
    });
  }

  /**
   * Admin: mark order rejected (refund path). Typically after reviewing a dispute.
   */
  async adminRejectOrder(params: {
    orderId: string;
    adminUserId: string;
    resolutionNotes?: string;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (String(order.status) !== 'DISPUTED') {
      throw new BadRequestException(
        'Order must be DISPUTED before admin can mark it rejected (refund path)',
      );
    }

    await this.prisma.$transaction([
      this.prisma.orderDispute.updateMany({
        where: { orderId: order.id, status: 'OPEN' },
        data: {
          status: 'RESOLVED_REFUNDED',
          resolvedAt: new Date(),
          resolvedByUserId: params.adminUserId,
          resolutionNotes: params.resolutionNotes ?? null,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'REJECTED' as any },
      }),
    ]);
  }

  /**
   * Admin: call Razorpay refund API. On success, order becomes REFUNDED.
   * On Razorpay/API failure, the order stays REJECTED and nothing is persisted.
   */
  async adminTriggerRefund(params: { orderId: string }): Promise<{
    refundId: string;
    refundStatus: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        status: true,
        razorpayPaymentId: true,
        razorpayRefundId: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (String(order.status) !== 'REJECTED') {
      throw new BadRequestException('Order must be REJECTED before refund');
    }
    if (!order.razorpayPaymentId) {
      throw new BadRequestException('No Razorpay payment id on order');
    }
    if (order.razorpayRefundId) {
      throw new ConflictException('Refund already recorded for this order');
    }

    let refund: { id: string; status: string };
    try {
      refund = await this.razorpay.refundPayment({
        paymentId: order.razorpayPaymentId,
        notes: { orderId: order.id },
      });
    } catch (err: unknown) {
      throw new BadRequestException(razorpayRefundErrorMessage(err));
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED' as any,
        razorpayRefundId: refund.id,
        refundedAt: new Date(),
      },
    });

    return { refundId: refund.id, refundStatus: refund.status };
  }

  /**
   * Webhook: refund.processed — reconcile if admin/dashboard initiated refund elsewhere.
   */
  async markRefundCompletedFromWebhook(params: {
    razorpayPaymentId: string;
    razorpayRefundId: string;
  }): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { razorpayPaymentId: params.razorpayPaymentId },
      select: { id: true, status: true, razorpayRefundId: true },
    });
    if (!order) return;

    // Some TS servers can lag behind prisma client generation; compare via string
    // to avoid enum type narrowing issues in editor diagnostics.
    if (String(order.status) === 'REFUNDED') return;
    if (String(order.status) !== 'REJECTED') return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED' as any,
        razorpayRefundId: params.razorpayRefundId,
        refundedAt: new Date(),
      },
    });
  }
}

