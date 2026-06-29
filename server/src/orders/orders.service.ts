import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import type { CreatorAddOn, OrderStatus } from '@prisma/client';
import type { AdminOrdersListResponseDto } from './dto/admin-orders-list-response.dto';
import type { AdminOrderListItemDto } from './dto/admin-order-list-item.dto';
import type { BrandOrdersListResponseDto } from './dto/brand-orders-list-response.dto';
import type { BrandOrderListItemDto } from './dto/brand-order-list-item.dto';
import type { CreatorOrdersListResponseDto } from './dto/creator-orders-list-response.dto';
import type { CreatorOrderListItemDto } from './dto/creator-order-list-item.dto';
import type { AcceptBriefResponseDto } from './dto/accept-brief-response.dto';
import type { MarkProductReceivedResponseDto } from './dto/mark-product-received-response.dto';
import type { OrderBriefResponseDto } from './dto/order-brief-response.dto';
import type { OrderListSummaryDto } from './dto/order-list-summary.dto';
import type { AdminOrderDetailsResponseDto } from './dto/admin-order-details-response.dto';
import type { BrandOrderDetailsResponseDto } from './dto/brand-order-details-response.dto';
import type { CreatorOrderDetailsResponseDto } from './dto/creator-order-details-response.dto';
import type { OrderDetailsPublicDto } from './dto/order-details-public.dto';
import type { OrderDetailsAdminDto } from './dto/order-details-admin.dto';
import type { PresignDeliveryUploadDto } from './dto/presign-delivery-upload.dto';
import type { PresignDeliveryUploadResponseDto } from './dto/presign-delivery-upload-response.dto';
import type {
  SubmitDeliveryDto,
  SubmitDeliveryResponseDto,
} from './dto/submit-delivery.dto';
import { computeDeliveryDeadlines } from './delivery-deadline.util';
import type { OrderDeliveriesResponseDto } from './dto/order-deliveries-response.dto';
import type { OrderDeliveryItemDto } from './dto/order-delivery-item.dto';
import type { OrderDeliveryAssetDto } from './dto/order-delivery-asset.dto';
import type {
  CreatorDeliveriesResponseDto,
  CreatorDeliveryItemDto,
} from './dto/creator-deliveries-response.dto';
import type {
  OrderRevisionsResponseDto,
  OrderRevisionItemDto,
} from './dto/order-revisions-response.dto';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { OrderMailNotifier } from '../mail/order-mail.notifier';
import { OrderRealtimeNotifier } from '../realtime/order-realtime.notifier';
import { StorageService } from '../storage/storage.service';
import { WatermarkQueueService } from '../jobs/watermark-queue.service';
import { withOrderInboxActivityOnUpdate } from '../order-chat/order-chat-order-snapshot';

/**
 * Nested `BrandProfile` fields for order API brand snapshots.
 * Cast so Prisma accepts the select object even if generated types lag (run `npx prisma generate` in `server/` after schema changes).
 */
const orderBrandSnapshotSelect = {
  id: true,
  brandName: true,
  logoUrl: true,
} as Prisma.BrandProfileSelect;

type OrderBrandSnapshotDto = {
  id: string;
  brandName: string;
  logoUrl: string | null;
};

function toOrderBrandSnapshotDto(brand: unknown): OrderBrandSnapshotDto {
  const b = brand as OrderBrandSnapshotDto;
  return {
    id: b.id,
    brandName: b.brandName,
    logoUrl: b.logoUrl ?? null,
  };
}

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

function mapDeliverablesSnapshot(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function mapDeliveryAssets(value: Prisma.JsonValue): OrderDeliveryAssetDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null))
    .filter(Boolean)
    .map((a: any) => ({
      key: typeof a.key === 'string' ? a.key : '',
      kind: a.kind === 'video' || a.kind === 'image' ? a.kind : null,
      url: typeof a.url === 'string' ? a.url : '',
    }))
    .filter((a) => a.key && a.url && (a.kind === 'video' || a.kind === 'image')) as any;
}

/**
 * Brand-facing asset mapping with watermark gating.
 *
 * - Order accepted  → return the original file URL (brand has paid, full access).
 * - Not yet accepted → return the watermarked preview URL. If the preview is
 *   still being generated, `url` is empty and `previewStatus` tells the client
 *   to show a "preview generating" state instead of the original.
 */
function mapBrandDeliveryAssets(
  value: Prisma.JsonValue,
  opts: { accepted: boolean; previewStatus?: string | null },
): OrderDeliveryAssetDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null))
    .filter(Boolean)
    .map((a: any) => {
      const kind: 'video' | 'image' | null =
        a.kind === 'video' || a.kind === 'image' ? a.kind : null;
      const key = typeof a.key === 'string' ? a.key : '';
      const originalUrl = typeof a.url === 'string' ? a.url : '';
      const previewUrl = typeof a.previewUrl === 'string' ? a.previewUrl : '';

      if (opts.accepted) {
        return { key, kind, url: originalUrl };
      }
      return {
        key,
        kind,
        // Never expose the original URL before acceptance.
        url: previewUrl,
        watermarked: true,
        previewStatus: (previewUrl ? 'ready' : opts.previewStatus) ?? 'pending',
      };
    })
    .filter((a) => a.key && (a.kind === 'video' || a.kind === 'image')) as any;
}

/** Calendar day YYYY-MM-DD as UTC midnight (validated). */
function parseDispatchDateUtcYmd(ymd: string): Date {
  const parts = ymd.split('-').map((p) => Number(p));
  if (parts.length !== 3) throw new BadRequestException('Invalid dispatchDate');
  const [y, m, d] = parts;
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    throw new BadRequestException('Invalid dispatchDate');
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new BadRequestException('Invalid dispatchDate');
  }
  return dt;
}

function canCreatorUploadOrSubmitDelivery(order: {
  status: OrderStatus | string;
  requiresPhysicalProductShipment: boolean;
}): boolean {
  const st = String(order.status);
  if (st === 'REVISION_REQUESTED' || st === 'REVISION_SUBMITTED') return true;
  if (st === 'DELIVERED') return true;
  if (order.requiresPhysicalProductShipment) return st === 'PRODUCT_RECEIVED';
  return st === 'BRIEF_ACCEPTED';
}

function extractAddOnIdsFromSnapshot(snapshot: Prisma.JsonValue): string[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
      const id = (item as { id?: unknown }).id;
      return typeof id === 'string' ? id : '';
    })
    .filter(Boolean)
    .sort();
}

function sortedAddOnIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

type CheckoutSessionResult = {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  packageAmountPaise: number;
  addOnsAmountPaise: number;
  addOnsCount: number;
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly orderRealtime: OrderRealtimeNotifier,
    private readonly orderMail: OrderMailNotifier,
    private readonly storage: StorageService,
    private readonly brandAccess: BrandAccessService,
    private readonly watermarkQueue: WatermarkQueueService,
  ) {}

  private async resolveBrandActor(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }) {
    return this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId ?? null,
    });
  }

  private buildCheckoutSessionResult(params: {
    orderId: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    packageAmountPaise: number;
    addOnsAmountPaise: number;
    addOnsCount: number;
  }): CheckoutSessionResult {
    return {
      orderId: params.orderId,
      razorpayOrderId: params.razorpayOrderId,
      amountPaise: params.amountPaise,
      currency: params.currency,
      razorpayKeyId: this.razorpay.getPublicKeyId(),
      packageAmountPaise: params.packageAmountPaise,
      addOnsAmountPaise: params.addOnsAmountPaise,
      addOnsCount: params.addOnsCount,
    };
  }

  /** Reject other awaiting-payment orders for the same brand+creator pair. */
  private async rejectOtherPendingOrdersForBrandCreator(
    brandId: string,
    creatorId: string,
    keepOrderId: string,
  ): Promise<void> {
    await this.prisma.order.updateMany({
      where: {
        brandId,
        creatorId,
        status: 'PENDING_PAYMENT',
        NOT: { id: keepOrderId },
      },
      data: { status: 'REJECTED' },
    });
  }

  private async createRazorpayOrderForPlatformOrder(params: {
    orderId: string;
    amountPaise: number;
    currency: string;
    brandProfileId: string;
    creatorProfileId: string;
    creatorPackageId: string;
  }): Promise<string> {
    const rzpOrder = await this.razorpay.createOrder({
      amountPaise: params.amountPaise,
      currency: params.currency,
      receipt: params.orderId,
      notes: {
        platformOrderId: params.orderId,
        brandProfileId: params.brandProfileId,
        creatorProfileId: params.creatorProfileId,
        creatorPackageId: params.creatorPackageId,
      },
    });
    return rzpOrder.id;
  }

  async createCheckout(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    creatorId: string;
    packageId: string;
    addOnIds?: string[];
  }): Promise<CheckoutSessionResult> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

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

    // A purchased delivery-affecting add-on (Faster Delivery) overrides the
    // package delivery time. min() is defensive against any data drift.
    const fasterAddOn = addOnRows.find((a) => a.deliveryDays != null);
    const effectiveDeliveryDays =
      fasterAddOn?.deliveryDays != null
        ? Math.min(pkg.deliveryDays, fasterAddOn.deliveryDays)
        : pkg.deliveryDays;

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
      deliveryDays: a.deliveryDays ?? null,
    }));
    const sortedAddOnIds = [...addOnIdList].sort();

    const pendingForCreator = await this.prisma.order.findMany({
      where: {
        brandId: brand.id,
        creatorId: pkg.creatorId,
        status: 'PENDING_PAYMENT',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        creatorPackageId: true,
        addOnsSnapshot: true,
        expectedAmountPaise: true,
        currency: true,
        razorpayOrderId: true,
      },
    });

    const matchingPackageOrder = pendingForCreator.find(
      (order) => order.creatorPackageId === pkg.id,
    );

    if (matchingPackageOrder) {
      const existingAddOnIds = extractAddOnIdsFromSnapshot(
        matchingPackageOrder.addOnsSnapshot,
      );
      const sameCart =
        sortedAddOnIdsEqual(existingAddOnIds, sortedAddOnIds) &&
        matchingPackageOrder.expectedAmountPaise === amountPaise;

      if (sameCart) {
        let razorpayOrderId = matchingPackageOrder.razorpayOrderId;
        if (!razorpayOrderId) {
          razorpayOrderId = await this.createRazorpayOrderForPlatformOrder({
            orderId: matchingPackageOrder.id,
            amountPaise,
            currency: matchingPackageOrder.currency,
            brandProfileId: brand.id,
            creatorProfileId: pkg.creatorId,
            creatorPackageId: pkg.id,
          });
          await this.updateOrder({
            where: { id: matchingPackageOrder.id },
            data: { razorpayOrderId },
          });
        }

        await this.rejectOtherPendingOrdersForBrandCreator(
          brand.id,
          pkg.creatorId,
          matchingPackageOrder.id,
        );

        this.logger.debug(
          `checkout reused pending order=${matchingPackageOrder.id}`,
        );

        return this.buildCheckoutSessionResult({
          orderId: matchingPackageOrder.id,
          razorpayOrderId,
          amountPaise: matchingPackageOrder.expectedAmountPaise,
          currency: matchingPackageOrder.currency,
          packageAmountPaise,
          addOnsAmountPaise,
          addOnsCount: addOnRows.length,
        });
      }

      const razorpayOrderId = await this.createRazorpayOrderForPlatformOrder({
        orderId: matchingPackageOrder.id,
        amountPaise,
        currency: matchingPackageOrder.currency,
        brandProfileId: brand.id,
        creatorProfileId: pkg.creatorId,
        creatorPackageId: pkg.id,
      });

      await this.updateOrder({
        where: { id: matchingPackageOrder.id },
        data: {
          packageNameSnapshot: pkg.name,
          deliverablesSnapshot:
            pkg.deliverables as unknown as Prisma.InputJsonValue,
          priceAmountSnapshot: pkg.priceAmount,
          deliveryDaysSnapshot: effectiveDeliveryDays,
          maxRevisionsSnapshot: pkg.maxRevisions,
          addOnsSnapshot: addOnsSnapshot as unknown as Prisma.InputJsonValue,
          addOnsTotalSnapshot: addOnsTotalDecimal,
          expectedAmountPaise: amountPaise,
          razorpayOrderId,
        },
      });

      await this.rejectOtherPendingOrdersForBrandCreator(
        brand.id,
        pkg.creatorId,
        matchingPackageOrder.id,
      );

      this.logger.debug(
        `checkout refreshed pending order=${matchingPackageOrder.id}`,
      );

      return this.buildCheckoutSessionResult({
        orderId: matchingPackageOrder.id,
        razorpayOrderId,
        amountPaise,
        currency: matchingPackageOrder.currency,
        packageAmountPaise,
        addOnsAmountPaise,
        addOnsCount: addOnRows.length,
      });
    }

    const created = await this.prisma.order.create({
      data: {
        brandId: brand.id,
        creatorId: pkg.creatorId,
        creatorPackageId: pkg.id,
        status: 'PENDING_PAYMENT',
        packageNameSnapshot: pkg.name,
        deliverablesSnapshot:
          pkg.deliverables as unknown as Prisma.InputJsonValue,
        priceAmountSnapshot: pkg.priceAmount,
        currency: 'INR',
        deliveryDaysSnapshot: effectiveDeliveryDays,
        maxRevisionsSnapshot: pkg.maxRevisions,
        addOnsSnapshot: addOnsSnapshot as unknown as Prisma.InputJsonValue,
        addOnsTotalSnapshot: addOnsTotalDecimal,
        expectedAmountPaise: amountPaise,
      },
      select: { id: true, currency: true },
    });

    const razorpayOrderId = await this.createRazorpayOrderForPlatformOrder({
      orderId: created.id,
      amountPaise,
      currency: created.currency,
      brandProfileId: brand.id,
      creatorProfileId: pkg.creatorId,
      creatorPackageId: pkg.id,
    });

    await this.updateOrder({
      where: { id: created.id },
      data: { razorpayOrderId },
    });

    await this.rejectOtherPendingOrdersForBrandCreator(
      brand.id,
      pkg.creatorId,
      created.id,
    );

    return this.buildCheckoutSessionResult({
      orderId: created.id,
      razorpayOrderId,
      amountPaise,
      currency: created.currency,
      packageAmountPaise,
      addOnsAmountPaise,
      addOnsCount: addOnRows.length,
    });
  }

  async resumeCheckout(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    orderId: string;
  }): Promise<CheckoutSessionResult> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        creatorId: true,
        creatorPackageId: true,
        status: true,
        currency: true,
        expectedAmountPaise: true,
        priceAmountSnapshot: true,
        addOnsTotalSnapshot: true,
        addOnsSnapshot: true,
        razorpayOrderId: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.brandId !== brand.id) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not awaiting payment');
    }
    if (!order.creatorPackageId) {
      throw new BadRequestException('Order cannot be paid');
    }
    if (order.expectedAmountPaise <= 0) {
      throw new BadRequestException('Invalid checkout amount');
    }

    const packageAmountPaise = toPaise(order.priceAmountSnapshot);
    const addOnsAmountPaise =
      order.addOnsTotalSnapshot === null
        ? 0
        : toPaise(order.addOnsTotalSnapshot);
    const addOnsCount = extractAddOnIdsFromSnapshot(order.addOnsSnapshot).length;

    let razorpayOrderId = order.razorpayOrderId;
    if (!razorpayOrderId) {
      razorpayOrderId = await this.createRazorpayOrderForPlatformOrder({
        orderId: order.id,
        amountPaise: order.expectedAmountPaise,
        currency: order.currency,
        brandProfileId: brand.id,
        creatorProfileId: order.creatorId,
        creatorPackageId: order.creatorPackageId,
      });
      await this.updateOrder({
        where: { id: order.id },
        data: { razorpayOrderId },
      });
    }

    return this.buildCheckoutSessionResult({
      orderId: order.id,
      razorpayOrderId,
      amountPaise: order.expectedAmountPaise,
      currency: order.currency,
      packageAmountPaise,
      addOnsAmountPaise,
      addOnsCount,
    });
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

    await this.updateOrder({
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
    actorUserId: string;
    brandProfileId?: string | null;
    orderId: string;
    briefId: string;
  }): Promise<void> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        status: true,
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

    const brief = await this.prisma.brief.findFirst({
      where: { id: params.briefId, brandId: brand.id },
      select: {
        id: true,
        willShipPhysicalProductToCreator: true,
        isProduct: true,
        productImageKey: true,
      },
    });
    if (!brief) {
      throw new NotFoundException('Brief not found for this brand');
    }
    if (brief.isProduct && !brief.productImageKey?.trim()) {
      throw new BadRequestException(
        'Brief must include a product image before it can be submitted to an order for product campaigns',
      );
    }

    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'BRIEF_SUBMITTED',
        briefId: params.briefId,
        briefSubmittedAt: now,
        requiresPhysicalProductShipment: brief.willShipPhysicalProductToCreator,
      },
    });

    await this.orderRealtime.emitOrderBriefSubmitted({
      orderId: order.id,
      briefSubmittedAt: now,
    });

    this.orderMail.notifyBriefSubmitted(order.id, now);
  }

  async acceptBrief(params: {
    creatorUserId: string;
    orderId: string;
  }): Promise<AcceptBriefResponseDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        briefSubmittedAt: true,
        briefAcceptedAt: true,
        deliveryDaysSnapshot: true,
        requiresPhysicalProductShipment: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id)
      throw new ForbiddenException('Not your order');

    if (String(order.status) === 'BRIEF_ACCEPTED') {
      if (!order.briefAcceptedAt) {
        throw new BadRequestException('Brief acceptance timestamp missing');
      }
      return {
        orderId: order.id,
        status: 'BRIEF_ACCEPTED',
        briefAcceptedAt: order.briefAcceptedAt,
        requiresPhysicalProductShipment: order.requiresPhysicalProductShipment,
        deliveryDueAt: order.deliveryDueAt,
        deliveryGraceDeadlineAt: order.deliveryGraceDeadlineAt,
      };
    }

    if (String(order.status) !== 'BRIEF_SUBMITTED') {
      throw new BadRequestException('Order is not awaiting brief acceptance');
    }
    if (!order.briefSubmittedAt) {
      throw new BadRequestException('No submitted brief on this order');
    }

    const now = new Date();
    const deadlines = order.requiresPhysicalProductShipment
      ? null
      : computeDeliveryDeadlines(now, order.deliveryDaysSnapshot);

    const updated = await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'BRIEF_ACCEPTED',
        briefAcceptedAt: now,
        ...(deadlines
          ? {
              deliveryDueAt: deadlines.deliveryDueAt,
              deliveryGraceDeadlineAt: deadlines.deliveryGraceDeadlineAt,
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        briefAcceptedAt: true,
        requiresPhysicalProductShipment: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
      },
    });

    await this.orderRealtime.emitOrderBriefAccepted({
      orderId: order.id,
      briefAcceptedAt: now,
      deliveryDueAt: deadlines?.deliveryDueAt ?? null,
      deliveryGraceDeadlineAt: deadlines?.deliveryGraceDeadlineAt ?? null,
    });

    this.orderMail.notifyBriefAccepted(order.id, deadlines?.deliveryDueAt ?? null);

    return {
      orderId: updated.id,
      status: updated.status,
      briefAcceptedAt: updated.briefAcceptedAt!,
      requiresPhysicalProductShipment: updated.requiresPhysicalProductShipment,
      deliveryDueAt: updated.deliveryDueAt,
      deliveryGraceDeadlineAt: updated.deliveryGraceDeadlineAt,
    };
  }

  async markProductShipped(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    orderId: string;
    courierName: string;
    trackingId?: string | null;
    dispatchDateYmd: string;
  }): Promise<void> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        status: true,
        requiresPhysicalProductShipment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id)
      throw new ForbiddenException('Not your order');
    if (!order.requiresPhysicalProductShipment) {
      throw new BadRequestException(
        'This order does not require physical shipment to the creator',
      );
    }
    if (String(order.status) === 'PRODUCT_SHIPPED') return;
    if (String(order.status) !== 'BRIEF_ACCEPTED') {
      throw new BadRequestException(
        'Order must be BRIEF_ACCEPTED before marking product shipped',
      );
    }

    const dispatchedAt = parseDispatchDateUtcYmd(params.dispatchDateYmd);
    const courierName = params.courierName.trim();
    const trackingTrimmed = params.trackingId?.trim();
    const trackingId =
      trackingTrimmed && trackingTrimmed.length > 0 ? trackingTrimmed : null;

    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'PRODUCT_SHIPPED',
        courierName,
        trackingId,
        dispatchedAt,
      },
    });

    await this.orderRealtime.emitOrderProductShipped({
      orderId: order.id,
      courierName,
      trackingId,
      dispatchedAt,
    });

    this.orderMail.notifyProductShipped(order.id, {
      courierName,
      trackingId,
      dispatchedAt,
    });
  }

  async markProductReceived(params: {
    creatorUserId: string;
    orderId: string;
  }): Promise<MarkProductReceivedResponseDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        requiresPhysicalProductShipment: true,
        deliveryDaysSnapshot: true,
        productReceivedAt: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id)
      throw new ForbiddenException('Not your order');
    if (!order.requiresPhysicalProductShipment) {
      throw new BadRequestException(
        'This order does not use the physical shipment workflow',
      );
    }
    if (String(order.status) === 'PRODUCT_RECEIVED') {
      if (
        !order.productReceivedAt ||
        !order.deliveryDueAt ||
        !order.deliveryGraceDeadlineAt
      ) {
        throw new BadRequestException('Product receipt timestamps missing');
      }
      return {
        orderId: order.id,
        status: 'PRODUCT_RECEIVED',
        productReceivedAt: order.productReceivedAt,
        deliveryDueAt: order.deliveryDueAt,
        deliveryGraceDeadlineAt: order.deliveryGraceDeadlineAt,
      };
    }
    if (String(order.status) !== 'PRODUCT_SHIPPED') {
      throw new BadRequestException(
        'Order must be PRODUCT_SHIPPED before confirming receipt',
      );
    }

    const now = new Date();
    const deadlines = computeDeliveryDeadlines(now, order.deliveryDaysSnapshot);

    const updated = await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'PRODUCT_RECEIVED',
        productReceivedAt: now,
        deliveryDueAt: deadlines.deliveryDueAt,
        deliveryGraceDeadlineAt: deadlines.deliveryGraceDeadlineAt,
      },
      select: {
        id: true,
        status: true,
        productReceivedAt: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
      },
    });

    await this.orderRealtime.emitOrderProductReceived({
      orderId: order.id,
      productReceivedAt: now,
      deliveryDueAt: deadlines.deliveryDueAt,
      deliveryGraceDeadlineAt: deadlines.deliveryGraceDeadlineAt,
    });

    this.orderMail.notifyProductReceived(order.id, deadlines.deliveryDueAt);

    return {
      orderId: updated.id,
      status: updated.status,
      productReceivedAt: updated.productReceivedAt!,
      deliveryDueAt: updated.deliveryDueAt!,
      deliveryGraceDeadlineAt: updated.deliveryGraceDeadlineAt!,
    };
  }

  async presignDeliveryUploads(params: {
    orderId: string;
    creatorUserId: string;
    dto: PresignDeliveryUploadDto;
  }): Promise<PresignDeliveryUploadResponseDto> {
    const creator: any = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        acceptedAt: true,
        revisionCount: true,
        maxRevisionsSnapshot: true,
        requiresPhysicalProductShipment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id) throw new ForbiddenException('Not your order');
    if (order.acceptedAt) {
      throw new BadRequestException('Order is already accepted');
    }

    if (
      !canCreatorUploadOrSubmitDelivery({
        status: order.status,
        requiresPhysicalProductShipment: order.requiresPhysicalProductShipment,
      })
    ) {
      if (
        order.requiresPhysicalProductShipment &&
        String(order.status) === 'BRIEF_ACCEPTED'
      ) {
        throw new BadRequestException(
          'Brand must mark the product as shipped before you can upload delivery',
        );
      }
      if (String(order.status) === 'PRODUCT_SHIPPED') {
        throw new BadRequestException(
          'Confirm product received before uploading delivery',
        );
      }
      throw new BadRequestException('Order is not ready for delivery uploads');
    }

    if (
      order.status === 'REVISION_REQUESTED' &&
      order.revisionCount > order.maxRevisionsSnapshot
    ) {
      throw new BadRequestException('Max revisions reached for this order');
    }

    const isRevisionFlow =
      String(order.status) === 'REVISION_REQUESTED' ||
      String(order.status) === 'REVISION_SUBMITTED';
    const revisionNumber = isRevisionFlow ? order.revisionCount : 0;

    const uploads = await Promise.all(
      params.dto.files.map(async (f) => {
        const key = this.storage.buildObjectKey({
          kind: 'order_delivery_asset',
          userId: params.creatorUserId,
          orderId: order.id,
          revisionNumber,
          contentType: f.contentType,
        });
        return this.storage.createPresignedPutUpload({
          key,
          contentType: f.contentType,
          contentLength: f.contentLength,
        });
      }),
    );

    return { uploads };
  }

  async submitDelivery(params: {
    orderId: string;
    creatorUserId: string;
    dto: SubmitDeliveryDto;
  }): Promise<SubmitDeliveryResponseDto> {
    const creator: any = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        revisionCount: true,
        deliveredAt: true,
        acceptedAt: true,
        requiresPhysicalProductShipment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id) throw new ForbiddenException('Not your order');

    if (order.acceptedAt) {
      throw new BadRequestException('Order is already accepted');
    }

    if (
      !canCreatorUploadOrSubmitDelivery({
        status: order.status,
        requiresPhysicalProductShipment: order.requiresPhysicalProductShipment,
      })
    ) {
      if (
        order.requiresPhysicalProductShipment &&
        String(order.status) === 'BRIEF_ACCEPTED'
      ) {
        throw new BadRequestException(
          'Brand must mark the product as shipped before you can submit delivery',
        );
      }
      if (String(order.status) === 'PRODUCT_SHIPPED') {
        throw new BadRequestException(
          'Confirm product received before submitting delivery',
        );
      }
      throw new BadRequestException('Order is not ready for delivery submission');
    }

    const expectedPrefix = `order-deliveries/${order.id}/`;
    for (const a of params.dto.assets ?? []) {
      if (!a.key?.startsWith(expectedPrefix)) {
        throw new BadRequestException('Invalid delivery asset key');
      }
    }

    const isRevisionFlow =
      String(order.status) === 'REVISION_REQUESTED' ||
      String(order.status) === 'REVISION_SUBMITTED';
    const revisionNumber = isRevisionFlow ? order.revisionCount : 0;
    const nextStatus = isRevisionFlow
      ? ('REVISION_SUBMITTED' as const)
      : ('DELIVERED' as const);

    const submitted = params.dto.assets ?? [];

    // ---- Duplicate-content prevention (when client supplies SHA-256) ----
    const submittedHashes = submitted
      .map((a) => a.sha256?.trim().toLowerCase())
      .filter((h): h is string => !!h);

    // Reject duplicates inside the same submission.
    const seenInBatch = new Set<string>();
    for (const h of submittedHashes) {
      if (seenInBatch.has(h)) {
        throw new BadRequestException(
          'Duplicate file detected in this submission. Each file must be unique.',
        );
      }
      seenInBatch.add(h);
    }

    // Reject files already submitted in another revision of this order.
    if (submittedHashes.length > 0) {
      const priorDeliveries: any[] = await (
        this.prisma as any
      ).orderDelivery.findMany({
        where: { orderId: order.id, revisionNumber: { not: revisionNumber } },
        select: { assets: true },
      });
      const priorHashes = new Set<string>();
      for (const d of priorDeliveries) {
        for (const a of Array.isArray(d.assets) ? d.assets : []) {
          if (a && typeof a.sha256 === 'string') {
            priorHashes.add(a.sha256.toLowerCase());
          }
        }
      }
      const dup = submittedHashes.find((h) => priorHashes.has(h));
      if (dup) {
        throw new BadRequestException(
          'One or more files were already submitted for this order in a previous revision.',
        );
      }
    }

    const assets = submitted.map((a) => ({
      key: a.key,
      kind: a.kind,
      url: this.storage.buildCdnUrl(a.key),
      sha256: a.sha256?.trim().toLowerCase() || null,
      previewKey: null as string | null,
      previewUrl: null as string | null,
    }));

    let deliveryId: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      const saved = await (tx as any).orderDelivery.upsert({
        where: {
          orderId_revisionNumber: {
            orderId: order.id,
            revisionNumber,
          },
        },
        create: {
          orderId: order.id,
          creatorId: creator.id,
          revisionNumber,
          assets: assets as any,
          note: params.dto.note?.trim() || null,
          previewStatus: 'pending',
        },
        update: {
          assets: assets as any,
          note: params.dto.note?.trim() || null,
          previewStatus: 'pending',
        },
        select: { id: true },
      });
      deliveryId = saved.id;
      await this.updateOrder(
        {
          where: { id: order.id },
          data: {
            status: nextStatus as any,
            deliveredAt: order.deliveredAt ?? new Date(),
          } as any,
        },
        tx,
      );
    });

    // Kick off watermarking of the brand-facing preview copies. Non-blocking:
    // failures are caught and retried by the queue / reconcile cron.
    if (deliveryId) {
      await this.watermarkQueue.enqueue(deliveryId);
    }

    if (nextStatus === 'DELIVERED' || nextStatus === 'REVISION_SUBMITTED') {
      this.orderMail.notifyContentDelivered(order.id, {
        revisionNumber,
        deliveredAt:
          nextStatus === 'REVISION_SUBMITTED'
            ? new Date()
            : (order.deliveredAt ?? new Date()),
      });
    }

    return {
      orderId: order.id,
      revisionNumber,
      status: nextStatus,
    };
  }

  async requestRevision(params: {
    orderId: string;
    actorUserId: string;
    brandProfileId?: string | null;
    note?: string | null;
  }): Promise<void> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        status: true,
        revisionCount: true,
        maxRevisionsSnapshot: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');

    const allowed = new Set(['DELIVERED', 'REVISION_SUBMITTED']);
    if (!allowed.has(String(order.status))) {
      throw new BadRequestException('Order is not eligible for revision request');
    }
    if (order.revisionCount >= order.maxRevisionsSnapshot) {
      throw new BadRequestException('Max revisions reached for this order');
    }

    const newRevisionNumber = order.revisionCount + 1;
    const trimmedNote = params.note?.trim() || null;

    await this.prisma.$transaction(async (tx) => {
      await this.updateOrder(
        {
          where: { id: order.id },
          data: {
            status: 'REVISION_REQUESTED' as any,
            revisionCount: newRevisionNumber,
          } as any,
        },
        tx,
      );
      await (tx as any).orderRevision.create({
        data: {
          orderId: order.id,
          revisionNumber: newRevisionNumber,
          note: trimmedNote,
          requestedByUserId: params.actorUserId,
        },
      });
    });

    this.orderMail.notifyRevisionRequested(order.id, trimmedNote);
    void this.orderRealtime.emitOrderRevisionRequested({
      orderId: order.id,
      revisionNumber: newRevisionNumber,
      note: trimmedNote,
      revisionsRemaining: order.maxRevisionsSnapshot - newRevisionNumber,
    });
  }

  async listRevisionsForOrder(params: {
    orderId: string;
    viewerUserId: string;
  }): Promise<OrderRevisionsResponseDto> {
    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        creatorId: true,
        brand: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isAdminUser = await this.isAdminUser(params.viewerUserId);
    const isBrand = order.brand.userId === params.viewerUserId;
    const isCreator = order.creator.userId === params.viewerUserId;
    if (!isBrand && !isCreator && !isAdminUser) {
      throw new ForbiddenException('Not your order');
    }

    const rows: any[] = await (this.prisma as any).orderRevision.findMany({
      where: { orderId: order.id },
      orderBy: { revisionNumber: 'asc' },
      select: {
        id: true,
        revisionNumber: true,
        note: true,
        createdAt: true,
      },
    });

    const items: OrderRevisionItemDto[] = rows.map((r) => ({
      id: r.id,
      revisionNumber: r.revisionNumber,
      note: r.note ?? null,
      requestedAt: r.createdAt,
    }));

    return { items };
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
    briefId: string | null;
    briefSubmittedAt: Date | null;
    briefAcceptedAt: Date | null;
    requiresPhysicalProductShipment: boolean;
    deliveryDueAt: Date | null;
    deliveryGraceDeadlineAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrderListSummaryDto {
    const hasBrief = order.briefSubmittedAt != null;
    return {
      id: order.id,
      status: order.status,
      packageNameSnapshot: order.packageNameSnapshot,
      priceAmountSnapshot: order.priceAmountSnapshot.toString(),
      currency: order.currency,
      deliveryDaysSnapshot: order.deliveryDaysSnapshot,
      paidAt: order.paidAt,
      briefSubmittedAt: order.briefSubmittedAt,
      briefAcceptedAt: order.briefAcceptedAt,
      requiresPhysicalProductShipment: order.requiresPhysicalProductShipment,
      hasBrief,
      ...(hasBrief && order.briefId ? { briefId: order.briefId } : {}),
      deliveryDueAt: order.deliveryDueAt,
      deliveryGraceDeadlineAt: order.deliveryGraceDeadlineAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapOrderDetails(order: {
    id: string;
    status: OrderStatus;
    packageNameSnapshot: string;
    deliverablesSnapshot: Prisma.JsonValue;
    priceAmountSnapshot: Prisma.Decimal;
    currency: string;
    deliveryDaysSnapshot: number;
    maxRevisionsSnapshot: number;
    addOnsSnapshot: Prisma.JsonValue;
    addOnsTotalSnapshot: Prisma.Decimal | null;
    expectedAmountPaise: number;
    paidAt: Date | null;
    briefId: string | null;
    briefSubmittedAt: Date | null;
    briefAcceptedAt: Date | null;
    requiresPhysicalProductShipment: boolean;
    courierName: string | null;
    trackingId: string | null;
    dispatchedAt: Date | null;
    productReceivedAt: Date | null;
    deliveryDueAt: Date | null;
    deliveryGraceDeadlineAt: Date | null;
    deliveredAt: Date | null;
    acceptedAt: Date | null;
    creatorPaidAt: Date | null;
    revisionCount: number;
    refundedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrderDetailsPublicDto {
    const addOnsRaw = Array.isArray(order.addOnsSnapshot) ? order.addOnsSnapshot : [];
    const addOnsSnapshot = addOnsRaw
      .map((v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null))
      .filter(Boolean)
      .map((a: any) => ({
        id: String(a.id ?? ''),
        name: String(a.name ?? ''),
        priceAmount: String(a.priceAmount ?? '0'),
        description: (() => {
          if (a.description == null) return null;
          if (typeof a.description === 'string') return a.description;
          return String(a.description);
        })(),
      }))
      .filter((a) => a.id && a.name);

    const hasBrief = order.briefSubmittedAt != null;

    return {
      id: order.id,
      status: order.status,
      packageNameSnapshot: order.packageNameSnapshot,
      priceAmountSnapshot: order.priceAmountSnapshot.toString(),
      currency: order.currency,
      deliveryDaysSnapshot: order.deliveryDaysSnapshot,
      paidAt: order.paidAt,
      briefSubmittedAt: order.briefSubmittedAt,
      briefAcceptedAt: order.briefAcceptedAt,
      requiresPhysicalProductShipment: order.requiresPhysicalProductShipment,
      courierName: order.courierName ?? null,
      trackingId: order.trackingId ?? null,
      dispatchedAt: order.dispatchedAt ?? null,
      productReceivedAt: order.productReceivedAt ?? null,
      hasBrief,
      ...(hasBrief && order.briefId ? { briefId: order.briefId } : {}),
      deliveryDueAt: order.deliveryDueAt,
      deliveryGraceDeadlineAt: order.deliveryGraceDeadlineAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliverablesSnapshot: mapDeliverablesSnapshot(order.deliverablesSnapshot),
      maxRevisionsSnapshot: order.maxRevisionsSnapshot,
      addOnsSnapshot,
      addOnsTotalSnapshot: order.addOnsTotalSnapshot
        ? order.addOnsTotalSnapshot.toString()
        : null,
      expectedAmountPaise: order.expectedAmountPaise,
      deliveredAt: order.deliveredAt,
      acceptedAt: order.acceptedAt,
      creatorPaidAt: order.creatorPaidAt,
      revisionCount: order.revisionCount,
      refundedAt: order.refundedAt,
    };
  }

  private mapOrderDetailsAdmin(order: {
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    razorpayRefundId: string | null;
  } & Parameters<OrdersService['mapOrderDetails']>[0]): OrderDetailsAdminDto {
    return {
      ...this.mapOrderDetails(order),
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      razorpayRefundId: order.razorpayRefundId,
    };
  }

  async getOrderDetailsForBrand(params: {
    orderId: string;
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<BrandOrderDetailsResponseDto> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        status: true,
        packageNameSnapshot: true,
        deliverablesSnapshot: true,
        priceAmountSnapshot: true,
        currency: true,
        deliveryDaysSnapshot: true,
        maxRevisionsSnapshot: true,
        addOnsSnapshot: true,
        addOnsTotalSnapshot: true,
        expectedAmountPaise: true,
        paidAt: true,
        briefId: true,
        briefSubmittedAt: true,
        briefAcceptedAt: true,
        requiresPhysicalProductShipment: true,
        courierName: true,
        trackingId: true,
        dispatchedAt: true,
        productReceivedAt: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
        deliveredAt: true,
        acceptedAt: true,
        creatorPaidAt: true,
        revisionCount: true,
        refundedAt: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            introVideoUrl: true,
            profileImageUrl: true,
            city: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');

    const { creator, brandId, ...orderFields } = order;
    return {
      order: this.mapOrderDetails(orderFields),
      creator: {
        id: creator.id,
        displayName: creator.displayName,
        introVideoUrl: creator.introVideoUrl ?? null,
        profileImageUrl: creator.profileImageUrl ?? null,
        city: creator.city ?? null,
      },
    };
  }

  async getOrderDetailsForCreator(params: {
    orderId: string;
    creatorUserId: string;
  }): Promise<CreatorOrderDetailsResponseDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        packageNameSnapshot: true,
        deliverablesSnapshot: true,
        priceAmountSnapshot: true,
        currency: true,
        deliveryDaysSnapshot: true,
        maxRevisionsSnapshot: true,
        addOnsSnapshot: true,
        addOnsTotalSnapshot: true,
        expectedAmountPaise: true,
        paidAt: true,
        briefId: true,
        briefSubmittedAt: true,
        briefAcceptedAt: true,
        requiresPhysicalProductShipment: true,
        courierName: true,
        trackingId: true,
        dispatchedAt: true,
        productReceivedAt: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
        deliveredAt: true,
        acceptedAt: true,
        creatorPaidAt: true,
        revisionCount: true,
        refundedAt: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: orderBrandSnapshotSelect,
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id) throw new ForbiddenException('Not your order');

    const { brand, creatorId, ...orderFields } = order;
    return {
      order: this.mapOrderDetails(orderFields),
      brand: toOrderBrandSnapshotDto(brand),
    };
  }

  async listDeliveriesForBrand(params: {
    orderId: string;
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<OrderDeliveriesResponseDto> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, brandId: true, acceptedAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');

    const rows: any[] = await (this.prisma as any).orderDelivery.findMany({
      where: { orderId: order.id },
      orderBy: [{ revisionNumber: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        orderId: true,
        creatorId: true,
        revisionNumber: true,
        assets: true,
        note: true,
        createdAt: true,
        previewStatus: true,
      },
    });

    // Brands only get the original files once they have accepted the order.
    // Until then they see the watermarked preview copies.
    const accepted = !!order.acceptedAt;

    const items: OrderDeliveryItemDto[] = rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      creatorId: r.creatorId,
      revisionsUsed: r.revisionNumber,
      assets: mapBrandDeliveryAssets(r.assets, {
        accepted,
        previewStatus: r.previewStatus,
      }),
      note: r.note ?? null,
      createdAt: r.createdAt,
    }));

    return { items };
  }

  async listDeliveriesForCreator(params: {
    creatorUserId: string;
    page?: number;
    limit?: number;
  }): Promise<CreatorDeliveriesResponseDto> {
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
      (this.prisma as any).orderDelivery.count({ where }),
      (this.prisma as any).orderDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          revisionNumber: true,
          assets: true,
          note: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              status: true,
              brand: {
                select: {
                  brandName: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items: CreatorDeliveryItemDto[] = rows.map((r: any) => ({
      id: r.id,
      orderId: r.orderId,
      revisionNumber: r.revisionNumber,
      assets: mapDeliveryAssets(r.assets),
      note: r.note ?? null,
      createdAt: r.createdAt,
      order: {
        id: r.order.id,
        status: String(r.order.status),
        brandName: r.order.brand?.brandName ?? '',
        brandLogoUrl: r.order.brand?.logoUrl ?? null,
      },
    }));

    return { items, total, page, limit };
  }

  async getOrderDetailsForAdmin(params: {
    orderId: string;
  }): Promise<AdminOrderDetailsResponseDto> {
    const order: any = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        status: true,
        packageNameSnapshot: true,
        deliverablesSnapshot: true,
        priceAmountSnapshot: true,
        currency: true,
        deliveryDaysSnapshot: true,
        maxRevisionsSnapshot: true,
        addOnsSnapshot: true,
        addOnsTotalSnapshot: true,
        expectedAmountPaise: true,
        paidAt: true,
        briefId: true,
        briefSubmittedAt: true,
        briefAcceptedAt: true,
        requiresPhysicalProductShipment: true,
        courierName: true,
        trackingId: true,
        dispatchedAt: true,
        productReceivedAt: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
        deliveredAt: true,
        acceptedAt: true,
        creatorPaidAt: true,
        revisionCount: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        razorpayRefundId: true,
        refundedAt: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            introVideoUrl: true,
            profileImageUrl: true,
            city: true,
          },
        },
        brand: {
          select: orderBrandSnapshotSelect,
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const { creator, brand, ...orderFields } = order;
    return {
      order: this.mapOrderDetailsAdmin(orderFields),
      creator: {
        id: creator.id,
        displayName: creator.displayName,
        introVideoUrl: creator.introVideoUrl ?? null,
        profileImageUrl: creator.profileImageUrl ?? null,
        city: creator.city ?? null,
      },
      brand: toOrderBrandSnapshotDto(brand),
    };
  }

  async listOrdersForBrand(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    page?: number;
    limit?: number;
  }): Promise<BrandOrdersListResponseDto> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

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
          briefId: true,
          briefSubmittedAt: true,
          briefAcceptedAt: true,
          requiresPhysicalProductShipment: true,
          deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              introVideoUrl: true,
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
          introVideoUrl: creator.introVideoUrl ?? null,
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
          briefId: true,
          briefSubmittedAt: true,
          briefAcceptedAt: true,
          requiresPhysicalProductShipment: true,
          deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          brand: {
            select: orderBrandSnapshotSelect,
          },
        },
      }),
    ]);

    const items: CreatorOrderListItemDto[] = rows.map((r) => {
      const { brand, ...orderFields } = r;
      return {
        order: this.mapOrderListSummary(orderFields),
        brand: toOrderBrandSnapshotDto(brand),
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
          briefId: true,
          briefSubmittedAt: true,
          briefAcceptedAt: true,
          requiresPhysicalProductShipment: true,
          deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              introVideoUrl: true,
              profileImageUrl: true,
              city: true,
            },
          },
          brand: {
            select: orderBrandSnapshotSelect,
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
          introVideoUrl: creator.introVideoUrl ?? null,
          profileImageUrl: creator.profileImageUrl ?? null,
          city: creator.city ?? null,
        },
        brand: toOrderBrandSnapshotDto(brand),
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
        briefId: true,
        briefSubmittedAt: true,
        briefAcceptedAt: true,
        deliveryDaysSnapshot: true,
        requiresPhysicalProductShipment: true,
        deliveryDueAt: true,
        deliveryGraceDeadlineAt: true,
        briefRef: {
          select: {
            id: true,
            brandName: true,
            brandPronunciationAudioKey: true,
            brandPronunciationAudioUrl: true,
            industry: true,
            brandLogoKey: true,
            brandLogoUrl: true,
            productName: true,
            productDescription: true,
            productPageUrl: true,
            productImageKey: true,
            productImageUrl: true,
            isProduct: true,
            willShipPhysicalProductToCreator: true,
            shootLocationKind: true,
            shootLocationAddress: true,
            durationBucket: true,
            contentType: true,
            toneStyle: true,
            keyNoteToInclude: true,
            ctaNote: true,
            referenceLinks: true,
            script: true,
            finalNotes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        brand: {
          select: {
            userId: true,
            agency: { select: { ownerUserId: true } },
          },
        },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const brandActorUserId =
      order.brand.userId ?? order.brand.agency?.ownerUserId ?? null;
    const isParticipant =
      brandActorUserId === params.viewerUserId ||
      order.creator.userId === params.viewerUserId;
    const isAdmin = await this.isAdminUser(params.viewerUserId);
    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('Not allowed to view this brief');
    }

    const brief: Record<string, unknown> | null = order.briefRef
      ? {
          id: order.briefRef.id,
          brandName: order.briefRef.brandName ?? null,
          brandPronunciationAudio: order.briefRef.brandPronunciationAudioKey
            ? {
                key: order.briefRef.brandPronunciationAudioKey,
                url: order.briefRef.brandPronunciationAudioUrl ?? null,
              }
            : null,
          industry: order.briefRef.industry ?? null,
          brandLogo: order.briefRef.brandLogoKey
            ? {
                key: order.briefRef.brandLogoKey,
                url: order.briefRef.brandLogoUrl ?? null,
              }
            : null,
          productName: order.briefRef.productName ?? null,
          productDescription: order.briefRef.productDescription ?? null,
          productPageUrl: order.briefRef.productPageUrl ?? null,
          productImage: order.briefRef.productImageKey
            ? {
                key: order.briefRef.productImageKey,
                url: order.briefRef.productImageUrl ?? null,
              }
            : null,
          isProduct: order.briefRef.isProduct,
          willShipPhysicalProductToCreator:
            order.briefRef.willShipPhysicalProductToCreator,
          shootLocationKind: order.briefRef.shootLocationKind ?? null,
          shootLocationAddress: order.briefRef.shootLocationAddress ?? null,
          durationBucket: order.briefRef.durationBucket ?? null,
          contentType: order.briefRef.contentType,
          toneStyle: order.briefRef.toneStyle,
          keyNoteToInclude: order.briefRef.keyNoteToInclude ?? null,
          ctaNote: order.briefRef.ctaNote ?? null,
          referenceLinks: Array.isArray(order.briefRef.referenceLinks)
            ? order.briefRef.referenceLinks
            : [],
          script:
            order.briefRef.script !== null &&
            order.briefRef.script !== undefined &&
            typeof order.briefRef.script === 'object'
              ? order.briefRef.script
              : null,
          finalNotes: order.briefRef.finalNotes ?? null,
          createdAt: order.briefRef.createdAt,
          updatedAt: order.briefRef.updatedAt,
        }
      : null;

    return {
      orderId: order.id,
      briefSubmittedAt: order.briefSubmittedAt,
      briefAcceptedAt: order.briefAcceptedAt,
      deliveryDaysSnapshot: order.deliveryDaysSnapshot,
      requiresPhysicalProductShipment: order.requiresPhysicalProductShipment,
      deliveryDueAt: order.deliveryDueAt,
      deliveryGraceDeadlineAt: order.deliveryGraceDeadlineAt,
      brief,
    };
  }

  async acceptDelivery(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    orderId: string;
  }): Promise<void> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

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

    await this.updateOrder({
      where: { id: order.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    this.orderMail.notifyContentAccepted(order.id);
  }

  async openDispute(params: {
    orderId: string;
    openedBy: 'BRAND' | 'CREATOR';
    openerUserId: string;
    brandProfileId?: string | null;
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
      const { brand } = await this.resolveBrandActor({
        actorUserId: params.openerUserId,
        brandProfileId: params.brandProfileId,
      });
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

    await this.prisma.$transaction(async (tx) => {
      await tx.orderDispute.create({
        data: {
          orderId: order.id,
          openedBy: params.openedBy,
          reason: params.reason,
          status: 'OPEN',
        },
      });
      await this.updateOrder(
        {
          where: { id: order.id },
          data: { status: 'DISPUTED' },
        },
        tx,
      );
    });
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
      select: { id: true, status: true, creatorPaidAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Order must be ACCEPTED before marking creator paid',
      );
    }
    if (order.creatorPaidAt) return;

    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'CREATOR_PAYMENT_DONE',
        creatorPaidAt: new Date(),
      },
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

    await this.prisma.$transaction(async (tx) => {
      await tx.orderDispute.updateMany({
        where: { orderId: order.id, status: 'OPEN' },
        data: {
          status: 'RESOLVED_REFUNDED',
          resolvedAt: new Date(),
          resolvedByUserId: params.adminUserId,
          resolutionNotes: params.resolutionNotes ?? null,
        },
      });
      await this.updateOrder(
        {
          where: { id: order.id },
          data: { status: 'REJECTED' as any },
        },
        tx,
      );
    });

    this.orderMail.notifyOrderRejected(order.id, params.resolutionNotes);
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
      if (err instanceof ServiceUnavailableException) throw err;
      throw new BadRequestException(razorpayRefundErrorMessage(err));
    }

    const refundedAt = new Date();

    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'REFUNDED' as any,
        razorpayRefundId: refund.id,
        refundedAt,
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

    const refundedAt = new Date();

    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'REFUNDED' as any,
        razorpayRefundId: params.razorpayRefundId,
        refundedAt,
      },
    });

    this.orderMail.notifyOrderRefunded(order.id, refundedAt);

    return order.id;
  }

  private async updateOrder<A extends Prisma.OrderUpdateArgs>(
    args: A,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const enriched = await withOrderInboxActivityOnUpdate(client, args);
    return client.order.update(enriched);
  }
}
