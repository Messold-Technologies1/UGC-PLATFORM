import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_FEE_RATE } from '../orders/order-pricing-ledger.util';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import {
  AvailableCouponDto,
  CouponResponseDto,
} from './dto/coupon-response.dto';

/** Razorpay rejects orders below ₹1; a coupon may never drive the net that low. */
const MIN_NET_PAISE = 100;

export type ResolvedCoupon = {
  couponId: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountAmountPaise: number;
};

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  static normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Pure discount math. `grossPaise` is the pre-discount order total. The result
   * is clamped to [0, grossPaise] so the net is never negative.
   * - PERCENTAGE: floor(gross * value%)
   * - FIXED: value paise, capped at gross
   * - PLATFORM_FEE_WAIVER: gross * PLATFORM_FEE_RATE (brand pays the order value
   *   minus the platform's cut — same net as an equivalent percentage-off).
   */
  static computeDiscountPaise(
    discountType: DiscountType,
    discountValue: number,
    grossPaise: number,
  ): number {
    const gross = Math.max(0, Math.round(grossPaise));
    let discount: number;
    switch (discountType) {
      case DiscountType.PERCENTAGE: {
        const pct = Math.min(100, Math.max(0, discountValue));
        discount = Math.floor((gross * pct) / 100);
        break;
      }
      case DiscountType.FIXED:
        discount = Math.max(0, Math.round(discountValue));
        break;
      case DiscountType.PLATFORM_FEE_WAIVER:
        discount = Math.round(gross * PLATFORM_FEE_RATE);
        break;
      default:
        discount = 0;
    }
    return Math.min(gross, Math.max(0, discount));
  }

  private toResponse(
    coupon: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      discountType: DiscountType;
      discountValue: number;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    redemptionCount?: number,
  ): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      active: coupon.active,
      redemptionCount,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  private validateValueForType(
    discountType: DiscountType,
    discountValue: number,
  ): void {
    if (discountType === DiscountType.PERCENTAGE) {
      if (discountValue <= 0 || discountValue > 100) {
        throw new BadRequestException(
          'Percentage discount must be between 1 and 100',
        );
      }
    } else if (discountType === DiscountType.FIXED) {
      if (discountValue <= 0) {
        throw new BadRequestException(
          'Fixed discount amount (paise) must be greater than 0',
        );
      }
    }
    // PLATFORM_FEE_WAIVER ignores discountValue.
  }

  // ---- Admin CRUD ---------------------------------------------------------

  async listForAdmin(): Promise<CouponResponseDto[]> {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    });
    return coupons.map((c) => this.toResponse(c, c._count.redemptions));
  }

  async getByIdForAdmin(id: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.toResponse(coupon, coupon._count.redemptions);
  }

  async create(
    createdByUserId: string,
    dto: CreateCouponDto,
  ): Promise<CouponResponseDto> {
    const code = CouponsService.normalizeCode(dto.code);
    const discountValue = dto.discountValue ?? 0;
    this.validateValueForType(dto.discountType, discountValue);
    try {
      const coupon = await this.prisma.coupon.create({
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          discountType: dto.discountType,
          discountValue,
          active: dto.active ?? true,
          createdByUserId,
        },
      });
      return this.toResponse(coupon, 0);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A coupon with this code already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');

    const nextType = dto.discountType ?? existing.discountType;
    const nextValue = dto.discountValue ?? existing.discountValue;
    if (dto.discountType !== undefined || dto.discountValue !== undefined) {
      this.validateValueForType(nextType, nextValue);
    }

    const data: Prisma.CouponUpdateInput = {};
    if (dto.code !== undefined) data.code = CouponsService.normalizeCode(dto.code);
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.active !== undefined) data.active = dto.active;

    try {
      const coupon = await this.prisma.coupon.update({
        where: { id },
        data,
        include: { _count: { select: { redemptions: true } } },
      });
      return this.toResponse(coupon, coupon._count.redemptions);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A coupon with this code already exists');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    // Preserve history: if brands have redeemed it, deactivate instead of delete
    // (the FK from Order/redemptions would otherwise block or null out records).
    if (existing._count.redemptions > 0) {
      await this.prisma.coupon.update({
        where: { id },
        data: { active: false },
      });
      return;
    }
    await this.prisma.coupon.delete({ where: { id } });
  }

  // ---- Brand-facing -------------------------------------------------------

  async listAvailableForBrand(brandId: string): Promise<AvailableCouponDto[]> {
    const coupons = await this.prisma.coupon.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (coupons.length === 0) return [];
    const redemptions = await this.prisma.couponRedemption.findMany({
      where: { brandId, couponId: { in: coupons.map((c) => c.id) } },
      select: { couponId: true },
    });
    const usedCouponIds = new Set(redemptions.map((r) => r.couponId));
    return coupons.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      alreadyUsed: usedCouponIds.has(c.id),
    }));
  }

  // ---- Checkout integration ----------------------------------------------

  /**
   * Validate a coupon for a brand at checkout and compute its discount against
   * the given gross total. Throws a 400 on any problem (unknown/inactive code,
   * already redeemed by this brand, or a discount that would leave the net below
   * the payment-gateway minimum). Returns null only when no code was supplied.
   */
  async resolveForCheckout(params: {
    code?: string | null;
    brandId: string;
    grossPaise: number;
  }): Promise<ResolvedCoupon | null> {
    const raw = params.code?.trim();
    if (!raw) return null;
    const code = CouponsService.normalizeCode(raw);

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) {
      throw new BadRequestException('This coupon is invalid or no longer active');
    }

    const alreadyUsed = await this.prisma.couponRedemption.findUnique({
      where: {
        couponId_brandId: { couponId: coupon.id, brandId: params.brandId },
      },
      select: { id: true },
    });
    if (alreadyUsed) {
      throw new BadRequestException('You have already used this coupon');
    }

    const discountAmountPaise = CouponsService.computeDiscountPaise(
      coupon.discountType,
      coupon.discountValue,
      params.grossPaise,
    );
    if (params.grossPaise - discountAmountPaise < MIN_NET_PAISE) {
      throw new BadRequestException(
        'This coupon cannot be applied to an order this small',
      );
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      discountAmountPaise,
    };
  }

  /**
   * Record that a brand consumed a coupon on a paid order/batch. Idempotent: the
   * (couponId, brandId) unique constraint means a duplicate capture (or a second
   * paid order racing the same coupon) is swallowed rather than throwing.
   */
  async recordRedemption(
    params: {
      couponId: string;
      brandId: string;
      orderId?: string;
      checkoutBatchId?: string;
      discountAmountPaise: number;
    },
    client?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = client ?? this.prisma;
    try {
      await db.couponRedemption.create({
        data: {
          couponId: params.couponId,
          brandId: params.brandId,
          orderId: params.orderId ?? null,
          checkoutBatchId: params.checkoutBatchId ?? null,
          discountAmountPaise: params.discountAmountPaise,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        this.logger.debug(
          `coupon redemption already recorded coupon=${params.couponId} brand=${params.brandId}`,
        );
        return;
      }
      throw err;
    }
  }
}
