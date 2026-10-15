import { BadRequestException } from '@nestjs/common';
import { AgencyService } from './agency.service';

/**
 * Submitting "Finish your agency profile" twice.
 *
 * It used to fail with "This phone number is already in use." The phone check
 * ran with no exclusion, so once an agency existed the owner collided with
 * their OWN record — a message about someone else's account, for what was
 * really a second submit of their own. A refresh or a back-button retry was
 * enough to hit it, and the number genuinely was theirs, so the advice the
 * message implies (use a different number) was wrong too.
 */
describe('AgencyService.createOwnedAgencyProfile — submitted twice', () => {
  const AGENCY_ID = 'agency-1';
  const OWNER_USER_ID = 'user-1';
  const PHONE = '+916290053076';

  function makeService(opts: { hasAgency: boolean }) {
    const agencyRow = {
      id: AGENCY_ID,
      ownerUserId: OWNER_USER_ID,
      name: 'Kaashi',
      logoKey: null,
      logoUrl: null,
      website: null,
      contactFullName: 'Bipasha Roy',
      contactEmail: 'owner@agency.test',
      contactPhone: PHONE,
      contactPhoneVerified: true,
      brandNames: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      owner: { phoneOtpLastStatus: 'approved' },
    };

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: OWNER_USER_ID,
          email: 'owner@agency.test',
          name: 'Bipasha Roy',
          phone: PHONE,
          phoneVerified: true,
          phoneOtpLastStatus: 'approved',
        }),
      },
      agency: {
        findUnique: jest.fn((args: { select?: Record<string, unknown> }) => {
          const keys = Object.keys(args?.select ?? {});
          if (keys.length === 1 && keys[0] === 'id') {
            return Promise.resolve(opts.hasAgency ? { id: AGENCY_ID } : null);
          }
          return Promise.resolve(agencyRow);
        }),
        update: jest.fn().mockResolvedValue(agencyRow),
        // Used by the phone-availability check.
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((fn: (t: unknown) => Promise<unknown>) =>
        fn({ agency: { update: jest.fn() } }),
      ),
    };

    const wallet = {
      hasSignupWelcomeCredit: jest.fn().mockResolvedValue(false),
      creditSignupWelcome: jest.fn().mockResolvedValue({}),
    };

    const service = new AgencyService(
      prisma as never,
      {} as never, // storage
      wallet as never,
      {
        get: (key: string) =>
          key === 'SIGNUP_WELCOME_CREDIT_ENABLED' ? 'true' : '10000',
      } as never,
    );

    // Held rather than read off the instance: referencing a class method
    // through the object in an assertion trips no-unbound-method.
    const createAgency = jest
      .spyOn(service, 'runCreateAgencyInTransaction')
      .mockResolvedValue({ id: AGENCY_ID, name: 'Kaashi' } as never);

    return { service, prisma, wallet, createAgency };
  }

  const submit = (service: AgencyService) =>
    service.createOwnedAgencyProfile(OWNER_USER_ID, {
      name: 'Kaashi',
      contactPhone: PHONE,
    } as never);

  it('does not reject the owner’s own verified number', async () => {
    const { service } = makeService({ hasAgency: true });

    // The reported bug, in one line.
    await expect(submit(service)).resolves.toMatchObject({ id: AGENCY_ID });
  });

  it('updates the existing agency instead of creating a second one', async () => {
    const { service, prisma, createAgency } = makeService({ hasAgency: true });

    await submit(service);

    expect(prisma.agency.update).toHaveBeenCalled();
    expect(createAgency).not.toHaveBeenCalled();
  });

  it('never checks the phone without excluding the agency being updated', async () => {
    // The root cause: an unscoped check always matches the owner's own row.
    const { service, prisma } = makeService({ hasAgency: true });
    const assertAvailable = jest.spyOn(service, 'assertContactPhoneAvailable');

    await submit(service);

    // Guard against a vacuous pass: the check must actually run.
    expect(assertAvailable).toHaveBeenCalled();
    for (const call of assertAvailable.mock.calls) {
      expect(call[1]).toBe(AGENCY_ID);
    }
    // And the raw query, however it was reached, is scoped.
    const findFirstCalls = prisma.agency.findFirst.mock
      .calls as unknown as Array<[{ where?: unknown }]>;
    for (const [args] of findFirstCalls) {
      expect(args).toMatchObject({ where: { NOT: { id: AGENCY_ID } } });
    }
  });

  it('does not grant the welcome credit a second time', async () => {
    const { service, wallet } = makeService({ hasAgency: true });

    await submit(service);

    expect(wallet.creditSignupWelcome).not.toHaveBeenCalled();
  });

  it('forwards only the fields this form collects', async () => {
    // contactFullName and contactEmail are set from the account at creation
    // and editable on the settings screen; re-deriving them here would quietly
    // revert an edit made there.
    const { service } = makeService({ hasAgency: true });
    const update = jest
      .spyOn(service, 'updateAgencyProfileForOwner')
      .mockResolvedValue({ id: AGENCY_ID } as never);

    await service.createOwnedAgencyProfile(OWNER_USER_ID, {
      name: 'Kaashi',
      contactPhone: PHONE,
      website: 'https://kaashi.example',
    } as never);

    const [, dto] = update.mock.calls[0];
    expect(dto).toEqual({
      name: 'Kaashi',
      contactPhone: PHONE,
      website: 'https://kaashi.example',
    });
    expect(dto).not.toHaveProperty('contactFullName');
    expect(dto).not.toHaveProperty('contactEmail');
  });

  it('leaves a detail already saved alone when the form omits it', async () => {
    // Undefined means "leave as is"; null or '' would CLEAR it, and finishing
    // onboarding must never wipe something already stored.
    const { service } = makeService({ hasAgency: true });
    const update = jest
      .spyOn(service, 'updateAgencyProfileForOwner')
      .mockResolvedValue({ id: AGENCY_ID } as never);

    await service.createOwnedAgencyProfile(OWNER_USER_ID, {
      name: 'Kaashi',
    } as never);

    const [, dto] = update.mock.calls[0];
    expect(dto).not.toHaveProperty('website');
    expect(dto).not.toHaveProperty('logoKey');
  });

  it('still creates the agency on a genuine first submit', async () => {
    const { service, prisma, createAgency } = makeService({ hasAgency: false });

    await submit(service);

    expect(createAgency).toHaveBeenCalled();
    expect(prisma.agency.update).not.toHaveBeenCalled();
  });

  it('still refuses a number another agency has verified', async () => {
    // The check keeps its meaning for the case it was written for.
    const { service, prisma, createAgency } = makeService({ hasAgency: false });
    prisma.agency.findFirst.mockResolvedValueOnce({
      id: 'someone-elses-agency',
    });

    await expect(submit(service)).rejects.toBeInstanceOf(BadRequestException);
    expect(createAgency).not.toHaveBeenCalled();
  });
});
