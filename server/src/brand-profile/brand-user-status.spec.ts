import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { BrandProfileService } from './brand-profile.service';

/**
 * Deactivation is a status flip, not a deletion: every access path already
 * requires ACTIVE (login, /me, the admin and workspace guards, password reset),
 * so setting DEACTIVATED locks the account out while leaving the brand, its
 * orders and its wishlists untouched for a later reactivation.
 */
describe('BrandProfileService.setBrandUserActive', () => {
  const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
  const USER_ID = '22222222-2222-4222-8222-222222222222';

  function build(
    user: {
      status?: UserStatus;
      deletedAt?: Date | null;
      hasBrandProfile?: boolean;
    } | null = {},
  ) {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
      user: {
        findUnique: jest.fn(() =>
          Promise.resolve(
            user === null
              ? null
              : {
                  id: USER_ID,
                  deletedAt: user.deletedAt ?? null,
                  status: user.status ?? UserStatus.ACTIVE,
                  brandProfile:
                    user.hasBrandProfile === false ? null : { id: 'brand-1' },
                },
          ),
        ),
        update: jest.fn((args: { data: Record<string, unknown> }) => {
          updates.push(args.data);
          return Promise.resolve({ id: USER_ID, status: args.data.status });
        }),
      },
    };
    const service = new BrandProfileService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, prisma, updates };
  }

  it('deactivates an active brand user', async () => {
    const { service, updates } = build({ status: UserStatus.ACTIVE });

    const result = await service.setBrandUserActive(ADMIN_ID, USER_ID, false);

    expect(updates).toEqual([{ status: UserStatus.DEACTIVATED }]);
    expect(result).toEqual({
      userId: USER_ID,
      status: UserStatus.DEACTIVATED,
    });
  });

  it('reactivates a deactivated brand user', async () => {
    const { service, updates } = build({ status: UserStatus.DEACTIVATED });

    const result = await service.setBrandUserActive(ADMIN_ID, USER_ID, true);

    expect(updates).toEqual([{ status: UserStatus.ACTIVE }]);
    expect(result.status).toBe(UserStatus.ACTIVE);
  });

  it('does not write when the user is already in the requested state', async () => {
    const { service, prisma } = build({ status: UserStatus.DEACTIVATED });

    const result = await service.setBrandUserActive(ADMIN_ID, USER_ID, false);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result.status).toBe(UserStatus.DEACTIVATED);
  });

  it('refuses to let an admin change their own status', async () => {
    // Without this an admin who also holds a brand profile could lock
    // themselves out of the dashboard they would need to undo it.
    const { service, prisma } = build();

    await expect(
      service.setBrandUserActive(ADMIN_ID, ADMIN_ID, false),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a user that does not exist', async () => {
    const { service } = build(null);

    await expect(
      service.setBrandUserActive(ADMIN_ID, USER_ID, false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a soft-deleted user', async () => {
    const { service } = build({ deletedAt: new Date() });

    await expect(
      service.setBrandUserActive(ADMIN_ID, USER_ID, false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a user with no brand access', async () => {
    const { service } = build({ hasBrandProfile: false });

    await expect(
      service.setBrandUserActive(ADMIN_ID, USER_ID, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
