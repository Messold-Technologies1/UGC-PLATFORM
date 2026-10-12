import { resolveSignupWelcomeCreditPaise } from './signup-welcome-credit.util';

/**
 * The gate decides whether money is created, so it is worth its own test: the
 * switch, the amount, and every way the amount can be junk.
 */
describe('resolveSignupWelcomeCreditPaise', () => {
  const on = { enabled: 'true', amountPaise: '10000' };

  it('grants the configured amount when switched on', () => {
    expect(resolveSignupWelcomeCreditPaise(on)).toBe(10000);
  });

  it('grants nothing while the feature is off', () => {
    expect(resolveSignupWelcomeCreditPaise({ ...on, enabled: 'false' })).toBe(
      0,
    );
    expect(resolveSignupWelcomeCreditPaise({ ...on, enabled: undefined })).toBe(
      0,
    );
    expect(resolveSignupWelcomeCreditPaise({ ...on, enabled: '' })).toBe(0);
  });

  it('follows the configured amount, whatever it is set to', () => {
    expect(
      resolveSignupWelcomeCreditPaise({ ...on, amountPaise: '25000' }),
    ).toBe(25000);
    expect(resolveSignupWelcomeCreditPaise({ ...on, amountPaise: 5000 })).toBe(
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
      expect(resolveSignupWelcomeCreditPaise({ ...on, amountPaise })).toBe(0);
    }
  });

  it('is one rule for both buyer types', () => {
    // Nothing here takes a brand or agency: switching the reward off switches
    // it off for both, which is the point of sharing the settings.
    expect(resolveSignupWelcomeCreditPaise(on)).toBe(10000);
    expect(resolveSignupWelcomeCreditPaise({ ...on, enabled: 'false' })).toBe(
      0,
    );
  });

  it('is independent of the order-completion reward settings', () => {
    // Separate env vars entirely: nothing here reads ORDER_COMPLETION_*, so one
    // reward can run while the other is off.
    expect(
      resolveSignupWelcomeCreditPaise({
        enabled: 'true',
        amountPaise: '10000',
      }),
    ).toBe(10000);
  });
});
