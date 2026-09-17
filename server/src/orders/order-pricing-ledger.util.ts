/**
 * Admin pricing ledger for an order. Pure + integer-paise so it's exact and
 * unit-testable. The whole point: give the admin the settlement figures when a
 * brand has paid for extra revisions but may not use them all.
 *
 * Money model (confirmed with product):
 * - Existing 20% platform fee (mirrors the client `PLATFORM_FEE_RATE` in
 *   client/features/creators/hooks/creator-profile-form-utils.ts — keep in sync).
 * - Extra revisions add to the creator's payout only for the ones actually used;
 *   purchased-but-unused revisions are refunded to the brand at full price.
 * - Everything balances: brandPaid === payToCreator + platformFee + refundToBrand.
 */

/** Platform commission taken from what the creator earns. Keep in sync with the
 *  client constant `PLATFORM_FEE_RATE`. */
export const PLATFORM_FEE_RATE = 0.2;

export type PaidRevisionPurchase = {
  revisionsAdded: number;
  expectedAmountPaise: number;
  paidAt: Date | null;
};

export type OrderPricingLedger = {
  /** Total the brand paid us: base + add-ons + all extra-revision purchases. */
  brandPaidPaise: number;
  /** Base package + add-ons (the order's original expectedAmountPaise). */
  basePlusAddOnsPaise: number;
  /** Sum of every paid extra-revisions purchase. */
  extraPaidPaise: number;
  extraRevisionsPurchased: number;
  extraRevisionsUsed: number;
  extraRevisionsUnused: number;
  /** Value of purchased-but-unused extra revisions — owed back to the brand. */
  refundToBrandPaise: number;
  /** Base + add-ons + used extras (what the order actually earned). */
  earnedPaise: number;
  /**
   * The amount the platform fee is charged on: the PRE-coupon base + add-ons
   * (gross) plus used extras. A coupon discount does not shrink the platform's
   * fee — it comes out of the creator's payout. 0 when the fee is waived.
   */
  platformFeeBasePaise: number;
  /** 20% of platformFeeBasePaise (the gross base); 0 when the fee is waived. */
  platformFeePaise: number;
  /** earned − platform fee — owed to the creator. */
  payToCreatorPaise: number;
};

/** Split `total` paise into `parts` integer amounts that sum exactly to total. */
function splitPaise(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function computeOrderPricingLedger(input: {
  /** order.expectedAmountPaise — base package + add-ons. */
  expectedAmountPaise: number;
  /** order.maxRevisionsSnapshot — already includes granted extras. */
  maxRevisionsSnapshot: number;
  /** order.revisionCount — revisions used (requested) so far. */
  revisionCount: number;
  /** PAID extra-revision purchases. */
  paidPurchases: PaidRevisionPurchase[];
  /** Rejected/refunded orders: brand gets everything back; creator/platform get 0. */
  fullRefundToBrand?: boolean;
  /**
   * "No platform fee" coupon (PLATFORM_FEE_WAIVER): the platform takes no cut,
   * so the creator is paid the full earned amount and the platform fee is 0.
   */
  waivePlatformFee?: boolean;
  /**
   * Pre-coupon base + add-ons (the order's grossAmountPaise). The platform fee
   * is charged on THIS, not on the discounted net. Defaults to the net base
   * when omitted or 0 (non-coupon orders: gross === net).
   */
  grossBasePlusAddOnsPaise?: number;
}): OrderPricingLedger {
  const basePlusAddOnsPaise = Math.max(0, Math.round(input.expectedAmountPaise));
  // The fee base is the gross (pre-coupon) base when a coupon was applied; for
  // non-coupon orders gross === net, so fall back to the net base.
  const grossBasePlusAddOnsPaise = Math.max(
    basePlusAddOnsPaise,
    Math.round(input.grossBasePlusAddOnsPaise ?? 0),
  );

  const purchases = [...input.paidPurchases].sort((a, b) => {
    const ta = a.paidAt ? a.paidAt.getTime() : 0;
    const tb = b.paidAt ? b.paidAt.getTime() : 0;
    return ta - tb;
  });

  const extraRevisionsPurchased = purchases.reduce(
    (sum, p) => sum + Math.max(0, p.revisionsAdded),
    0,
  );
  const extraPaidPaise = purchases.reduce(
    (sum, p) => sum + Math.max(0, p.expectedAmountPaise),
    0,
  );

  // The pre-purchase cap: the current snapshot minus everything granted.
  const baseCap = Math.max(0, input.maxRevisionsSnapshot - extraRevisionsPurchased);
  const extraRevisionsUsed = Math.min(
    Math.max(0, input.revisionCount - baseCap),
    extraRevisionsPurchased,
  );
  const extraRevisionsUnused = extraRevisionsPurchased - extraRevisionsUsed;

  // Value each granted revision (earliest purchases first). Unused = the LAST
  // `extraRevisionsUnused` revisions → refunded to the brand.
  const perRevisionPaise: number[] = [];
  for (const p of purchases) {
    perRevisionPaise.push(
      ...splitPaise(Math.max(0, p.expectedAmountPaise), Math.max(0, p.revisionsAdded)),
    );
  }
  const refundToBrandPaise =
    extraRevisionsUnused > 0
      ? perRevisionPaise
          .slice(perRevisionPaise.length - extraRevisionsUnused)
          .reduce((sum, v) => sum + v, 0)
      : 0;

  const usedExtrasPaise = extraPaidPaise - refundToBrandPaise;
  const brandPaidPaise = basePlusAddOnsPaise + extraPaidPaise;

  if (input.fullRefundToBrand) {
    return {
      brandPaidPaise,
      basePlusAddOnsPaise,
      extraPaidPaise,
      extraRevisionsPurchased,
      extraRevisionsUsed,
      extraRevisionsUnused,
      refundToBrandPaise: brandPaidPaise,
      earnedPaise: 0,
      platformFeeBasePaise: 0,
      platformFeePaise: 0,
      payToCreatorPaise: 0,
    };
  }

  const earnedPaise = basePlusAddOnsPaise + usedExtrasPaise;
  // Fee is charged on the GROSS base (+ used extras), not the discounted net —
  // a coupon discount comes out of the creator's payout. The "No platform fee"
  // coupon waives it entirely. Clamp to earned so the payout never goes negative.
  const platformFeeBasePaise = grossBasePlusAddOnsPaise + usedExtrasPaise;
  const platformFeePaise = input.waivePlatformFee
    ? 0
    : Math.min(earnedPaise, Math.round(platformFeeBasePaise * PLATFORM_FEE_RATE));
  const payToCreatorPaise = earnedPaise - platformFeePaise;

  return {
    brandPaidPaise,
    basePlusAddOnsPaise,
    extraPaidPaise,
    extraRevisionsPurchased,
    extraRevisionsUsed,
    extraRevisionsUnused,
    refundToBrandPaise,
    earnedPaise,
    platformFeeBasePaise,
    platformFeePaise,
    payToCreatorPaise,
  };
}

/**
 * What the creator receives from a paid order's checkout total (package +
 * add-ons), after the 20% platform fee. Same math as the creator payout card.
 */
export function creatorPayoutPaiseFromOrderTotal(
  expectedAmountPaise: number,
): number {
  const total = Math.max(0, Math.round(expectedAmountPaise));
  return total - Math.round(total * PLATFORM_FEE_RATE);
}
