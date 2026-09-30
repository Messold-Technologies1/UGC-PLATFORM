import { AdminBrandCreditDto } from './dto/wallet.dto';
import type { AdminBrandCreditRow } from './wallet.service';

/**
 * The admin Credits list reports three numbers per brand. `availablePaise` is
 * derived rather than stored, and getting it wrong is a money error: held funds
 * still sit inside `balancePaise`, so reporting the balance alone tells an
 * admin a brand can spend money that a pending withdrawal has already locked.
 */
describe('AdminBrandCreditDto.from', () => {
  const row = (
    over: Partial<AdminBrandCreditRow> = {},
  ): AdminBrandCreditRow => ({
    brandId: 'brand-1',
    brandName: 'Acme',
    logoUrl: null,
    contactEmail: 'team@acme.test',
    balancePaise: 50000,
    heldPaise: 0,
    currency: 'INR',
    lastActivityAt: new Date('2026-09-01'),
    ...over,
  });

  it('available equals balance when nothing is held', () => {
    const dto = AdminBrandCreditDto.from(row());
    expect(dto.balancePaise).toBe(50000);
    expect(dto.heldPaise).toBe(0);
    expect(dto.availablePaise).toBe(50000);
  });

  it('subtracts held funds from what the brand can spend', () => {
    // ₹500 owned, ₹200 locked by a pending withdrawal → ₹300 spendable.
    const dto = AdminBrandCreditDto.from(row({ heldPaise: 20000 }));
    expect(dto.balancePaise).toBe(50000);
    expect(dto.availablePaise).toBe(30000);
    // The held money has NOT left the balance — it is locked inside it.
    expect(dto.availablePaise + dto.heldPaise).toBe(dto.balancePaise);
  });

  it('reports zero across the board for a brand that never held credit', () => {
    // No BrandWallet row exists until a brand's first credit, so the list's
    // LEFT JOIN yields zeros and a null last-activity rather than omitting them.
    const dto = AdminBrandCreditDto.from(
      row({ balancePaise: 0, heldPaise: 0, lastActivityAt: null }),
    );
    expect(dto.balancePaise).toBe(0);
    expect(dto.availablePaise).toBe(0);
    expect(dto.lastActivityAt).toBeNull();
  });

  it('carries the brand identity through for the list row', () => {
    const dto = AdminBrandCreditDto.from(row({ brandName: null }));
    expect(dto.brandId).toBe('brand-1');
    expect(dto.brandName).toBeNull();
    expect(dto.contactEmail).toBe('team@acme.test');
    expect(dto.currency).toBe('INR');
  });
});
