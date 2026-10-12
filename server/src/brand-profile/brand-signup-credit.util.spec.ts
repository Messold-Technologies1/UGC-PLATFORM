import { resolveBrandSignupCreditPaise } from './brand-signup-credit.util';

/**
 * The gate decides whether money is created, so it is worth its own test: the
 * switch, the amount, and every way the amount can be junk.
 */
describe('resolveBrandSignupCreditPaise', () => {
  const on = { enabled: 'true', amountPaise: '10000' };

  it('grants the configured amount when switched on', () => {
    expect(resolveBrandSignupCreditPaise(on)).toBe(10000);
  });

  it('grants nothing while the feature is off', () => {
    expect(resolveBrandSignupCreditPaise({ ...on, enabled: 'false' })).toBe(0);
    expect(resolveBrandSignupCreditPaise({ ...on, enabled: undefined })).toBe(
      0,
    );
    expect(resolveBrandSignupCreditPaise({ ...on, enabled: '' })).toBe(0);
  });

  it('follows the configured amount, whatever it is set to', () => {
    expect(resolveBrandSignupCreditPaise({ ...on, amountPaise: '25000' })).toBe(
      25000,
    );
    expect(resolveBrandSignupCreditPaise({ ...on, amountPaise: 5000 })).toBe(
      5000,
    );
  });

  it('treats a zero, negative, fractional or unparseable amount as off', () => {
    for (const amountPaise of [
      '0',
      '-10000',
      '100.5',
      'hundred',
      '',
      undefined,
    ]) {
      expect(resolveBrandSignupCreditPaise({ ...on, amountPaise })).toBe(0);
    }
  });

  it('is independent of the order-completion reward settings', () => {
    // Separate env vars entirely: nothing here reads ORDER_COMPLETION_*, so one
    // reward can run while the other is off.
    expect(
      resolveBrandSignupCreditPaise({ enabled: 'true', amountPaise: '10000' }),
    ).toBe(10000);
  });
});
