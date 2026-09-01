import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  RoleName,
  OrderStatus,
  OrderDisputeStatus,
  OrderDisputeOpenedBy,
} from '@prisma/client';
import type { CreatorAddOn } from '@prisma/client';
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
import {
  computeOrderPricingLedger,
  PLATFORM_FEE_RATE,
} from './order-pricing-ledger.util';
import type { PresignDeliveryUploadDto } from './dto/presign-delivery-upload.dto';
import type { PresignDeliveryUploadResponseDto } from './dto/presign-delivery-upload-response.dto';
import type {
  SubmitDeliveryDto,
  SubmitDeliveryResponseDto,
} from './dto/submit-delivery.dto';
import { computeDeliveryDeadlines } from './delivery-deadline.util';
import { mapUnavailabilityToPublicAvailability } from '../creator-profile/creator-unavailability.util';
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

const adminOrderBrandSnapshotSelect = {
  id: true,
  brandName: true,
  logoUrl: true,
  contactFullName: true,
  contactEmail: true,
  user: { select: { name: true, email: true } },
} as Prisma.BrandProfileSelect;

/**
 * The brand must not see the creator's real identity anywhere in the order
 * flow. Both brand-facing order snapshots (details + list) expose this generic
 * label in place of the creator's displayName, so the real name is never sent
 * to the brand's browser. Admin and creator views are unaffected.
 */
const BRAND_HIDDEN_CREATOR_NAME = 'Creator';

type OrderBrandSnapshotDto = {
  id: string;
  brandName: string | null;
  logoUrl: string | null;
  contactFullName?: string | null;
  contactEmail?: string | null;
};

function toOrderBrandSnapshotDto(brand: unknown): OrderBrandSnapshotDto {
  const b = brand as OrderBrandSnapshotDto;
  return {
    id: b.id,
    brandName: b.brandName ?? null,
    logoUrl: b.logoUrl ?? null,
  };
}

function toAdminOrderBrandSnapshotDto(brand: unknown): OrderBrandSnapshotDto {
  const b = brand as OrderBrandSnapshotDto & {
    user?: { name?: string | null; email?: string | null } | null;
  };
  const contactFullName =
    b.contactFullName?.trim() || b.user?.name?.trim() || null;
  const contactEmail =
    b.contactEmail?.trim() || b.user?.email?.trim() || null;
  return {
    id: b.id,
    brandName: b.brandName ?? null,
    logoUrl: b.logoUrl ?? null,
    contactFullName,
    contactEmail,
  };
}

function toPaise(amount: Prisma.Decimal): number {
  // priceAmount has 2 decimals; paise = * 100
  const n = Number.parseFloat(amount.toString());
  return Math.round(n * 100);
}

/** Revisions granted per "Revision" add-on — one at initial checkout and one per
 *  paid mid-order top-up purchase. */
export const REVISIONS_PER_ADDON = 1;
/** Base revisions every package includes, regardless of add-ons (fixed). */
export const BASE_INCLUDED_REVISIONS = 2;
/**
 * Catalog slug whose creator-set price is used as the unit price for buying
 * extra revisions on an order. `CreatorAddOn` has no slug column, so we resolve
 * this option's name and match the creator's row by name.
 */
const EXTRA_REVISION_OPTION_SLUG = 'extra_revision';

/** Usage-rights days granted per paid "extra usage rights" block. */
export const USAGE_RIGHTS_DAYS_PER_ADDON = 30;
/** Base content usage-rights window every order includes (descriptive text today). */
export const BASE_USAGE_RIGHTS_DAYS = 30;
/**
 * Catalog slug whose creator-set price is the unit price for buying extra
 * usage-rights time on a completed order. Resolved by name like the revision
 * add-on (`CreatorAddOn` has no slug column).
 */
const EXTRA_USAGE_RIGHTS_OPTION_SLUG = 'paid_ads_usage_30_days';

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
/**
 * Map the watermark pipeline's internal status vocabulary
 * (`pending|processing|ready|failed|dead`) onto the brand-facing DTO's
 * (`pending|ready|failed`). `processing` is still "generating"; the terminal
 * `dead` surfaces as `failed`.
 */
function normalizeBrandPreviewStatus(
  status?: string | null,
): 'pending' | 'ready' | 'failed' {
  switch (status) {
    case 'ready':
      return 'ready';
    case 'failed':
    case 'dead':
      return 'failed';
    case 'processing':
    case 'pending':
    default:
      return 'pending';
  }
}

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
        // Collapse internal pipeline states to the brand-facing vocabulary:
        // `processing` still reads as "generating" (pending); the terminal
        // `dead` reads as failed.
        previewStatus: previewUrl
          ? 'ready'
          : normalizeBrandPreviewStatus(opts.previewStatus),
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

type BulkCheckoutSkippedItem = {
  creatorId: string;
  packageId?: string;
  reason: string;
};

type BulkCheckoutSessionResult = {
  batchId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  orderCount: number;
  orderIds: string[];
  skipped: BulkCheckoutSkippedItem[];
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

  /**
   * Validate and price a single (creator, package, add-ons) item and produce
   * the fields to snapshot onto an Order. Pure computation + reads only — no
   * writes. Shared by the single-order `createCheckout` and the multi-order
   * `createBulkCheckout` so both price and validate identically. Throws
   * NotFound/BadRequest on an invalid item.
   */
  private async computeOrderDraftForItem(params: {
    creatorId: string;
    /**
     * Optional. When omitted, the creator's package is resolved by creatorId —
     * each creator has exactly one package (CreatorPackage.creatorId is unique),
     * so this is unambiguous. Lets bulk checkout work even when the client
     * doesn't have the package id (e.g. an older wishlist response).
     */
    packageId?: string;
    addOnIds?: string[];
  }): Promise<{
    pkg: Prisma.CreatorPackageGetPayload<{
      include: { creator: { include: { unavailability: true } } };
    }>;
    /** Whether the creator is currently available (not on an unavailability
     * schedule covering today). Callers decide policy — bulk checkout skips
     * unavailable creators; single checkout ignores this. */
    available: boolean;
    addOnRows: CreatorAddOn[];
    effectiveDeliveryDays: number;
    packageAmountPaise: number;
    addOnsAmountPaise: number;
    addOnsTotalDecimal: Prisma.Decimal | null;
    amountPaise: number;
    addOnsSnapshot: Array<{
      id: string;
      name: string;
      priceAmount: string;
      description: string | null;
    }>;
    /** Revision cap for the order: BASE_INCLUDED_REVISIONS + 1 per selected
     * "Revision" add-on. */
    maxRevisionsSnapshot: number;
  }> {
    const pkg = await this.prisma.creatorPackage.findFirst({
      where: params.packageId
        ? { id: params.packageId, creatorId: params.creatorId }
        : { creatorId: params.creatorId },
      include: { creator: { include: { unavailability: true } } },
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

    const effectiveDeliveryDays = pkg.deliveryDays;

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

    // Revision cap: every package includes BASE_INCLUDED_REVISIONS, and each
    // selected "Revision" add-on grants REVISIONS_PER_ADDON more. The add-on has
    // no slug on CreatorAddOn, so match by the catalog option's name.
    const revisionOption = await this.prisma.creatorAddOnOption.findUnique({
      where: { slug: EXTRA_REVISION_OPTION_SLUG },
      select: { name: true },
    });
    const revisionAddOnCount = revisionOption
      ? addOnRows.filter((a) => a.name === revisionOption.name).length
      : 0;
    const maxRevisionsSnapshot =
      BASE_INCLUDED_REVISIONS + revisionAddOnCount * REVISIONS_PER_ADDON;

    return {
      pkg,
      available: mapUnavailabilityToPublicAvailability(
        pkg.creator.unavailability ?? null,
      ).available,
      addOnRows,
      effectiveDeliveryDays,
      packageAmountPaise,
      addOnsAmountPaise,
      addOnsTotalDecimal,
      amountPaise,
      addOnsSnapshot,
      maxRevisionsSnapshot,
    };
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

    const {
      pkg,
      addOnRows,
      effectiveDeliveryDays,
      packageAmountPaise,
      addOnsAmountPaise,
      addOnsTotalDecimal,
      amountPaise,
      addOnsSnapshot,
      maxRevisionsSnapshot,
    } = await this.computeOrderDraftForItem({
      creatorId: params.creatorId,
      packageId: params.packageId,
      addOnIds: params.addOnIds,
    });

    const sortedAddOnIds = [...addOnRows.map((a) => a.id)].sort();

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
          maxRevisionsSnapshot,
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
        maxRevisionsSnapshot,
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

  /**
   * Bulk checkout: place one order per item (e.g. every creator selected from a
   * wishlist) but collect a SINGLE payment. Each item is validated + priced
   * independently via {@link computeOrderDraftForItem}; invalid items are
   * skipped (returned in `skipped`), not fatal. All valid orders are created in
   * one transaction and linked to a new OrderCheckoutBatch, which owns the one
   * Razorpay order for the grand total. The single-order flow is unaffected.
   */
  async createBulkCheckout(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    items: Array<{ creatorId: string; packageId?: string; addOnIds?: string[] }>;
  }): Promise<BulkCheckoutSessionResult> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    type DraftForItem = Awaited<
      ReturnType<OrdersService['computeOrderDraftForItem']>
    >;
    const drafts: Array<{ draft: DraftForItem }> = [];
    const skipped: BulkCheckoutSkippedItem[] = [];

    for (const item of params.items) {
      try {
        const draft = await this.computeOrderDraftForItem({
          creatorId: item.creatorId,
          packageId: item.packageId,
          addOnIds: item.addOnIds,
        });
        // Offline / on-a-break creators stay in the wishlist but can't be
        // ordered — skip them so the rest of the cart still checks out.
        if (!draft.available) {
          skipped.push({
            creatorId: item.creatorId,
            packageId: item.packageId,
            reason: 'Creator is currently unavailable',
          });
          continue;
        }
        drafts.push({ draft });
      } catch (err) {
        skipped.push({
          creatorId: item.creatorId,
          packageId: item.packageId,
          reason: err instanceof Error ? err.message : 'Invalid item',
        });
      }
    }

    if (drafts.length === 0) {
      throw new BadRequestException('No valid creators to checkout');
    }

    const currency = 'INR';
    const totalPaise = drafts.reduce((sum, d) => sum + d.draft.amountPaise, 0);

    const { batchId, orderIds } = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.orderCheckoutBatch.create({
        data: {
          brandId: brand.id,
          currency,
          expectedAmountPaise: totalPaise,
          status: 'PENDING_PAYMENT',
        },
        select: { id: true },
      });

      const ids: string[] = [];
      for (const { draft } of drafts) {
        const order = await tx.order.create({
          data: {
            brandId: brand.id,
            creatorId: draft.pkg.creatorId,
            creatorPackageId: draft.pkg.id,
            status: 'PENDING_PAYMENT',
            packageNameSnapshot: draft.pkg.name,
            deliverablesSnapshot:
              draft.pkg.deliverables as unknown as Prisma.InputJsonValue,
            priceAmountSnapshot: draft.pkg.priceAmount,
            currency,
            deliveryDaysSnapshot: draft.effectiveDeliveryDays,
            maxRevisionsSnapshot: draft.maxRevisionsSnapshot,
            addOnsSnapshot:
              draft.addOnsSnapshot as unknown as Prisma.InputJsonValue,
            addOnsTotalSnapshot: draft.addOnsTotalDecimal,
            expectedAmountPaise: draft.amountPaise,
            checkoutBatchId: batch.id,
          },
          select: { id: true },
        });
        ids.push(order.id);
      }

      return { batchId: batch.id, orderIds: ids };
    });

    // One Razorpay order for the whole cart, linked to the batch. Created after
    // the DB transaction (external call) — mirrors the single-order flow, where
    // an order exists briefly before its Razorpay order is attached.
    const rzpOrder = await this.razorpay.createOrder({
      amountPaise: totalPaise,
      currency,
      receipt: batchId,
      notes: {
        checkoutBatchId: batchId,
        brandProfileId: brand.id,
        kind: 'bulk',
      },
    });
    await this.prisma.orderCheckoutBatch.update({
      where: { id: batchId },
      data: { razorpayOrderId: rzpOrder.id },
    });

    this.logger.log(
      `bulk checkout batch=${batchId} orders=${orderIds.length} skipped=${skipped.length} totalPaise=${totalPaise}`,
    );

    return {
      batchId,
      razorpayOrderId: rzpOrder.id,
      amountPaise: totalPaise,
      currency,
      razorpayKeyId: this.razorpay.getPublicKeyId(),
      orderCount: orderIds.length,
      orderIds,
      skipped,
    };
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
   * payment.captured for a bulk-checkout batch: mark every child order paid in
   * one transaction and flip the batch to PAID. Returns the paid order ids (for
   * per-order realtime fan-out) or null if the razorpayOrderId isn't a batch,
   * the batch is already settled, or the captured amount doesn't match the
   * batch total. The single-order path ({@link markPaidFromWebhook}) is tried
   * first by the webhook; this handles the case where that returns null.
   */
  async markBatchPaidFromWebhook(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: Date;
    amountPaise?: number;
  }): Promise<string[] | null> {
    const batch = await this.prisma.orderCheckoutBatch.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, status: true, expectedAmountPaise: true },
    });
    if (!batch) return null;

    // idempotent: if already settled, do nothing
    if (batch.status !== 'PENDING_PAYMENT') return null;

    if (
      batch.expectedAmountPaise > 0 &&
      params.amountPaise != null &&
      batch.expectedAmountPaise !== params.amountPaise
    ) {
      this.logger.warn(
        `payment.captured amount mismatch batch=${batch.id} expectedPaise=${batch.expectedAmountPaise} gotPaise=${params.amountPaise} — not marking paid`,
      );
      return null;
    }

    const orders = await this.prisma.order.findMany({
      where: { checkoutBatchId: batch.id, status: 'PENDING_PAYMENT' },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const o of orders) {
        await this.updateOrder(
          {
            where: { id: o.id },
            data: {
              status: 'BRIEF_SUBMISSION_PENDING',
              paidAt: params.paidAt,
              // Copy the shared payment id onto each order so per-order records
              // (and the existing refund lookup) still resolve.
              razorpayPaymentId: params.razorpayPaymentId,
            },
          },
          tx,
        );
      }
      await tx.orderCheckoutBatch.update({
        where: { id: batch.id },
        data: {
          status: 'PAID',
          paidAt: params.paidAt,
          razorpayPaymentId: params.razorpayPaymentId,
        },
      });
    });

    return orders.map((o) => o.id);
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

  /**
   * Creator rejects the brand-submitted brief. Only allowed while the order is
   * awaiting acceptance (BRIEF_SUBMITTED). Moves the order to REJECTED (the
   * existing refund path — an admin issues the Razorpay refund afterwards),
   * records the reason, and emails both parties with the note.
   */
  async rejectBrief(params: {
    creatorUserId: string;
    orderId: string;
    note: string;
  }): Promise<void> {
    const note = params.note?.trim();
    if (!note) {
      throw new BadRequestException('A rejection note is required');
    }

    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId: params.creatorUserId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, creatorId: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.creatorId !== creator.id)
      throw new ForbiddenException('Not your order');
    if (String(order.status) !== 'BRIEF_SUBMITTED') {
      throw new BadRequestException('Order is not awaiting brief acceptance');
    }

    const now = new Date();
    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'REJECTED',
        cancellationReason: note,
        cancelledAt: now,
        cancelledBy: 'CREATOR',
      },
    });

    await this.orderRealtime.emitOrderCancelled({
      orderId: order.id,
      cancelledBy: 'CREATOR',
      reason: note,
    });

    this.orderMail.notifyBriefRejectedByCreator(order.id, note);
  }

  /**
   * Brand cancels the order before the creator accepts — allowed while the
   * brief has not been submitted yet (BRIEF_SUBMISSION_PENDING) or has been
   * submitted but not yet accepted (BRIEF_SUBMITTED). Moves the order to
   * REJECTED (refund handled by an admin afterwards), records the reason, and
   * emails both parties with the note.
   */
  async cancelOrderByBrand(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    orderId: string;
    note: string;
  }): Promise<void> {
    const note = params.note?.trim();
    if (!note) {
      throw new BadRequestException('A cancellation note is required');
    }

    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, brandId: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id)
      throw new ForbiddenException('Not your order');

    const cancellableStatuses = ['BRIEF_SUBMISSION_PENDING', 'BRIEF_SUBMITTED'];
    if (!cancellableStatuses.includes(String(order.status))) {
      throw new BadRequestException(
        'Order can only be cancelled before the creator accepts the brief',
      );
    }

    const now = new Date();
    await this.updateOrder({
      where: { id: order.id },
      data: {
        status: 'REJECTED',
        cancellationReason: note,
        cancelledAt: now,
        cancelledBy: 'BRAND',
      },
    });

    await this.orderRealtime.emitOrderCancelled({
      orderId: order.id,
      cancelledBy: 'BRAND',
      reason: note,
    });

    this.orderMail.notifyOrderCancelledByBrand(order.id, note);
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

    await this.assertDeliveryNotProcessing(order.id, revisionNumber);

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

    await this.assertDeliveryNotProcessing(order.id, revisionNumber);

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
          "You've added the same video twice in this upload. Each file must be different.",
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
          "You've already submitted this exact video in an earlier revision of this order. Please upload the updated video with your changes.",
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
    });

    // Kick off watermarking of the brand-facing preview copies. Order status
    // moves to DELIVERED / REVISION_SUBMITTED only after previews are ready.
    if (deliveryId) {
      await this.watermarkQueue.enqueue(deliveryId);
    }

    return {
      orderId: order.id,
      revisionNumber,
      status: String(order.status),
    };
  }

  /** Block re-submit while watermarked previews are still being generated. */
  private async assertDeliveryNotProcessing(
    orderId: string,
    revisionNumber: number,
  ): Promise<void> {
    const delivery = await (this.prisma as any).orderDelivery.findUnique({
      where: {
        orderId_revisionNumber: { orderId, revisionNumber },
      },
      select: { previewStatus: true },
    });
    if (
      delivery?.previewStatus === 'pending' ||
      delivery?.previewStatus === 'processing'
    ) {
      throw new BadRequestException(
        'Your delivery is still being processed. Please wait for previews to finish.',
      );
    }
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

  /**
   * The price (paise) a brand pays for one extra-revisions purchase on an order:
   * the creator's own "Revision" add-on price. Resolved via the catalog option
   * (slug 'extra_revision') → its name → the creator's `CreatorAddOn` of that
   * name. Returns null when the creator hasn't priced it (UI hides the CTA).
   */
  private async resolveRevisionAddOnUnitPaise(
    creatorId: string,
  ): Promise<number | null> {
    const option = await this.prisma.creatorAddOnOption.findUnique({
      where: { slug: EXTRA_REVISION_OPTION_SLUG },
      select: { name: true },
    });
    if (!option) return null;
    const row = await this.prisma.creatorAddOn.findFirst({
      where: { creatorId, name: option.name },
      select: { priceAmount: true },
    });
    if (!row) return null;
    const paise = toPaise(row.priceAmount);
    return paise > 0 ? paise : null;
  }

  /**
   * Start a Razorpay checkout for buying extra revisions on an order once its
   * revision cap is reached. Reuses/refreshes a pending purchase row (owns its
   * own Razorpay order + verifiable amount, like OrderCheckoutBatch) so a
   * dismissed modal doesn't orphan a charge. The cap is raised only on the
   * verified webhook capture (see markRevisionPurchasePaidFromWebhook).
   */
  async createRevisionCheckout(params: {
    orderId: string;
    actorUserId: string;
    brandProfileId?: string | null;
    /** Number of revision packs to buy in one payment (each = REVISIONS_PER_ADDON). */
    quantity?: number;
  }): Promise<CheckoutSessionResult> {
    const quantity = Math.max(1, Math.floor(params.quantity ?? 1));
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
        status: true,
        currency: true,
        revisionCount: true,
        maxRevisionsSnapshot: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) {
      throw new ForbiddenException('Not your order');
    }

    // Same eligibility as requesting a revision, and only once the cap is hit.
    const allowed = new Set(['DELIVERED', 'REVISION_SUBMITTED']);
    if (!allowed.has(String(order.status))) {
      throw new BadRequestException('Order is not eligible for extra revisions');
    }
    if (order.revisionCount < order.maxRevisionsSnapshot) {
      throw new BadRequestException('This order still has revisions remaining');
    }

    const unitPaise = await this.resolveRevisionAddOnUnitPaise(order.creatorId);
    if (!unitPaise) {
      throw new BadRequestException(
        'Extra revisions are not available for this order',
      );
    }

    const revisionsAdded = quantity * REVISIONS_PER_ADDON;
    const expectedAmountPaise = quantity * unitPaise;

    // Reuse an existing unpaid purchase (and its Razorpay order) to avoid
    // orphaning charges when the brand reopens the modal. Refresh it if the
    // price or the chosen quantity changed since the row was created.
    let purchase = await this.prisma.orderRevisionPurchase.findFirst({
      where: { orderId: order.id, status: 'PENDING_PAYMENT' },
      orderBy: { createdAt: 'desc' },
    });
    if (
      purchase &&
      (purchase.unitAmountPaise !== unitPaise ||
        purchase.revisionsAdded !== revisionsAdded)
    ) {
      purchase = await this.prisma.orderRevisionPurchase.update({
        where: { id: purchase.id },
        data: {
          revisionsAdded,
          unitAmountPaise: unitPaise,
          expectedAmountPaise,
          razorpayOrderId: null,
        },
      });
    }
    if (!purchase) {
      purchase = await this.prisma.orderRevisionPurchase.create({
        data: {
          orderId: order.id,
          revisionsAdded,
          unitAmountPaise: unitPaise,
          expectedAmountPaise,
          currency: order.currency,
          createdByUserId: params.actorUserId,
        },
      });
    }

    let razorpayOrderId = purchase.razorpayOrderId;
    if (!razorpayOrderId) {
      const rzp = await this.razorpay.createOrder({
        amountPaise: purchase.expectedAmountPaise,
        currency: purchase.currency,
        receipt: purchase.id,
        notes: {
          kind: 'revision_topup',
          revisionPurchaseId: purchase.id,
          platformOrderId: order.id,
          brandProfileId: brand.id,
          creatorProfileId: order.creatorId,
        },
      });
      razorpayOrderId = rzp.id;
      await this.prisma.orderRevisionPurchase.update({
        where: { id: purchase.id },
        data: { razorpayOrderId },
      });
    }

    return this.buildCheckoutSessionResult({
      orderId: order.id,
      razorpayOrderId,
      amountPaise: purchase.expectedAmountPaise,
      currency: purchase.currency,
      packageAmountPaise: purchase.expectedAmountPaise,
      addOnsAmountPaise: 0,
      addOnsCount: 0,
    });
  }

  /**
   * payment.captured for an extra-revisions purchase: verify the amount, mark
   * the purchase paid, and atomically raise the order's revision cap. Idempotent
   * (a replayed webhook is a no-op). Returns the affected order + grant, or null
   * if the razorpayOrderId isn't a revision purchase / already settled / amount
   * mismatch. Mirrors markBatchPaidFromWebhook.
   */
  async markRevisionPurchasePaidFromWebhook(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: Date;
    amountPaise?: number;
  }): Promise<{ orderId: string; revisionsAdded: number } | null> {
    const purchase = await this.prisma.orderRevisionPurchase.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: {
        id: true,
        orderId: true,
        status: true,
        revisionsAdded: true,
        expectedAmountPaise: true,
      },
    });
    if (!purchase) return null;
    if (purchase.status !== 'PENDING_PAYMENT') return null; // idempotent

    if (
      purchase.expectedAmountPaise > 0 &&
      params.amountPaise != null &&
      purchase.expectedAmountPaise !== params.amountPaise
    ) {
      this.logger.warn(
        `payment.captured amount mismatch revisionPurchase=${purchase.id} expectedPaise=${purchase.expectedAmountPaise} gotPaise=${params.amountPaise} — not granting revisions`,
      );
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderRevisionPurchase.update({
        where: { id: purchase.id },
        data: {
          status: 'PAID',
          paidAt: params.paidAt,
          razorpayPaymentId: params.razorpayPaymentId,
        },
      });
      await tx.order.update({
        where: { id: purchase.orderId },
        data: { maxRevisionsSnapshot: { increment: purchase.revisionsAdded } },
      });
    });

    this.orderMail.notifyExtraRevisionsPurchased(
      purchase.orderId,
      purchase.revisionsAdded,
    );
    void this.orderRealtime.emitOrderRevisionsPurchased({
      orderId: purchase.orderId,
      revisionsAdded: purchase.revisionsAdded,
    });

    return { orderId: purchase.orderId, revisionsAdded: purchase.revisionsAdded };
  }

  /** payment.failed for an extra-revisions purchase: flip its row to FAILED. */
  async markRevisionPurchaseFailedFromWebhook(params: {
    razorpayOrderId: string;
  }): Promise<string | null> {
    const purchase = await this.prisma.orderRevisionPurchase.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, orderId: true, status: true },
    });
    if (!purchase || purchase.status !== 'PENDING_PAYMENT') return null;
    await this.prisma.orderRevisionPurchase.update({
      where: { id: purchase.id },
      data: { status: 'FAILED' },
    });
    return purchase.orderId;
  }

  /**
   * The price (paise) a brand pays for one extra usage-rights block (30 days):
   * the creator's own "Usage Rights extra 30 days" add-on price. Resolved via the
   * catalog option (slug 'paid_ads_usage_30_days') → its name → the creator's
   * `CreatorAddOn` of that name. Returns null when unpriced (UI hides the CTA).
   */
  private async resolveUsageRightsAddOnUnitPaise(
    creatorId: string,
  ): Promise<number | null> {
    const option = await this.prisma.creatorAddOnOption.findUnique({
      where: { slug: EXTRA_USAGE_RIGHTS_OPTION_SLUG },
      select: { name: true },
    });
    if (!option) return null;
    const row = await this.prisma.creatorAddOn.findFirst({
      where: { creatorId, name: option.name },
      select: { priceAmount: true },
    });
    if (!row) return null;
    const paise = toPaise(row.priceAmount);
    return paise > 0 ? paise : null;
  }

  /**
   * Start a Razorpay checkout for buying extra usage-rights time (30-day blocks,
   * non-refundable) on a COMPLETED order. Reuses/refreshes a pending purchase row
   * (owns its own Razorpay order + verifiable amount) so a dismissed modal doesn't
   * orphan a charge. Usage days are added only on the verified webhook capture
   * (see markUsageRightsPurchasePaidFromWebhook).
   */
  async createUsageRightsCheckout(params: {
    orderId: string;
    actorUserId: string;
    brandProfileId?: string | null;
    /** Number of 30-day blocks to buy in one payment (each = USAGE_RIGHTS_DAYS_PER_ADDON). */
    quantity?: number;
  }): Promise<CheckoutSessionResult> {
    const quantity = Math.max(1, Math.floor(params.quantity ?? 1));
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
        status: true,
        currency: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) {
      throw new ForbiddenException('Not your order');
    }

    // Only offered once the order has completed successfully.
    const allowed = new Set(['ACCEPTED', 'CREATOR_PAYMENT_DONE']);
    if (!allowed.has(String(order.status))) {
      throw new BadRequestException(
        'Usage-rights extensions are available only after the order is completed',
      );
    }

    const unitPaise = await this.resolveUsageRightsAddOnUnitPaise(
      order.creatorId,
    );
    if (!unitPaise) {
      throw new BadRequestException(
        'Usage-rights extensions are not available for this order',
      );
    }

    const daysAdded = quantity * USAGE_RIGHTS_DAYS_PER_ADDON;
    const expectedAmountPaise = quantity * unitPaise;

    // Reuse an existing unpaid purchase (and its Razorpay order) to avoid
    // orphaning charges when the brand reopens the modal. Refresh it if the
    // price or the chosen quantity changed since the row was created.
    let purchase = await this.prisma.orderUsageRightsPurchase.findFirst({
      where: { orderId: order.id, status: 'PENDING_PAYMENT' },
      orderBy: { createdAt: 'desc' },
    });
    if (
      purchase &&
      (purchase.unitAmountPaise !== unitPaise ||
        purchase.daysAdded !== daysAdded)
    ) {
      purchase = await this.prisma.orderUsageRightsPurchase.update({
        where: { id: purchase.id },
        data: {
          daysAdded,
          unitAmountPaise: unitPaise,
          expectedAmountPaise,
          razorpayOrderId: null,
        },
      });
    }
    if (!purchase) {
      purchase = await this.prisma.orderUsageRightsPurchase.create({
        data: {
          orderId: order.id,
          daysAdded,
          unitAmountPaise: unitPaise,
          expectedAmountPaise,
          currency: order.currency,
          createdByUserId: params.actorUserId,
        },
      });
    }

    let razorpayOrderId = purchase.razorpayOrderId;
    if (!razorpayOrderId) {
      const rzp = await this.razorpay.createOrder({
        amountPaise: purchase.expectedAmountPaise,
        currency: purchase.currency,
        receipt: purchase.id,
        notes: {
          kind: 'usage_rights_topup',
          usageRightsPurchaseId: purchase.id,
          platformOrderId: order.id,
          brandProfileId: brand.id,
          creatorProfileId: order.creatorId,
        },
      });
      razorpayOrderId = rzp.id;
      await this.prisma.orderUsageRightsPurchase.update({
        where: { id: purchase.id },
        data: { razorpayOrderId },
      });
    }

    return this.buildCheckoutSessionResult({
      orderId: order.id,
      razorpayOrderId,
      amountPaise: purchase.expectedAmountPaise,
      currency: purchase.currency,
      packageAmountPaise: purchase.expectedAmountPaise,
      addOnsAmountPaise: 0,
      addOnsCount: 0,
    });
  }

  /**
   * payment.captured for a usage-rights purchase: verify the amount, mark the
   * purchase paid, and atomically extend the order's usage-rights days. Idempotent
   * (a replayed webhook is a no-op). Returns the affected order + grant, or null
   * if the razorpayOrderId isn't a usage-rights purchase / already settled /
   * amount mismatch. Mirrors markRevisionPurchasePaidFromWebhook.
   */
  async markUsageRightsPurchasePaidFromWebhook(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: Date;
    amountPaise?: number;
  }): Promise<{ orderId: string; daysAdded: number } | null> {
    const purchase = await this.prisma.orderUsageRightsPurchase.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: {
        id: true,
        orderId: true,
        status: true,
        daysAdded: true,
        expectedAmountPaise: true,
      },
    });
    if (!purchase) return null;
    if (purchase.status !== 'PENDING_PAYMENT') return null; // idempotent

    if (
      purchase.expectedAmountPaise > 0 &&
      params.amountPaise != null &&
      purchase.expectedAmountPaise !== params.amountPaise
    ) {
      this.logger.warn(
        `payment.captured amount mismatch usageRightsPurchase=${purchase.id} expectedPaise=${purchase.expectedAmountPaise} gotPaise=${params.amountPaise} — not granting usage-rights days`,
      );
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderUsageRightsPurchase.update({
        where: { id: purchase.id },
        data: {
          status: 'PAID',
          paidAt: params.paidAt,
          razorpayPaymentId: params.razorpayPaymentId,
        },
      });
      await tx.order.update({
        where: { id: purchase.orderId },
        data: { usageRightsExtraDays: { increment: purchase.daysAdded } },
      });
    });

    this.orderMail.notifyExtraUsageRightsPurchased(
      purchase.orderId,
      purchase.daysAdded,
    );
    void this.orderRealtime.emitOrderUsageRightsPurchased({
      orderId: purchase.orderId,
      daysAdded: purchase.daysAdded,
    });

    return { orderId: purchase.orderId, daysAdded: purchase.daysAdded };
  }

  /** payment.failed for a usage-rights purchase: flip its row to FAILED. */
  async markUsageRightsPurchaseFailedFromWebhook(params: {
    razorpayOrderId: string;
  }): Promise<string | null> {
    const purchase = await this.prisma.orderUsageRightsPurchase.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      select: { id: true, orderId: true, status: true },
    });
    if (!purchase || purchase.status !== 'PENDING_PAYMENT') return null;
    await this.prisma.orderUsageRightsPurchase.update({
      where: { id: purchase.id },
      data: { status: 'FAILED' },
    });
    return purchase.orderId;
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
    expectedAmountPaise: number;
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
    refundedAt?: Date | null;
    cancellationReason?: string | null;
    cancelledAt?: Date | null;
    cancelledBy?: string | null;
    disputes?: Array<{ openedAt: Date; resolvedAt: Date | null }>;
  }): OrderListSummaryDto {
    const hasBrief = order.briefSubmittedAt != null;
    const latestDispute = order.disputes?.[0];
    return {
      id: order.id,
      status: order.status,
      packageNameSnapshot: order.packageNameSnapshot,
      priceAmountSnapshot: order.priceAmountSnapshot.toString(),
      expectedAmountPaise: order.expectedAmountPaise,
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
      refundedAt: order.refundedAt ?? null,
      cancellationReason: order.cancellationReason ?? null,
      cancelledAt: order.cancelledAt ?? null,
      cancelledBy: order.cancelledBy ?? null,
      disputeOpenedAt: latestDispute?.openedAt ?? null,
      disputeResolvedAt: latestDispute?.resolvedAt ?? null,
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
    usageRightsExtraDays: number;
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
    cancellationReason?: string | null;
    cancelledAt?: Date | null;
    cancelledBy?: string | null;
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
      cancellationReason: order.cancellationReason ?? null,
      cancelledAt: order.cancelledAt ?? null,
      cancelledBy: order.cancelledBy ?? null,
      // Extra-revisions purchase info. Unit price is resolved only on the brand
      // details path (below); other viewers keep the null default.
      revisionsPerPurchase: REVISIONS_PER_ADDON,
      revisionAddOnUnitPaise: null,
      revisionAddOnAvailable: false,
      // Usage-rights extension info. Unit price/availability resolved only on the
      // brand details path (below); other viewers keep the null default.
      usageRightsPerPurchase: USAGE_RIGHTS_DAYS_PER_ADDON,
      usageRightsBaseDays: BASE_USAGE_RIGHTS_DAYS,
      usageRightsExtraDays: order.usageRightsExtraDays,
      usageRightsAddOnUnitPaise: null,
      usageRightsAddOnAvailable: false,
      // Totals for supplemental purchases. Filled only on the brand details
      // path (below); other viewers keep the zero defaults.
      extraRevisionsPaidPaise: 0,
      extraRevisionsAdded: 0,
      extraUsageRightsPaidPaise: 0,
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

  /**
   * Load the latest dispute for an order (if any) so detail views can surface
   * who raised it, the reason, and — once resolved — the admin's resolution
   * note. While a dispute is OPEN this is the active dispute (with a withdrawal
   * offered to the opener); after resolution it carries the resolution note so
   * a "Dispute resolved" banner can persist across every later order stage.
   */
  private async loadLatestDispute(orderId: string): Promise<{
    status: OrderDisputeStatus;
    openedBy: OrderDisputeOpenedBy;
    reason: string;
    openedAt: Date;
    resolutionNotes: string | null;
    resolvedAt: Date | null;
  } | null> {
    const dispute = await this.prisma.orderDispute.findFirst({
      where: { orderId },
      orderBy: { openedAt: 'desc' },
      select: {
        status: true,
        openedBy: true,
        reason: true,
        openedAt: true,
        resolutionNotes: true,
        resolvedAt: true,
      },
    });
    return dispute ?? null;
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
        usageRightsExtraDays: true,
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
        cancellationReason: true,
        cancelledAt: true,
        cancelledBy: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            introVideoUrl: true,
            profileImageUrl: true,
            city: true,
            shippingAddress: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) throw new ForbiddenException('Not your order');

    const { creator, brandId, ...orderFields } = order;
    const mappedOrder = this.mapOrderDetails(orderFields);

    // Surface the price to buy +N revisions so the brand's CTA can show it.
    const revisionUnitPaise = await this.resolveRevisionAddOnUnitPaise(creator.id);
    mappedOrder.revisionAddOnUnitPaise = revisionUnitPaise;
    mappedOrder.revisionAddOnAvailable = revisionUnitPaise != null;

    // Surface the usage-rights extension price; only offered once the order is
    // completed (ACCEPTED / CREATOR_PAYMENT_DONE) and the creator has priced it.
    const usageRightsUnitPaise = await this.resolveUsageRightsAddOnUnitPaise(
      creator.id,
    );
    const orderCompleted =
      order.status === 'ACCEPTED' || order.status === 'CREATOR_PAYMENT_DONE';
    mappedOrder.usageRightsAddOnUnitPaise = usageRightsUnitPaise;
    mappedOrder.usageRightsAddOnAvailable =
      orderCompleted && usageRightsUnitPaise != null;

    // Totals paid for supplemental purchases (mid-order extra revisions and
    // post-order usage-rights extensions), so the brand's payment summary can
    // reflect everything charged beyond the original checkout.
    const [revisionPurchaseAgg, usageRightsPurchaseAgg] = await Promise.all([
      this.prisma.orderRevisionPurchase.aggregate({
        where: { orderId: order.id, status: 'PAID' },
        _sum: { expectedAmountPaise: true, revisionsAdded: true },
      }),
      this.prisma.orderUsageRightsPurchase.aggregate({
        where: { orderId: order.id, status: 'PAID' },
        _sum: { expectedAmountPaise: true },
      }),
    ]);
    mappedOrder.extraRevisionsPaidPaise =
      revisionPurchaseAgg._sum.expectedAmountPaise ?? 0;
    // Count of revisions granted (each pack = REVISIONS_PER_ADDON), matching the
    // admin ledger and the buy CTA ("Buy N revisions") — not the number of rows.
    mappedOrder.extraRevisionsAdded =
      revisionPurchaseAgg._sum.revisionsAdded ?? 0;
    mappedOrder.extraUsageRightsPaidPaise =
      usageRightsPurchaseAgg._sum.expectedAmountPaise ?? 0;

    const revisionActiveStatuses = new Set<OrderStatus>([
      'REVISION_REQUESTED',
      'REVISION_SUBMITTED',
    ]);
    if (
      revisionActiveStatuses.has(order.status) &&
      order.revisionCount > 0
    ) {
      const currentRevision = await this.prisma.orderRevision.findUnique({
        where: {
          orderId_revisionNumber: {
            orderId: order.id,
            revisionNumber: order.revisionCount,
          },
        },
        select: {
          revisionNumber: true,
          note: true,
          createdAt: true,
        },
      });
      if (currentRevision) {
        mappedOrder.currentRevision = {
          revisionNumber: currentRevision.revisionNumber,
          note: currentRevision.note ?? null,
          requestedAt: currentRevision.createdAt,
        };
      }
    }

    // Surface the latest dispute whether it's still OPEN (active banner +
    // withdrawal) or resolved (persistent "Dispute resolved" note across the
    // restored order stage).
    const dispute = await this.loadLatestDispute(order.id);
    if (dispute) mappedOrder.dispute = dispute;

    return {
      order: mappedOrder,
      creator: {
        id: creator.id,
        // Creator identity is hidden from the brand in the order flow.
        displayName: BRAND_HIDDEN_CREATOR_NAME,
        introVideoUrl: creator.introVideoUrl ?? null,
        profileImageUrl: creator.profileImageUrl ?? null,
        city: creator.city ?? null,
        // Real address is needed so the brand can ship the product; the
        // recipient name and phone are deliberately withheld to preserve the
        // anonymized creator identity.
        shippingAddress: creator.shippingAddress ?? null,
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
        usageRightsExtraDays: true,
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
        cancellationReason: true,
        cancelledAt: true,
        cancelledBy: true,
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
    const mappedOrder = this.mapOrderDetails(orderFields);

    const revisionActiveStatuses = new Set<OrderStatus>([
      'REVISION_REQUESTED',
      'REVISION_SUBMITTED',
    ]);
    if (
      revisionActiveStatuses.has(order.status) &&
      order.revisionCount > 0
    ) {
      const currentRevision = await this.prisma.orderRevision.findUnique({
        where: {
          orderId_revisionNumber: {
            orderId: order.id,
            revisionNumber: order.revisionCount,
          },
        },
        select: {
          revisionNumber: true,
          note: true,
          createdAt: true,
        },
      });
      if (currentRevision) {
        mappedOrder.currentRevision = {
          revisionNumber: currentRevision.revisionNumber,
          note: currentRevision.note ?? null,
          requestedAt: currentRevision.createdAt,
        };
      }
    }

    // Surface the latest dispute whether it's still OPEN (active banner +
    // withdrawal) or resolved (persistent "Dispute resolved" note across the
    // restored order stage).
    const dispute = await this.loadLatestDispute(order.id);
    if (dispute) mappedOrder.dispute = dispute;

    return {
      order: mappedOrder,
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
        usageRightsExtraDays: true,
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
        cancellationReason: true,
        cancelledAt: true,
        cancelledBy: true,
        createdAt: true,
        updatedAt: true,
        revisionPurchases: {
          where: { status: 'PAID' },
          select: {
            revisionsAdded: true,
            unitAmountPaise: true,
            expectedAmountPaise: true,
            paidAt: true,
          },
          orderBy: { paidAt: 'asc' },
        },
        usageRightsPurchases: {
          where: { status: 'PAID' },
          select: {
            daysAdded: true,
            unitAmountPaise: true,
            expectedAmountPaise: true,
            paidAt: true,
          },
          orderBy: { paidAt: 'asc' },
        },
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
          select: adminOrderBrandSnapshotSelect,
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const { creator, brand, revisionPurchases, usageRightsPurchases, ...orderFields } =
      order;
    const mappedOrder = this.mapOrderDetailsAdmin(orderFields);

    // Full pricing ledger: what the brand paid vs what to pay the creator and
    // refund the brand (for extra revisions bought but not used).
    const paidPurchases = (revisionPurchases ?? []) as Array<{
      revisionsAdded: number;
      unitAmountPaise: number;
      expectedAmountPaise: number;
      paidAt: Date | null;
    }>;
    mappedOrder.pricingLedger = computeOrderPricingLedger({
      expectedAmountPaise: order.expectedAmountPaise,
      maxRevisionsSnapshot: order.maxRevisionsSnapshot,
      revisionCount: order.revisionCount,
      paidPurchases: paidPurchases.map((p) => ({
        revisionsAdded: p.revisionsAdded,
        expectedAmountPaise: p.expectedAmountPaise,
        paidAt: p.paidAt,
      })),
      fullRefundToBrand:
        order.status === 'REJECTED' || order.status === 'REFUNDED',
    });
    mappedOrder.revisionPurchases = paidPurchases.map((p) => ({
      revisionsAdded: p.revisionsAdded,
      unitAmountPaise: p.unitAmountPaise,
      expectedAmountPaise: p.expectedAmountPaise,
      paidAt: p.paidAt,
    }));

    // Usage-rights extensions are non-refundable: every block is kept, so the
    // whole spend is earned — 80% to creator, 20% platform fee.
    const paidUsageRights = (usageRightsPurchases ?? []) as Array<{
      daysAdded: number;
      unitAmountPaise: number;
      expectedAmountPaise: number;
      paidAt: Date | null;
    }>;
    mappedOrder.usageRightsPurchases = paidUsageRights.map((p) => ({
      daysAdded: p.daysAdded,
      unitAmountPaise: p.unitAmountPaise,
      expectedAmountPaise: p.expectedAmountPaise,
      paidAt: p.paidAt,
    }));
    const usageRightsBrandPaid = paidUsageRights.reduce(
      (sum, p) => sum + Math.max(0, p.expectedAmountPaise),
      0,
    );
    const usageRightsPlatformFee = Math.round(
      usageRightsBrandPaid * PLATFORM_FEE_RATE,
    );
    mappedOrder.usageRightsSettlement = {
      brandPaidPaise: usageRightsBrandPaid,
      platformFeePaise: usageRightsPlatformFee,
      payToCreatorPaise: usageRightsBrandPaid - usageRightsPlatformFee,
      daysPurchased: paidUsageRights.reduce(
        (sum, p) => sum + Math.max(0, p.daysAdded),
        0,
      ),
    };

    // Surface the latest dispute so admins can see which party raised it, the
    // reason, and (once resolved) the resolution note.
    const dispute = await this.loadLatestDispute(order.id);
    if (dispute) mappedOrder.dispute = dispute;

    return {
      order: mappedOrder,
      creator: {
        id: creator.id,
        displayName: creator.displayName,
        introVideoUrl: creator.introVideoUrl ?? null,
        profileImageUrl: creator.profileImageUrl ?? null,
        city: creator.city ?? null,
      },
      brand: toAdminOrderBrandSnapshotDto(brand),
    };
  }

  async listOrdersForBrand(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<BrandOrdersListResponseDto> {
    const { brand } = await this.resolveBrandActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      brandId: brand.id,
      ...(params.status ? { status: params.status } : {}),
    };

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
          expectedAmountPaise: true,
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
          refundedAt: true,
          cancellationReason: true,
          cancelledAt: true,
          cancelledBy: true,
          disputes: {
            orderBy: { openedAt: 'desc' },
            take: 1,
            select: { openedAt: true, resolvedAt: true },
          },
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
          // Creator identity is hidden from the brand in the order flow.
          displayName: BRAND_HIDDEN_CREATOR_NAME,
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
    const where: Prisma.OrderWhereInput = {
      creatorId: creator.id,
      status: { not: OrderStatus.PENDING_PAYMENT },
    };

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
          expectedAmountPaise: true,
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
          refundedAt: true,
          cancellationReason: true,
          cancelledAt: true,
          cancelledBy: true,
          disputes: {
            orderBy: { openedAt: 'desc' },
            take: 1,
            select: { openedAt: true, resolvedAt: true },
          },
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
          expectedAmountPaise: true,
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
          refundedAt: true,
          cancellationReason: true,
          cancelledAt: true,
          cancelledBy: true,
          disputes: {
            orderBy: { openedAt: 'desc' },
            take: 1,
            select: { openedAt: true, resolvedAt: true },
          },
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
            select: adminOrderBrandSnapshotSelect,
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
        brand: toAdminOrderBrandSnapshotDto(brand),
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
          // Remember where the order was so the dispute can be unwound to the
          // exact prior state on resolution / withdrawal.
          data: { status: 'DISPUTED', preDisputeStatus: order.status },
        },
        tx,
      );
    });

    // Notify both parties that a dispute has been opened.
    this.orderMail.notifyDisputeOpened(order.id, {
      openedBy: params.openedBy,
      reason: params.reason,
    });
    void this.orderRealtime
      .emitOrderDisputeOpened({
        orderId: order.id,
        openedBy: params.openedBy,
        reason: params.reason,
      })
      .catch((err) =>
        this.logger.warn(
          `dispute_opened realtime failed for ${order.id}: ${(err as Error)?.message}`,
        ),
      );
  }

  /**
   * Opener withdraws their own open dispute. The order returns to the state it
   * was in before the dispute was raised.
   */
  async withdrawDispute(params: {
    orderId: string;
    openedBy: 'BRAND' | 'CREATOR';
    openerUserId: string;
    brandProfileId?: string | null;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        creatorId: true,
        status: true,
        preDisputeStatus: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

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

    const existing = await this.prisma.orderDispute.findFirst({
      where: { orderId: order.id, status: 'OPEN' },
      select: { id: true, openedBy: true },
    });
    if (!existing) {
      throw new BadRequestException('No open dispute to withdraw');
    }
    // Only the party that raised the dispute may withdraw it.
    if (String(existing.openedBy) !== params.openedBy) {
      throw new ForbiddenException(
        'Only the party who opened the dispute can withdraw it',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderDispute.update({
        where: { id: existing.id },
        data: {
          status: 'RESOLVED_CLOSED',
          resolvedAt: new Date(),
          resolutionNotes: 'Withdrawn by opener',
        },
      });
      await this.restoreOrderFromDispute(tx, order.id, order.preDisputeStatus);
    });

    const restoredStatus = order.preDisputeStatus ?? 'DELIVERED';
    void this.orderRealtime
      .emitOrderDisputeResolved({
        orderId: order.id,
        outcome: 'WITHDRAWN',
        restoredStatus,
      })
      .catch((err) =>
        this.logger.warn(
          `dispute_resolved realtime failed for ${order.id}: ${(err as Error)?.message}`,
        ),
      );
  }

  /**
   * Admin: close an open dispute without a refund (e.g. resolved amicably or in
   * the creator's favour). The dispute is recorded as RESOLVED_CLOSED and the
   * order returns to its pre-dispute status so it can continue.
   */
  async adminCloseDispute(params: {
    orderId: string;
    adminUserId: string;
    resolutionNotes?: string;
  }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, status: true, preDisputeStatus: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (String(order.status) !== 'DISPUTED') {
      throw new BadRequestException('Order is not currently disputed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderDispute.updateMany({
        where: { orderId: order.id, status: 'OPEN' },
        data: {
          status: 'RESOLVED_CLOSED',
          resolvedAt: new Date(),
          resolvedByUserId: params.adminUserId,
          resolutionNotes: params.resolutionNotes ?? null,
        },
      });
      await this.restoreOrderFromDispute(tx, order.id, order.preDisputeStatus);
    });

    // Notify both parties that the dispute was resolved and the order continues.
    this.orderMail.notifyDisputeResolved(order.id, {
      outcome: 'CONTINUED',
      resolutionNotes: params.resolutionNotes,
    });
    const restoredStatus = order.preDisputeStatus ?? 'DELIVERED';
    void this.orderRealtime
      .emitOrderDisputeResolved({
        orderId: order.id,
        outcome: 'CONTINUED',
        restoredStatus,
        resolutionNotes: params.resolutionNotes,
      })
      .catch((err) =>
        this.logger.warn(
          `dispute_resolved realtime failed for ${order.id}: ${(err as Error)?.message}`,
        ),
      );
  }

  /**
   * Move an order out of DISPUTED and back to the status it held before the
   * dispute was raised, clearing the remembered status. Falls back to
   * DELIVERED when the pre-dispute status is unknown (older disputes).
   */
  private async restoreOrderFromDispute(
    tx: Prisma.TransactionClient,
    orderId: string,
    preDisputeStatus: OrderStatus | null,
  ): Promise<void> {
    const restored = preDisputeStatus ?? 'DELIVERED';
    await this.updateOrder(
      {
        where: { id: orderId },
        data: { status: restored, preDisputeStatus: null },
      },
      tx,
    );
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
    void this.orderRealtime
      .emitOrderDisputeResolved({
        orderId: order.id,
        outcome: 'REJECTED',
        restoredStatus: 'REJECTED',
        resolutionNotes: params.resolutionNotes,
      })
      .catch((err) =>
        this.logger.warn(
          `dispute_resolved realtime failed for ${order.id}: ${(err as Error)?.message}`,
        ),
      );
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
      if (err instanceof ServiceUnavailableException) {
        this.logger.error(
          `Razorpay refund unavailable for order ${order.id} (payment ${order.razorpayPaymentId}): ${err.message}`,
        );
        throw err;
      }
      const message = razorpayRefundErrorMessage(err);
      this.logger.warn(
        `Razorpay refund rejected for order ${order.id} (payment ${order.razorpayPaymentId}): ${message}`,
      );
      throw new BadRequestException(message);
    }

    // Razorpay refunds are asynchronous. `payments.refund` normally returns
    // status `pending` — the refund has been *accepted*, but the money has not
    // moved yet — and Razorpay later fires the `refund.processed` webhook once
    // it actually completes. That webhook (markRefundCompletedFromWebhook) is
    // the single source of truth that flips the order to REFUNDED and emails
    // the brand. So here we finalize synchronously ONLY when Razorpay already
    // reports the refund as `processed` (instant refunds); otherwise we just
    // record the refund id, leave the order REJECTED, and let the webhook
    // finish the job.
    if (refund.status === 'failed') {
      this.logger.warn(
        `Razorpay refund ${refund.id} failed immediately for order ${order.id} (payment ${order.razorpayPaymentId})`,
      );
      throw new BadRequestException('Razorpay could not process the refund');
    }

    if (refund.status === 'processed') {
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

      // Instant refund is already complete — notify the brand now. If the
      // refund.processed webhook also arrives it is a no-op, because the order
      // is already REFUNDED (markRefundCompletedFromWebhook returns early).
      this.orderMail.notifyOrderRefunded(order.id, refundedAt);

      this.logger.log(
        `Razorpay refund ${refund.id} processed instantly for order ${order.id}`,
      );

      return { refundId: refund.id, refundStatus: refund.status };
    }

    // Pending (or any other non-terminal status): record the refund id so a
    // re-trigger is blocked by the ConflictException guard above, but keep the
    // order REJECTED. The refund.processed webhook flips it to REFUNDED and
    // emails the brand once the refund truly completes — no premature "refund
    // processed" email is sent here.
    await this.updateOrder({
      where: { id: order.id },
      data: { razorpayRefundId: refund.id },
    });

    this.logger.log(
      `Razorpay refund ${refund.id} initiated (status=${refund.status}) for order ${order.id}; awaiting refund.processed webhook`,
    );

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

  /**
   * Webhook: refund.failed — a refund we initiated (recorded on the order but
   * left in REJECTED state, awaiting completion) did not go through. Clear the
   * recorded refund id so an admin can re-trigger the refund; the order stays
   * REJECTED. No-op if the order was already refunded, or the failed refund id
   * does not match the one we recorded (a different/later refund must win).
   */
  async markRefundFailedFromWebhook(params: {
    razorpayPaymentId: string;
    razorpayRefundId: string;
  }): Promise<string | null> {
    const order = await this.prisma.order.findFirst({
      where: { razorpayPaymentId: params.razorpayPaymentId },
      select: { id: true, status: true, razorpayRefundId: true },
    });
    if (!order) return null;
    if (String(order.status) === 'REFUNDED') return null;
    if (order.razorpayRefundId !== params.razorpayRefundId) return null;

    await this.updateOrder({
      where: { id: order.id },
      data: { razorpayRefundId: null },
    });

    this.logger.warn(
      `Razorpay refund ${params.razorpayRefundId} failed for order ${order.id}; cleared recorded refund id so it can be retried`,
    );

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
