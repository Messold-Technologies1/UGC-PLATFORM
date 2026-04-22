import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import type { CreatorAddOn, OrderStatus } from '@prisma/client';
import type { AdminOrdersListResponseDto } from './dto/admin-orders-list-response.dto';
import type { AdminOrderListItemDto } from './dto/admin-order-list-item.dto';
import type { BrandOrdersListResponseDto } from './dto/brand-orders-list-response.dto';
import type { BrandOrderListItemDto } from './dto/brand-order-list-item.dto';
import type { CreatorOrdersListResponseDto } from './dto/creator-orders-list-response.dto';
import type { CreatorOrderListItemDto } from './dto/creator-order-list-item.dto';
import type { OrderBriefResponseDto } from './dto/order-brief-response.dto';
import type { OrderListSummaryDto } from './dto/order-list-summary.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { OrderRealtimeNotifier } from '../realtime/order-realtime.notifier';

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
    private readonly orderRealtime: OrderRealtimeNotifier,
  ) {}

  async createCheckout(params: {
    brandUserId: string;
    creatorId: string;
    packageId: string;
    addOnIds?: string[];
  }): Promise<{
    orderId: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    razorpayKeyId: string;
    packageAmountPaise: number;
    addOnsAmountPaise: number;
    addOnsCount: number;
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

    const addOnIdList = [...new Set((params.addOnIds ?? []).filter(Boolean))];
    let addOnRows: CreatorAddOn[] = [];
    if (addOnIdList.length > 0) {
      addOnRows = await this.prisma.creatorAddOn.findMany({
        where: {
          id: { in: addOnIdList },
          creatorId: pkg.creatorId,
        },
      });
      if (addOnRows.length !== addOnIdList.length) {
        throw new BadRequestException(
          'One or more add-ons are invalid or do not belong to this creator',
        );
      }
    }

    const packageAmountPaise = toPaise(pkg.priceAmount);
    const addOnsTotalDecimal =
      addOnRows.length > 0
        ? addOnRows.reduce(
            (sum, a) => sum.add(a.priceAmount),
            new Prisma.Decimal(0),
          )
        : null;
    const addOnsAmountPaise =
      addOnsTotalDecimal === null ? 0 : toPaise(addOnsTotalDecimal);
    const amountPaise = packageAmountPaise + addOnsAmountPaise;
    if (packageAmountPaise <= 0) {
      throw new BadRequestException('Invalid package amount');
    }
    if (amountPaise <= 0) {
      throw new BadRequestException('Invalid checkout amount');
    }

    const addOnsSnapshot = addOnRows.map((a) => ({
      id: a.id,
      name: a.name,
      priceAmount: a.priceAmount.toString(),
      description: a.description ?? null,
    }));

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
        addOnsSnapshot: addOnsSnapshot as unknown as Prisma.InputJsonValue,
        addOnsTotalSnapshot: addOnsTotalDecimal,
        expectedAmountPaise: amountPaise,
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
      packageAmountPaise,
      addOnsAmountPaise,
      addOnsCount: addOnRows.length,
    };
  }

  async markPaidFromWebhook(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: Date;
    /** Payment amount in paise from Razorpay (optional but recommended) */
    amountPaise?: number;
  }): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, status: true, expectedAmountPaise: true },
    });
    if (!order) return null;

    // idempotent: if already paid, do nothing
    if (order.status !== 'PENDING_PAYMENT') return null;

    if (
      order.expectedAmountPaise > 0 &&
      params.amountPaise != null &&
      order.expectedAmountPaise !== params.amountPaise
    ) {
      this.logger.warn(
        `payment.captured amount mismatch order=${order.id} expectedPaise=${order.expectedAmountPaise} gotPaise=${params.amountPaise} — not marking paid`,
      );
      return null;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'BRIEF_SUBMISSION_PENDING',
        paidAt: params.paidAt,
        razorpayPaymentId: params.razorpayPaymentId,
      },
    });
    return order.id;
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
  }): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, status: true },
    });
    if (!order) return null;

    if (String(order.status) !== 'PENDING_PAYMENT') {
      this.logger.debug(
        `payment.failed ignored for order ${order.id} status=${String(order.status)}`,
      );
      return null;
    }

    this.logger.log(
      `payment.failed order=${order.id} payment=${params.razorpayPaymentId ?? '?'} code=${params.errorCode ?? '?'} source=${params.errorSource ?? '?'} step=${params.errorStep ?? '?'} ${params.errorDescription ?? ''} — status remains PENDING_PAYMENT`,
    );
    return order.id;
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
    if (order.brandId !== brand.id)
      throw new ForbiddenException('Not your order');
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

    await this.orderRealtime.emitOrderBriefSubmitted({
      orderId: order.id,
      briefSubmittedAt: now,
    });
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return user.userRoles.some((ur) => ur.role.name === RoleName.ADMIN);
  }

  private mapOrderListSummary(order: {
    id: string;
    status: OrderStatus;
    packageNameSnapshot: string;
    priceAmountSnapshot: Prisma.Decimal;
    currency: string;
    deliveryDaysSnapshot: number;
    paidAt: Date | null;
    briefSubmittedAt: Date | null;
    deliveryDeadlineAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrderListSummaryDto {
    return {
      id: order.id,
      status: order.status,
      packageNameSnapshot: order.packageNameSnapshot,
      priceAmountSnapshot: order.priceAmountSnapshot.toString(),
      currency: order.currency,
      deliveryDaysSnapshot: order.deliveryDaysSnapshot,
      paidAt: order.paidAt,
      briefSubmittedAt: order.briefSubmittedAt,
      hasBrief: order.briefSubmittedAt != null,
      deliveryDeadlineAt: order.deliveryDeadlineAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async listOrdersForBrand(params: {
    brandUserId: string;
    page?: number;
    limit?: number;
  }): Promise<BrandOrdersListResponseDto> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where = { brandId: brand.id };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          packageNameSnapshot: true,
          priceAmountSnapshot: true,
          currency: true,
          deliveryDaysSnapshot: true,
          paidAt: true,
          briefSubmittedAt: true,
          deliveryDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              profileImageUrl: true,
              city: true,
            },
          },
        },
      }),
    ]);

    const items: BrandOrderListItemDto[] = rows.map((r) => {
      const { creator, ...orderFields } = r;
      return {
        order: this.mapOrderListSummary(orderFields),
        creator: {
          id: creator.id,
          displayName: creator.displayName,
          profileImageUrl: creator.profileImageUrl ?? null,
          city: creator.city ?? null,
        },
      };
    });

    return { items, total, page, limit };
  }

  async listOrdersForCreator(params: {
    creatorUserId: string;
    page?: number;
    limit?: number;
  }): Promise<CreatorOrdersListResponseDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where = { creatorId: creator.id };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          packageNameSnapshot: true,
          priceAmountSnapshot: true,
          currency: true,
          deliveryDaysSnapshot: true,
          paidAt: true,
          briefSubmittedAt: true,
          deliveryDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          brand: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
            },
          },
        },
      }),
    ]);

    const items: CreatorOrderListItemDto[] = rows.map((r) => {
      const { brand, ...orderFields } = r;
      return {
        order: this.mapOrderListSummary(orderFields),
        brand: {
          id: brand.id,
          companyName: brand.companyName,
          logoUrl: brand.logoUrl ?? null,
        },
      };
    });

    return { items, total, page, limit };
  }

  async listOrdersForAdmin(params: {
    page?: number;
    limit?: number;
  }): Promise<AdminOrdersListResponseDto> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count(),
      this.prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          packageNameSnapshot: true,
          priceAmountSnapshot: true,
          currency: true,
          deliveryDaysSnapshot: true,
          paidAt: true,
          briefSubmittedAt: true,
          deliveryDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              profileImageUrl: true,
              city: true,
            },
          },
          brand: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
            },
          },
        },
      }),
    ]);

    const items: AdminOrderListItemDto[] = rows.map((r) => {
      const { creator, brand, ...orderFields } = r;
      return {
        order: this.mapOrderListSummary(orderFields),
        creator: {
          id: creator.id,
          displayName: creator.displayName,
          profileImageUrl: creator.profileImageUrl ?? null,
          city: creator.city ?? null,
        },
        brand: {
          id: brand.id,
          companyName: brand.companyName,
          logoUrl: brand.logoUrl ?? null,
        },
      };
    });

    return { items, total, page, limit };
  }

  async getOrderBrief(params: {
    orderId: string;
    viewerUserId: string;
  }): Promise<OrderBriefResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brief: true,
        briefSubmittedAt: true,
        brand: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isParticipant =
      order.brand.userId === params.viewerUserId ||
      order.creator.userId === params.viewerUserId;
    const isAdmin = await this.isAdminUser(params.viewerUserId);
    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('Not allowed to view this brief');
    }

    const raw = order.brief;
    let brief: Record<string, unknown> | null = null;
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      brief = raw as Record<string, unknown>;
    } else if (raw != null) {
      brief = { value: raw as unknown };
    }

    return {
      orderId: order.id,
      briefSubmittedAt: order.briefSubmittedAt,
      brief,
    };
  }

  async markDelivered(params: {
    creatorUserId: string;
    orderId: string;
  }): Promise<void> {
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
    if (order.creatorId !== creator.id)
      throw new ForbiddenException('Not your order');
    if (order.deliveredAt) return;

    if (
      order.status !== 'BRIEF_SUBMITTED' &&
      order.status !== 'REVISION_REQUESTED'
    ) {
      throw new BadRequestException(
        'Order is not ready for delivery submission',
      );
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
  }

  async acceptDelivery(params: {
    brandUserId: string;
    orderId: string;
  }): Promise<void> {
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
    if (order.brandId !== brand.id)
      throw new ForbiddenException('Not your order');
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
      throw new BadRequestException(
        'Order cannot be disputed in its current state',
      );
    }

    if (params.openedBy === 'BRAND') {
      const brand = await this.prisma.brandProfile.findUnique({
        where: { userId: params.openerUserId },
        select: { id: true },
      });
      if (!brand) throw new NotFoundException('Brand profile not found');
      if (order.brandId !== brand.id)
        throw new ForbiddenException('Not your order');
    } else {
      const creator = await this.prisma.creatorProfile.findUnique({
        where: { userId: params.openerUserId },
        select: { id: true },
      });
      if (!creator) throw new NotFoundException('Creator profile not found');
      if (order.creatorId !== creator.id)
        throw new ForbiddenException('Not your order');
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
      throw new BadRequestException(
        'Order must be ACCEPTED before marking creator paid',
      );
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

    await this.orderRealtime.emitOrderPayment({
      orderId: order.id,
      kind: 'refund_processed',
      audience: 'brand_and_creator',
      meta: { razorpayRefundId: refund.id, refundStatus: refund.status },
    });

    return { refundId: refund.id, refundStatus: refund.status };
  }

  async findOrderIdByRazorpayPaymentId(
    razorpayPaymentId: string,
  ): Promise<string | null> {
    const row = await this.prisma.order.findFirst({
      where: { razorpayPaymentId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /**
   * Webhook: refund.processed — reconcile if admin/dashboard initiated refund elsewhere.
   */
  async markRefundCompletedFromWebhook(params: {
    razorpayPaymentId: string;
    razorpayRefundId: string;
  }): Promise<string | null> {
    const order = await this.prisma.order.findFirst({
      where: { razorpayPaymentId: params.razorpayPaymentId },
      select: { id: true, status: true, razorpayRefundId: true },
    });
    if (!order) return null;

    // Some TS servers can lag behind prisma client generation; compare via string
    // to avoid enum type narrowing issues in editor diagnostics.
    if (String(order.status) === 'REFUNDED') return null;
    if (String(order.status) !== 'REJECTED') return null;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED' as any,
        razorpayRefundId: params.razorpayRefundId,
        refundedAt: new Date(),
      },
    });
    return order.id;
  }
}
