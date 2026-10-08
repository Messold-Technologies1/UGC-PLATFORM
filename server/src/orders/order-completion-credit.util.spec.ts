import { resolveOrderCompletionCreditPaise } from './order-completion-credit.util';

/**
 * The reward is money leaving the platform, so the gate decides it: the env
 * switch, the env amount, and the two orders that must never mint credit (an
 * order nobody paid for, and an order with no wallet to credit).
 */
describe('resolveOrderCompletionCreditPaise', () => {
  const on = { enabled: 'true', amountPaise: '5000' };
  const paidOrder = {
    brandId: 'brand-1',
    agencyId: null,
    expectedAmountPaise: 500000,
    isFreeOrder: false,
  };

  it('grants the configured amount for a paid order', () => {
    expect(resolveOrderCompletionCreditPaise(on, paidOrder)).toBe(5000);
  });

  it('grants nothing while the feature is off', () => {
    expect(
      resolveOrderCompletionCreditPaise({ ...on, enabled: 'false' }, paidOrder),
    ).toBe(0);
    expect(
      resolveOrderCompletionCreditPaise(
        { ...on, enabled: undefined },
        paidOrder,
      ),
    ).toBe(0);
  });

  it('follows the configured amount, whatever it is set to', () => {
    expect(
      resolveOrderCompletionCreditPaise(
        { ...on, amountPaise: '10000' },
        paidOrder,
      ),
    ).toBe(10000);
    expect(
      resolveOrderCompletionCreditPaise(
        { ...on, amountPaise: 2500 },
        paidOrder,
      ),
    ).toBe(2500);
  });

  it('treats a zero, negative, fractional or unparseable amount as off', () => {
    for (const amountPaise of ['0', '-5000', '50.5', 'fifty', '', undefined]) {
      expect(
        resolveOrderCompletionCreditPaise({ ...on, amountPaise }, paidOrder),
      ).toBe(0);
    }
  });

  it('grants nothing for a free or ₹0 order', () => {
    // A free order that minted spendable credit would be a money printer.
    expect(
      resolveOrderCompletionCreditPaise(on, {
        ...paidOrder,
        isFreeOrder: true,
      }),
    ).toBe(0);
    expect(
      resolveOrderCompletionCreditPaise(on, {
        ...paidOrder,
        expectedAmountPaise: 0,
      }),
    ).toBe(0);
  });

  it('grants nothing for an order with no brand or agency to credit', () => {
    expect(
      resolveOrderCompletionCreditPaise(on, { ...paidOrder, brandId: null }),
    ).toBe(0);
  });

  it('credits an agency order to the agency', () => {
    expect(
      resolveOrderCompletionCreditPaise(on, {
        ...paidOrder,
        brandId: null,
        agencyId: 'agency-1',
      }),
    ).toBe(5000);
  });
});
