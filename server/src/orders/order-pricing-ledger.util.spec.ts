import {
  computeOrderPricingLedger,
  creatorPayoutPaiseFromOrderTotal,
  PLATFORM_FEE_RATE,
} from './order-pricing-ledger.util';

describe('computeOrderPricingLedger', () => {
  it('no extra purchases: creator gets 80%, no refund', () => {
    const l = computeOrderPricingLedger({
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
    expect(l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise).toBe(
      l.brandPaidPaise,
    );
  });

  it('all purchased extras used: full value earned, refund 0', () => {
    // base cap 1, bought 1 pack (+2), used all 3 (revisionCount 3).
    const l = computeOrderPricingLedger({
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
    expect(l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise).toBe(
      120000,
    );
  });

  it('some extras unused: refunds the unused at full price', () => {
    // base cap 1, bought 2 packs (+4, ₹200 each → 40000), used 2 extras only.
    const l = computeOrderPricingLedger({
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
    expect(l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise).toBe(
      140000,
    );
  });

  it('none of the extras used: whole extra amount is refunded', () => {
    const l = computeOrderPricingLedger({
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
    expect(l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise).toBe(
      l.brandPaidPaise,
    );
  });

  it('values unused revisions LIFO across purchases at each price', () => {
    // two packs at different prices; 1 unused should be valued at the LAST
    // (most recent) purchase's per-revision price.
    const early = new Date('2026-01-01');
    const late = new Date('2026-02-01');
    const l = computeOrderPricingLedger({
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
    expect(l.payToCreatorPaise + l.platformFeePaise + l.refundToBrandPaise).toBe(
      80000,
    );
  });

  it('PLATFORM_FEE_RATE is 20%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.2);
  });
});

describe('creatorPayoutPaiseFromOrderTotal', () => {
  it('matches the 20% fee on a ₹2,500 order (₹2,000 to creator)', () => {
    expect(creatorPayoutPaiseFromOrderTotal(250000)).toBe(200000);
  });
});
