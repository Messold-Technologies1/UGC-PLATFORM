import { BadRequestException } from '@nestjs/common';

/** Buyer that owns a coupon redemption or store-credit wallet. */
export type CreditOwner = {
  brandId?: string | null;
  agencyId?: string | null;
};

export function normalizeCreditOwner(owner: CreditOwner): {
  brandId: string | null;
  agencyId: string | null;
} {
  const brandId = owner.brandId?.trim() || null;
  const agencyId = owner.agencyId?.trim() || null;
  if (Boolean(brandId) === Boolean(agencyId)) {
    throw new BadRequestException(
      'Exactly one of brandId or agencyId is required for credits/coupons',
    );
  }
  return { brandId, agencyId };
}

export function creditOwnerWhere(owner: CreditOwner): {
  brandId?: string;
  agencyId?: string;
} {
  const normalized = normalizeCreditOwner(owner);
  if (normalized.agencyId) return { agencyId: normalized.agencyId };
  return { brandId: normalized.brandId! };
}
