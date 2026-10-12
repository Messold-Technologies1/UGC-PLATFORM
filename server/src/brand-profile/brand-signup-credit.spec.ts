import { BrandProfileService } from './brand-profile.service';

/**
 * Registering a brand grants it non-withdrawable welcome credit, when the
 * feature is switched on. The grant shares the registration transaction: a
 * brand cannot end up registered without its credit, nor credited for a
 * registration that rolled back.
 *
 * The heavy parts of registration (asset finalisation, the Meta conversion) are
 * stubbed — what is under test is the gate, the idempotency and the wiring.
 */
describe('BrandProfileService → brand signup welcome credit', () => {
  const BRAND_ID = 'brand-1';

  function makeService(env: Record<string, string | undefined>) {
    const tx = { marker: 'the-registration-transaction' };
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', email: 'a@b.test', name: 'A' }),
      },
      $transaction: jest.fn(
        async (fn: (t: unknown) => Promise<unknown>) => await fn(tx),
      ),
    };
    const wallet = {
      hasBrandSignupCredit: jest.fn().mockResolvedValue(false),
      creditBrandSignup: jest.fn().mockResolvedValue({
        balanceAfterPaise: 10000,
        promoAfterPaise: 10000,
      }),
    };

    const service = new BrandProfileService(
      prisma as never,
      {} as never, // storage
      {} as never, // brand access
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // events
      // The Meta conversion is fire-and-forget, so an unstubbed call surfaces
      // as an unhandled rejection rather than a test failure.
      { enabledFor: () => false, sendEvent: jest.fn() } as never, // meta capi
      wallet as never,
      { get: (key: string) => env[key] } as never, // config
    );

    // Registration itself is covered elsewhere; stub it to the created id.
    jest
      .spyOn(service, 'runCreateOwnedBrandProfileInTransaction')
      .mockResolvedValue(BRAND_ID);
    jest
      .spyOn(service, 'finalizeOwnedBrandProfileAssets')
      .mockResolvedValue({ brandName: 'Acme' } as never);

    return { service, wallet, prisma, tx };
  }

  const register = (service: BrandProfileService) =>
    service.createOwnedBrandProfileForUser('user-1', {
      contactFullName: 'A Person',
    } as never);

  const enabled = {
    BRAND_SIGNUP_CREDIT_ENABLED: 'true',
    BRAND_SIGNUP_CREDIT_PAISE: '10000',
  };

  it('credits the configured welcome amount on registration', async () => {
    const { service, wallet } = makeService(enabled);

    await register(service);

    expect(wallet.creditBrandSignup).toHaveBeenCalledWith(
      expect.objectContaining({ brandId: BRAND_ID, amountPaise: 10000 }),
      expect.anything(),
    );
  });

  it('grants it inside the registration transaction', async () => {
    const { service, wallet, prisma, tx } = makeService(enabled);

    await register(service);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(wallet.creditBrandSignup).toHaveBeenCalledWith(
      expect.anything(),
      tx,
    );
  });

  it('honours a changed amount without a code change', async () => {
    const { service, wallet } = makeService({
      ...enabled,
      BRAND_SIGNUP_CREDIT_PAISE: '25000',
    });

    await register(service);

    expect(wallet.creditBrandSignup).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 25000 }),
      expect.anything(),
    );
  });

  it('still registers the brand, with no credit, when the feature is off', async () => {
    const { service, wallet } = makeService({
      ...enabled,
      BRAND_SIGNUP_CREDIT_ENABLED: 'false',
    });

    await expect(register(service)).resolves.toBeDefined();
    expect(wallet.creditBrandSignup).not.toHaveBeenCalled();
  });

  it('is independent of the order-completion reward being off', async () => {
    // Separate config: the welcome credit runs even with the order reward off.
    const { service, wallet } = makeService({
      ...enabled,
      ORDER_COMPLETION_CREDIT_ENABLED: 'false',
    });

    await register(service);

    expect(wallet.creditBrandSignup).toHaveBeenCalled();
  });

  it('never credits the same brand twice', async () => {
    const { service, wallet } = makeService(enabled);
    wallet.hasBrandSignupCredit.mockResolvedValue(true);

    await register(service);

    expect(wallet.creditBrandSignup).not.toHaveBeenCalled();
  });

  it('rolls the registration back when the credit fails', async () => {
    const { service, wallet } = makeService(enabled);
    wallet.creditBrandSignup.mockRejectedValue(new Error('wallet down'));

    await expect(register(service)).rejects.toThrow('wallet down');
  });
});
