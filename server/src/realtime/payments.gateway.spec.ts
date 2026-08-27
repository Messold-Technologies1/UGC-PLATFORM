import { RoleName } from '@prisma/client';
import { PaymentsGateway, portfolioRoom } from './payments.gateway';

describe('PaymentsGateway portfolio room', () => {
  const creatorProfileId = 'profile-1';

  let prisma: { user: { findUnique: jest.Mock } };
  let gateway: PaymentsGateway;
  let client: { data: { userId?: string }; join: jest.Mock; leave: jest.Mock };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    gateway = new PaymentsGateway({} as never, prisma as never);
    client = { data: { userId: 'user-1' }, join: jest.fn(), leave: jest.fn() };
  });

  function asAdmin() {
    prisma.user.findUnique.mockResolvedValue({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
  }

  function asCreator() {
    prisma.user.findUnique.mockResolvedValue({
      primaryRole: { name: RoleName.CREATOR },
      userRoles: [],
    });
  }

  it('lets an admin join a creator portfolio room', async () => {
    asAdmin();

    await expect(
      gateway.handlePortfolioSubscribe(client as never, { creatorProfileId }),
    ).resolves.toEqual({ ok: true });
    expect(client.join).toHaveBeenCalledWith(portfolioRoom(creatorProfileId));
  });

  it('refuses a non-admin, so one creator cannot watch another', async () => {
    asCreator();

    await expect(
      gateway.handlePortfolioSubscribe(client as never, { creatorProfileId }),
    ).resolves.toEqual({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated socket', async () => {
    client.data = {};

    await expect(
      gateway.handlePortfolioSubscribe(client as never, { creatorProfileId }),
    ).resolves.toEqual({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
    // Never even looked the user up — there was no id to look up.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a subscribe with no creator id', async () => {
    asAdmin();

    await expect(
      gateway.handlePortfolioSubscribe(client as never, {}),
    ).resolves.toEqual({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('leaves the room on unsubscribe without an admin check', async () => {
    // Leaving a room you are not in is harmless, and gating it would strand a
    // socket in a room after its role changed.
    await expect(
      gateway.handlePortfolioUnsubscribe(client as never, { creatorProfileId }),
    ).resolves.toEqual({ ok: true });
    expect(client.leave).toHaveBeenCalledWith(portfolioRoom(creatorProfileId));
  });
});
