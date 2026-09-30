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
 * - brandPaid is what the brand SETTLED, not what Razorpay collected: it splits
 *   into cashPaid (refundable to a card) + creditPaid (returnable to the wallet
 *   only). An unpaid order settles nothing, so every figure below is 0.
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
  /**
   * Total value the brand settled: base + add-ons + all extra-revision
   * purchases. This is CASH + STORE CREDIT combined — see cashPaidPaise and
   * creditPaidPaise for the split. 0 until the order is actually paid.
   */
  brandPaidPaise: number;
  /**
   * The part of brandPaidPaise that came through Razorpay as real money. This
   * is the ONLY amount that can be refunded to a card/bank — refunding
   * brandPaidPaise on a credit-funded order would pay out money never
   * collected.
   */
  cashPaidPaise: number;
  /**
   * The part of brandPaidPaise funded from the brand's store credit wallet.
   * Returned to the wallet, never to a card.
   */
  creditPaidPaise: number;
  /** Base package + add-ons (the order's original expectedAmountPaise). */
  basePlusAddOnsPaise: number;
  /** Sum of every paid extra-revisions purchase. */
  extraPaidPaise: number;
  extraRevisionsPurchased: number;
  extraRevisionsUsed: number;
  extraRevisionsUnused: number;
  /** Value of purchased-but-unused extra revisions — owed back to the brand. */
  refundToBrandPaise: number;
  /**
   * The part of refundToBrandPaise to return through Razorpay (real money).
   * Extra-revision purchases are always cash, so a partial (unused-revisions)
   * refund is entirely cash; a full refund is split by how the order was paid.
   */
  refundToBrandCashPaise: number;
  /** The part of refundToBrandPaise to return to the brand's credit wallet. */
  refundToBrandCreditPaise: number;
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
  /**
   * 80% of the gross base (+ used extras) — owed to the creator. The creator is
   * made whole on the pre-coupon value; a coupon discount is funded by the
   * platform, not deducted from this.
   */
  payToCreatorPaise: number;
};

/** Split `total` paise into `parts` integer amounts that sum exactly to total. */
function splitPaise(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from(
    { length: parts },
    (_, i) => base + (i < remainder ? 1 : 0),
  );
}

export function computeOrderPricingLedger(input: {
  /**
   * order.paidAt. Null means the brand was never charged — the order is a
   * checkout draft (PENDING_PAYMENT) or a draft that was closed without ever
   * being paid. Every settlement figure is then 0: expectedAmountPaise is a
   * QUOTE, not money collected, and treating it as collected makes the admin
   * panel offer refunds for purchases that never happened.
   */
  paidAt: Date | null;
  /**
   * order.creditsAppliedPaise — how much of expectedAmountPaise was funded
   * from the brand's store credit wallet rather than charged via Razorpay.
   */
  creditsAppliedPaise?: number;
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
  const basePlusAddOnsPaise = Math.max(
    0,
    Math.round(input.expectedAmountPaise),
  );

  // Never charged → nothing was collected, so nothing is owed to anyone. The
  // quote (basePlusAddOnsPaise) stays visible so admins can still see what the
  // order was for, but every settlement figure is 0. Extra revisions and
  // usage-rights extensions can only be bought on a paid order, so there are
  // none to account for here.
  if (input.paidAt == null) {
    return {
      brandPaidPaise: 0,
      cashPaidPaise: 0,
      creditPaidPaise: 0,
      basePlusAddOnsPaise,
      extraPaidPaise: 0,
      extraRevisionsPurchased: 0,
      extraRevisionsUsed: 0,
      extraRevisionsUnused: 0,
      refundToBrandPaise: 0,
      refundToBrandCashPaise: 0,
      refundToBrandCreditPaise: 0,
      earnedPaise: 0,
      platformFeeBasePaise: 0,
      platformFeePaise: 0,
      payToCreatorPaise: 0,
    };
  }

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
  const baseCap = Math.max(
    0,
    input.maxRevisionsSnapshot - extraRevisionsPurchased,
  );
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
      ...splitPaise(
        Math.max(0, p.expectedAmountPaise),
        Math.max(0, p.revisionsAdded),
      ),
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

  // Store credit only ever funds the base order — extra revisions and
  // usage-rights extensions are always charged in cash — so the credit portion
  // is capped at the base and everything above it is real money.
  const creditPaidPaise = Math.min(
    Math.max(0, Math.round(input.creditsAppliedPaise ?? 0)),
    basePlusAddOnsPaise,
  );
  const cashPaidPaise = brandPaidPaise - creditPaidPaise;

  if (input.fullRefundToBrand) {
    return {
      brandPaidPaise,
      cashPaidPaise,
      creditPaidPaise,
      basePlusAddOnsPaise,
      extraPaidPaise,
      extraRevisionsPurchased,
      extraRevisionsUsed,
      extraRevisionsUnused,
      refundToBrandPaise: brandPaidPaise,
      // Give each source back what it funded: cash to Razorpay, credit to the
      // wallet. Refunding the combined total as cash would pay out money that
      // was never collected.
      refundToBrandCashPaise: cashPaidPaise,
      refundToBrandCreditPaise: creditPaidPaise,
      earnedPaise: 0,
      platformFeeBasePaise: 0,
      platformFeePaise: 0,
      payToCreatorPaise: 0,
    };
  }

  const earnedPaise = basePlusAddOnsPaise + usedExtrasPaise;
  // The platform fee AND the creator payout are both computed on the GROSS base
  // (+ used extras), i.e. the pre-coupon list value. The creator is made whole
  // on that (80% of gross); the platform's fee is 20% of gross. A coupon
  // discount comes out of the PLATFORM's cut, not the creator's payout — so the
  // platform effectively funds the discount (its net = fee − discount). The
  // "No platform fee" coupon waives the fee entirely.
  const platformFeeBasePaise = grossBasePlusAddOnsPaise + usedExtrasPaise;
  const grossFeePaise = Math.round(platformFeeBasePaise * PLATFORM_FEE_RATE);
  const platformFeePaise = input.waivePlatformFee ? 0 : grossFeePaise;
  // 80% of the gross — the creator is unaffected by the coupon.
  const payToCreatorPaise = platformFeeBasePaise - grossFeePaise;

  return {
    brandPaidPaise,
    cashPaidPaise,
    creditPaidPaise,
    basePlusAddOnsPaise,
    extraPaidPaise,
    extraRevisionsPurchased,
    extraRevisionsUsed,
    extraRevisionsUnused,
    refundToBrandPaise,
    // A partial refund only ever returns unused EXTRA revisions, which are
    // always bought with cash — so none of it comes back as store credit.
    refundToBrandCashPaise: refundToBrandPaise,
    refundToBrandCreditPaise: 0,
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
