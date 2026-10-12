import { AgencyService } from './agency.service';

/**
 * Registering an agency grants the same non-withdrawable welcome credit a brand
 * gets, from the same two settings — so switching the reward off switches it off
 * for both buyer types. The grant shares the registration transaction.
 */
describe('AgencyService → signup welcome credit', () => {
  const AGENCY_ID = 'agency-1';

  function makeService(env: Record<string, string | undefined>) {
    const tx = {
      agency: { update: jest.fn().mockResolvedValue({ id: AGENCY_ID }) },
      marker: 'the-registration-transaction',
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@agency.test',
          name: 'Owner',
          phone: null,
          phoneVerified: false,
        }),
      },
      $transaction: jest.fn(
        async (fn: (t: unknown) => Promise<unknown>) => await fn(tx),
      ),
    };
    const wallet = {
      hasSignupWelcomeCredit: jest.fn().mockResolvedValue(false),
      creditSignupWelcome: jest.fn().mockResolvedValue({
        balanceAfterPaise: 10000,
        promoAfterPaise: 10000,
      }),
    };

    const service = new AgencyService(
      prisma as never,
      {} as never, // storage
      wallet as never,
      { get: (key: string) => env[key] } as never, // config
    );

    jest
      .spyOn(service, 'runCreateAgencyInTransaction')
      .mockResolvedValue({ id: AGENCY_ID, name: 'Northstar' } as never);

    return { service, wallet, prisma, tx };
  }

  const register = (service: AgencyService) =>
    service.createOwnedAgencyProfile('user-1', { name: 'Northstar' } as never);

  const enabled = {
    SIGNUP_WELCOME_CREDIT_ENABLED: 'true',
    SIGNUP_WELCOME_CREDIT_PAISE: '10000',
  };

  it('credits the welcome amount to the agency, not a brand', async () => {
    const { service, wallet } = makeService(enabled);

    await register(service);

    // The agency's own wallet, never a brand's.
    expect(wallet.creditSignupWelcome).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: AGENCY_ID, amountPaise: 10000 }),
      expect.anything(),
    );
    const [grant] = wallet.creditSignupWelcome.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(grant.brandId).toBeUndefined();
  });

  it('grants it inside the registration transaction', async () => {
    const { service, wallet, prisma, tx } = makeService(enabled);

    await register(service);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(wallet.creditSignupWelcome).toHaveBeenCalledWith(
      expect.anything(),
      tx,
    );
  });

  it('is switched off by the very same setting that governs brands', async () => {
    // No agency-specific variable exists: one switch covers both.
    const { service, wallet } = makeService({
      ...enabled,
      SIGNUP_WELCOME_CREDIT_ENABLED: 'false',
    });

    await expect(register(service)).resolves.toBeDefined();
    expect(wallet.creditSignupWelcome).not.toHaveBeenCalled();
  });

  it('follows the shared amount', async () => {
    const { service, wallet } = makeService({
      ...enabled,
      SIGNUP_WELCOME_CREDIT_PAISE: '25000',
    });

    await register(service);

    expect(wallet.creditSignupWelcome).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 25000 }),
      expect.anything(),
    );
  });

  it('never credits the same agency twice', async () => {
    const { service, wallet } = makeService(enabled);
    wallet.hasSignupWelcomeCredit.mockResolvedValue(true);

    await register(service);

    expect(wallet.creditSignupWelcome).not.toHaveBeenCalled();
  });

  it('rolls the registration back when the credit fails', async () => {
    const { service, wallet } = makeService(enabled);
    wallet.creditSignupWelcome.mockRejectedValue(new Error('wallet down'));

    await expect(register(service)).rejects.toThrow('wallet down');
  });
});
