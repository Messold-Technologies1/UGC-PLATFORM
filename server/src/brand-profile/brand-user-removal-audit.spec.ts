import { ConflictException, NotFoundException } from '@nestjs/common';
import { BrandProfileService } from './brand-profile.service';

/**
 * The removal hard-deletes the User row and cascades its brand data away, so the
 * audit record has to be written from inside the same transaction, before the
 * delete — afterwards there is nothing left to read the email or brand name
 * from, and a record written outside the transaction could survive a rollback.
 */
describe('BrandProfileService.removeBrandAccessFromUser — audit trail', () => {
  const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
  const USER_ID = '22222222-2222-4222-8222-222222222222';
  const BRAND_ID = '33333333-3333-4333-8333-333333333333';

  function buildTx(
    overrides: { ongoingOrders?: number; userMissing?: boolean } = {},
  ) {
    const calls: string[] = [];
    const removals: Array<Record<string, unknown>> = [];

    const tx = {
      user: {
        findUnique: jest.fn(({ select }: { select?: unknown }) => {
          // The admin lookup asks only for the email; the subject lookup uses
          // `include` and so arrives without a `select`.
          if (select) return Promise.resolve({ email: 'admin@gocollab.io' });
          if (overrides.userMissing) return Promise.resolve(null);
          return Promise.resolve({
            id: USER_ID,
            email: 'brand@example.com',
            name: 'Brand Owner',
            deletedAt: null,
            ownedAgency: null,
            brandProfile: {
              id: BRAND_ID,
              logoKey: 'logos/brand.png',
              brandPronunciationAudioKey: null,
            },
          });
        }),
        delete: jest.fn(() => {
          calls.push('user.delete');
          return Promise.resolve({});
        }),
      },
      brandProfile: {
        findUnique: jest.fn().mockResolvedValue({ brandName: 'Acme Skincare' }),
      },
      order: {
        count: jest.fn().mockResolvedValue(overrides.ongoingOrders ?? 0),
      },
      brandUserRemoval: {
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          calls.push('brandUserRemoval.create');
          removals.push(args.data);
          return Promise.resolve({});
        }),
      },
    };

    return { tx, calls, removals };
  }

  function buildService(tx: ReturnType<typeof buildTx>['tx']) {
    const prisma = {
      $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const storage = {
      deleteObjectIfExists: jest.fn().mockResolvedValue(undefined),
    };
    return new BrandProfileService(
      prisma as never,
      storage as never,
      {} as never,
      {} as never,
    );
  }

  it('records who removed the user, and what was removed, before deleting', async () => {
    const { tx, calls, removals } = buildTx();
    const service = buildService(tx);

    await service.removeBrandAccessFromUser(ADMIN_ID, USER_ID, {
      reason: '  duplicate account  ',
    });

    expect(removals).toHaveLength(1);
    expect(removals[0]).toEqual({
      removedUserId: USER_ID,
      removedUserEmail: 'brand@example.com',
      removedUserName: 'Brand Owner',
      brandProfileId: BRAND_ID,
      brandName: 'Acme Skincare',
      removedById: ADMIN_ID,
      removedByEmail: 'admin@gocollab.io',
      reason: 'duplicate account',
    });

    // Order matters: after the delete the snapshotted rows no longer exist.
    expect(calls).toEqual(['brandUserRemoval.create', 'user.delete']);
  });

  it('stores no reason when the admin did not give one', async () => {
    const { tx, removals } = buildTx();
    const service = buildService(tx);

    await service.removeBrandAccessFromUser(ADMIN_ID, USER_ID);

    expect(removals[0].reason).toBeNull();
  });

  it('treats a blank reason as no reason', async () => {
    const { tx, removals } = buildTx();
    const service = buildService(tx);

    await service.removeBrandAccessFromUser(ADMIN_ID, USER_ID, {
      reason: '   ',
    });

    expect(removals[0].reason).toBeNull();
  });

  it('writes nothing when the removal is refused for ongoing orders', async () => {
    const { tx, calls } = buildTx({ ongoingOrders: 2 });
    const service = buildService(tx);

    await expect(
      service.removeBrandAccessFromUser(ADMIN_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);

    // A refused removal must not leave an audit row claiming it happened.
    expect(calls).toEqual([]);
  });

  it('writes nothing when the user does not exist', async () => {
    const { tx, calls } = buildTx({ userMissing: true });
    const service = buildService(tx);

    await expect(
      service.removeBrandAccessFromUser(ADMIN_ID, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(calls).toEqual([]);
  });
});
