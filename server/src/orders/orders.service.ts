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
import type { OrderDeliveriesResponseDto } from './dto/order-deliveries-response.dto';
import type { OrderDeliveryItemDto } from './dto/order-delivery-item.dto';
import type { OrderDeliveryAssetDto } from './dto/order-delivery-asset.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { OrderRealtimeNotifier } from '../realtime/order-realtime.notifier';
import { StorageService } from '../storage/storage.service';

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

/** deliveryDaysSnapshot + 2 calendar-day grace from the moment work can start */
function computeDeliveryDeadlineAt(
  startAt: Date,
  deliveryDaysSnapshot: number,
): Date {
  const deadline = new Date(startAt);
  deadline.setDate(deadline.getDate() + deliveryDaysSnapshot + 2);
  return deadline;
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

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly orderRealtime: OrderRealtimeNotifier,
    private readonly storage: StorageService,
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
    briefId: string;
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
        productImageKey: true,
      },
    });
    if (!brief) {
      throw new NotFoundException('Brief not found for this brand');
    }
    if (!brief.productImageKey?.trim()) {
      throw new BadRequestException(
        'Brief must include a product image before it can be submitted to an order',
      );
    }

    await this.prisma.order.update({
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
        deliveryDeadlineAt: true,
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
        deliveryDeadlineAt: order.deliveryDeadlineAt,
      };
    }

    if (String(order.status) !== 'BRIEF_SUBMITTED') {
      throw new BadRequestException('Order is not awaiting brief acceptance');
    }
    if (!order.briefSubmittedAt) {
      throw new BadRequestException('No submitted brief on this order');
    }

    const now = new Date();
    const deliveryDeadlineAt = order.requiresPhysicalProductShipment
      ? null
      : computeDeliveryDeadlineAt(now, order.deliveryDaysSnapshot);

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'BRIEF_ACCEPTED',
        briefAcceptedAt: now,
        ...(deliveryDeadlineAt !== null ? { deliveryDeadlineAt } : {}),
      },
      select: {
        id: true,
        status: true,
        briefAcceptedAt: true,
        requiresPhysicalProductShipment: true,
        deliveryDeadlineAt: true,
      },
    });

    await this.orderRealtime.emitOrderBriefAccepted({
      orderId: order.id,
      briefAcceptedAt: now,
      deliveryDeadlineAt,
    });

    return {
      orderId: updated.id,
      status: updated.status,
      briefAcceptedAt: updated.briefAcceptedAt!,
      requiresPhysicalProductShipment: updated.requiresPhysicalProductShipment,
      deliveryDeadlineAt: updated.deliveryDeadlineAt,
    };
  }

  async markProductShipped(params: {
    brandUserId: string;
    orderId: string;
    courierName: string;
    trackingId?: string | null;
    dispatchDateYmd: string;
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

    await this.prisma.order.update({
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
        deliveryDeadlineAt: true,
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
      if (!order.productReceivedAt || !order.deliveryDeadlineAt) {
        throw new BadRequestException('Product receipt timestamps missing');
      }
      return {
        orderId: order.id,
        status: 'PRODUCT_RECEIVED',
        productReceivedAt: order.productReceivedAt,
        deliveryDeadlineAt: order.deliveryDeadlineAt,
      };
    }
    if (String(order.status) !== 'PRODUCT_SHIPPED') {
      throw new BadRequestException(
        'Order must be PRODUCT_SHIPPED before confirming receipt',
      );
    }

    const now = new Date();
    const deliveryDeadlineAt = computeDeliveryDeadlineAt(
      now,
      order.deliveryDaysSnapshot,
    );

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PRODUCT_RECEIVED',
        productReceivedAt: now,
        deliveryDeadlineAt,
      },
      select: {
        id: true,
        status: true,
        productReceivedAt: true,
        deliveryDeadlineAt: true,
      },
    });

    await this.orderRealtime.emitOrderProductReceived({
      orderId: order.id,
      productReceivedAt: now,
      deliveryDeadlineAt,
    });

    return {
      orderId: updated.id,
      status: updated.status,
      productReceivedAt: updated.productReceivedAt!,
      deliveryDeadlineAt: updated.deliveryDeadlineAt!,
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

    const assets = (params.dto.assets ?? []).map((a) => ({
      key: a.key,
      kind: a.kind,
      url: this.storage.buildCdnUrl(a.key),
    }));

    await this.prisma.$transaction([
      (this.prisma as any).orderDelivery.upsert({
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
        },
        update: {
          assets: assets as any,
          note: params.dto.note?.trim() || null,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus as any,
          deliveredAt: order.deliveredAt ?? new Date(),
        } as any,
      }),
    ]);

    return {
      orderId: order.id,
      revisionNumber,
      status: nextStatus,
    };
  }

  async requestRevision(params: { orderId: string; brandUserId: string }): Promise<void> {
    const brand: any = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

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

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REVISION_REQUESTED' as any,
        revisionCount: order.revisionCount + 1,
      } as any,
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
    briefId: string | null;
    briefSubmittedAt: Date | null;
    briefAcceptedAt: Date | null;
    requiresPhysicalProductShipment: boolean;
    deliveryDeadlineAt: Date | null;
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
      deliveryDeadlineAt: order.deliveryDeadlineAt,
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
    deliveryDeadlineAt: Date | null;
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
      deliveryDeadlineAt: order.deliveryDeadlineAt,
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
    brandUserId: string;
  }): Promise<BrandOrderDetailsResponseDto> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

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
        deliveryDeadlineAt: true,
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
        deliveryDeadlineAt: true,
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
    brandUserId: string;
  }): Promise<OrderDeliveriesResponseDto> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, brandId: true },
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
      },
    });

    const items: OrderDeliveryItemDto[] = rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      creatorId: r.creatorId,
      revisionsUsed: r.revisionNumber,
      assets: mapDeliveryAssets(r.assets),
      note: r.note ?? null,
      createdAt: r.createdAt,
    }));

    return { items };
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
        deliveryDeadlineAt: true,
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
        city: creator.city ?? null,
      },
      brand: toOrderBrandSnapshotDto(brand),
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
          briefId: true,
          briefSubmittedAt: true,
          briefAcceptedAt: true,
          requiresPhysicalProductShipment: true,
          deliveryDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              introVideoUrl: true,
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
          deliveryDeadlineAt: true,
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
          deliveryDeadlineAt: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              introVideoUrl: true,
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
        deliveryDeadlineAt: true,
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
      deliveryDeadlineAt: order.deliveryDeadlineAt,
      brief,
    };
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
      select: { id: true, status: true, creatorPaidAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Order must be ACCEPTED before marking creator paid',
      );
    }
    if (order.creatorPaidAt) return;

    await this.prisma.order.update({
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
