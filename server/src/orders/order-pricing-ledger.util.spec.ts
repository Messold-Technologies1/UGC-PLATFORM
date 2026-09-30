import {
  computeOrderPricingLedger,
  creatorPayoutPaiseFromOrderTotal,
  PLATFORM_FEE_RATE,
} from './order-pricing-ledger.util';

describe('computeOrderPricingLedger', () => {
  it('no extra purchases: creator gets 80%, no refund', () => {
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 100000, // ₹1000
      maxRevisionsSnapshot: 1,
      revisionCount: 1,
      paidPurchases: [],
    });
    expect(l.brandPaidPaise).toBe(100000);
    expect(l.refundToBrandPaise).toBe(0);
    expect(l.platformFeePaise).toBe(20000);
    expect(l.payToCreatorPaise).toBe(80000);
    // Always balances.
    expect(
      l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise,
    ).toBe(l.brandPaidPaise);
  });

  it('waivePlatformFee (No platform fee coupon): fee 0, creator gets the full net', () => {
    // ₹5000 gross, fee waived → brand pays ₹4000 net; creator gets it all.
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 400000, // net (brand paid)
      grossBasePlusAddOnsPaise: 500000, // gross (pre-waiver)
      maxRevisionsSnapshot: 1,
      revisionCount: 1,
      paidPurchases: [],
      waivePlatformFee: true,
    });
    expect(l.brandPaidPaise).toBe(400000);
    expect(l.platformFeePaise).toBe(0);
    // 80% of gross (5000) = 4000 = the full net the brand paid.
    expect(l.payToCreatorPaise).toBe(400000);
    // Platform keeps nothing.
    expect(l.brandPaidPaise - l.payToCreatorPaise).toBe(0);
  });

  it('coupon order: fee is 20% of GROSS and creator gets 80% of GROSS (made whole)', () => {
    // ₹4900 gross, ₹500 coupon → ₹4400 net (brand paid). The coupon comes out
    // of the platform's cut, not the creator's payout.
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 440000, // net (brand paid)
      grossBasePlusAddOnsPaise: 490000, // gross (pre-coupon)
      maxRevisionsSnapshot: 1,
      revisionCount: 1,
      paidPurchases: [],
    });
    expect(l.brandPaidPaise).toBe(440000);
    expect(l.platformFeeBasePaise).toBe(490000);
    expect(l.platformFeePaise).toBe(98000); // 20% of 4900
    expect(l.payToCreatorPaise).toBe(392000); // 80% of 4900 (4900 − 980)
    // Creator + fee reconcile to the GROSS value (the platform funds the coupon).
    expect(l.payToCreatorPaise + l.platformFeePaise).toBe(
      l.platformFeeBasePaise,
    );
    // The platform's actual margin = brand paid − creator payout = ₹480.
    expect(l.brandPaidPaise - l.payToCreatorPaise).toBe(48000);
  });

  it('non-coupon order: fee base falls back to the net base', () => {
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 100000,
      maxRevisionsSnapshot: 1,
      revisionCount: 1,
      paidPurchases: [],
    });
    expect(l.platformFeeBasePaise).toBe(100000);
    expect(l.platformFeePaise).toBe(20000);
  });

  it('all purchased extras used: full value earned, refund 0', () => {
    // base cap 1, bought 1 pack (+2), used all 3 (revisionCount 3).
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 100000,
      maxRevisionsSnapshot: 3, // 1 base + 2 granted
      revisionCount: 3,
      paidPurchases: [
        { revisionsAdded: 2, expectedAmountPaise: 20000, paidAt: new Date() },
      ],
    });
    expect(l.extraRevisionsPurchased).toBe(2);
    expect(l.extraRevisionsUsed).toBe(2);
    expect(l.extraRevisionsUnused).toBe(0);
    expect(l.refundToBrandPaise).toBe(0);
    expect(l.brandPaidPaise).toBe(120000);
    expect(l.earnedPaise).toBe(120000);
    expect(l.platformFeePaise).toBe(24000);
    expect(l.payToCreatorPaise).toBe(96000);
    expect(
      l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise,
    ).toBe(120000);
  });

  it('some extras unused: refunds the unused at full price', () => {
    // base cap 1, bought 2 packs (+4, ₹200 each → 40000), used 2 extras only.
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 100000,
      maxRevisionsSnapshot: 5, // 1 base + 4 granted
      revisionCount: 3, // 1 base + 2 extra used
      paidPurchases: [
        { revisionsAdded: 4, expectedAmountPaise: 40000, paidAt: new Date() },
      ],
    });
    expect(l.extraRevisionsPurchased).toBe(4);
    expect(l.extraRevisionsUsed).toBe(2);
    expect(l.extraRevisionsUnused).toBe(2);
    // per-revision = 40000/4 = 10000; 2 unused → 20000 refund.
    expect(l.refundToBrandPaise).toBe(20000);
    expect(l.brandPaidPaise).toBe(140000);
    expect(l.earnedPaise).toBe(120000); // base 100000 + 2 used × 10000
    expect(l.platformFeePaise).toBe(24000);
    expect(l.payToCreatorPaise).toBe(96000);
    expect(
      l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise,
    ).toBe(140000);
  });

  it('none of the extras used: whole extra amount is refunded', () => {
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 100000,
      maxRevisionsSnapshot: 3,
      revisionCount: 1, // only the base revision used
      paidPurchases: [
        { revisionsAdded: 2, expectedAmountPaise: 20000, paidAt: new Date() },
      ],
    });
    expect(l.extraRevisionsUnused).toBe(2);
    expect(l.refundToBrandPaise).toBe(20000);
    expect(l.earnedPaise).toBe(100000);
    expect(l.payToCreatorPaise).toBe(80000);
    expect(
      l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise,
    ).toBe(l.brandPaidPaise);
  });

  it('values unused revisions LIFO across purchases at each price', () => {
    // two packs at different prices; 1 unused should be valued at the LAST
    // (most recent) purchase's per-revision price.
    const early = new Date('2026-01-01');
    const late = new Date('2026-02-01');
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 0,
      maxRevisionsSnapshot: 4, // base 0 + 4 granted (2 + 2)
      revisionCount: 3, // 3 used, 1 unused
      paidPurchases: [
        { revisionsAdded: 2, expectedAmountPaise: 20000, paidAt: early }, // 10000/rev
        { revisionsAdded: 2, expectedAmountPaise: 60000, paidAt: late }, // 30000/rev
      ],
    });
    expect(l.extraRevisionsUnused).toBe(1);
    // the single unused revision is the last one → valued 30000.
    expect(l.refundToBrandPaise).toBe(30000);
    expect(l.brandPaidPaise).toBe(80000);
    expect(
      l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise,
    ).toBe(80000);
  });

  it('PLATFORM_FEE_RATE is 20%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.2);
  });

  it('rejected/refunded order refunds the full brand payment', () => {
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 610000,
      maxRevisionsSnapshot: 2,
      revisionCount: 0,
      paidPurchases: [],
      fullRefundToBrand: true,
    });
    expect(l.brandPaidPaise).toBe(610000);
    expect(l.refundToBrandPaise).toBe(610000);
    expect(l.platformFeePaise).toBe(0);
    expect(l.payToCreatorPaise).toBe(0);
    expect(
      l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise,
    ).toBe(l.brandPaidPaise);
  });
  it('never paid: every settlement figure is 0, the quote stays visible', () => {
    // A checkout draft (PENDING_PAYMENT) or a draft closed without payment.
    // expectedAmountPaise is a QUOTE — treating it as collected money is what
    // made the admin panel offer refunds for purchases that never happened.
    const l = computeOrderPricingLedger({
      paidAt: null,
      expectedAmountPaise: 50000,
      maxRevisionsSnapshot: 1,
      revisionCount: 0,
      paidPurchases: [],
    });
    expect(l.basePlusAddOnsPaise).toBe(50000); // the quote is still shown
    expect(l.brandPaidPaise).toBe(0);
    expect(l.cashPaidPaise).toBe(0);
    expect(l.creditPaidPaise).toBe(0);
    expect(l.refundToBrandPaise).toBe(0);
    expect(l.payToCreatorPaise).toBe(0);
    expect(l.platformFeePaise).toBe(0);
  });

  it('never paid + fullRefundToBrand: still 0 (the superseded-draft regression)', () => {
    // A duplicate checkout swept to REJECTED reaches the full-refund branch.
    // Before the paidAt gate this reported the whole quote as owed back.
    const l = computeOrderPricingLedger({
      paidAt: null,
      expectedAmountPaise: 50000,
      maxRevisionsSnapshot: 1,
      revisionCount: 0,
      paidPurchases: [],
      fullRefundToBrand: true,
    });
    expect(l.brandPaidPaise).toBe(0);
    expect(l.refundToBrandPaise).toBe(0);
    expect(l.refundToBrandCashPaise).toBe(0);
    expect(l.refundToBrandCreditPaise).toBe(0);
  });

  it('free order (paid, but ₹0 collected): nothing owed to anyone', () => {
    // First-order-free and 100%-coupon orders DO get paidAt, with a ₹0 net.
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 0,
      maxRevisionsSnapshot: 1,
      revisionCount: 0,
      paidPurchases: [],
      fullRefundToBrand: true,
    });
    expect(l.brandPaidPaise).toBe(0);
    expect(l.cashPaidPaise).toBe(0);
    expect(l.refundToBrandCashPaise).toBe(0);
  });

  it('fully credit-paid: the whole settlement is credit, no cash to refund', () => {
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 50000,
      creditsAppliedPaise: 50000,
      maxRevisionsSnapshot: 1,
      revisionCount: 0,
      paidPurchases: [],
      fullRefundToBrand: true,
    });
    expect(l.brandPaidPaise).toBe(50000);
    expect(l.creditPaidPaise).toBe(50000);
    expect(l.cashPaidPaise).toBe(0);
    // Refunding 50000 as cash would pay out money never collected.
    expect(l.refundToBrandCashPaise).toBe(0);
    expect(l.refundToBrandCreditPaise).toBe(50000);
  });

  it('partial credit: refunds cash and credit to the source that funded them', () => {
    // ₹500 order, ₹300 from the wallet, ₹200 actually charged via Razorpay.
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 50000,
      creditsAppliedPaise: 30000,
      maxRevisionsSnapshot: 1,
      revisionCount: 0,
      paidPurchases: [],
      fullRefundToBrand: true,
    });
    expect(l.brandPaidPaise).toBe(50000);
    expect(l.creditPaidPaise).toBe(30000);
    expect(l.cashPaidPaise).toBe(20000);
    expect(l.refundToBrandCashPaise).toBe(20000); // only what Razorpay took
    expect(l.refundToBrandCreditPaise).toBe(30000);
    expect(l.refundToBrandCashPaise + l.refundToBrandCreditPaise).toBe(
      l.refundToBrandPaise,
    );
  });

  it('credit never absorbs extra-revision purchases (those are always cash)', () => {
    // Base ₹500 fully covered by credit, plus a ₹200 cash revision pack.
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 50000,
      creditsAppliedPaise: 50000,
      maxRevisionsSnapshot: 3,
      revisionCount: 1,
      paidPurchases: [
        { revisionsAdded: 2, expectedAmountPaise: 20000, paidAt: new Date() },
      ],
    });
    expect(l.brandPaidPaise).toBe(70000);
    expect(l.creditPaidPaise).toBe(50000); // capped at the base
    expect(l.cashPaidPaise).toBe(20000); // the revision pack
    // Both extras unused → refunded, and that refund is entirely cash.
    expect(l.refundToBrandPaise).toBe(20000);
    expect(l.refundToBrandCashPaise).toBe(20000);
    expect(l.refundToBrandCreditPaise).toBe(0);
  });

  it('paid orders split into cash + credit that sum to the total settled', () => {
    const l = computeOrderPricingLedger({
      paidAt: new Date(),
      expectedAmountPaise: 100000,
      creditsAppliedPaise: 25000,
      maxRevisionsSnapshot: 1,
      revisionCount: 1,
      paidPurchases: [],
    });
    expect(l.cashPaidPaise + l.creditPaidPaise).toBe(l.brandPaidPaise);
  });
});

describe('creatorPayoutPaiseFromOrderTotal', () => {
  it('matches the 20% fee on a ₹2,500 order (₹2,000 to creator)', () => {
    expect(creatorPayoutPaiseFromOrderTotal(250000)).toBe(200000);
  });
});
