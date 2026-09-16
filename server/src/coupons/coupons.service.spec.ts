import { DiscountType } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { PLATFORM_FEE_RATE } from '../orders/order-pricing-ledger.util';

/**
 * Pure discount math — the authoritative reduction applied at checkout. Money is
 * integer paise; the result is always clamped to [0, gross] so the net is valid.
 */
describe('CouponsService.computeDiscountPaise', () => {
  const compute = CouponsService.computeDiscountPaise;

  it('PERCENTAGE takes the floored percentage of gross', () => {
    expect(compute(DiscountType.PERCENTAGE, 20, 100000)).toBe(20000);
    // floor(99999 * 0.2) = floor(19999.8) = 19999
    expect(compute(DiscountType.PERCENTAGE, 20, 99999)).toBe(19999);
  });

  it('PERCENTAGE clamps the percent to 0..100', () => {
    expect(compute(DiscountType.PERCENTAGE, 150, 100000)).toBe(100000);
    expect(compute(DiscountType.PERCENTAGE, -10, 100000)).toBe(0);
  });

  it('FIXED subtracts the paise amount, capped at gross', () => {
    expect(compute(DiscountType.FIXED, 50000, 100000)).toBe(50000);
    expect(compute(DiscountType.FIXED, 50000, 30000)).toBe(30000);
  });

  it('PLATFORM_FEE_WAIVER discounts exactly the platform fee', () => {
    expect(compute(DiscountType.PLATFORM_FEE_WAIVER, 0, 100000)).toBe(
      Math.round(100000 * PLATFORM_FEE_RATE),
    );
    // Same net as an equivalent 20% off when the fee rate is 20%.
    expect(compute(DiscountType.PLATFORM_FEE_WAIVER, 0, 100000)).toBe(
      compute(DiscountType.PERCENTAGE, PLATFORM_FEE_RATE * 100, 100000),
    );
  });

  it('never returns a negative discount or one exceeding gross', () => {
    expect(compute(DiscountType.FIXED, 999999, 5000)).toBe(5000);
    expect(compute(DiscountType.FIXED, 0, 5000)).toBe(0);
  });

  it('normalizeCode uppercases and trims', () => {
    expect(CouponsService.normalizeCode('  welcome20 ')).toBe('WELCOME20');
  });
});
