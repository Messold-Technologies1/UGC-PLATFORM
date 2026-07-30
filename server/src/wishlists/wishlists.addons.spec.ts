import { WishlistsService } from './wishlists.service';

/**
 * Phase 2: brands can pre-select a creator's add-ons when saving them to a
 * wishlist. These tests cover the persistence rules — only add-ons that belong
 * to the creator are stored, and re-adding without add-ons doesn't clobber an
 * earlier selection.
 */
describe('WishlistsService add-on persistence', () => {
  function makeService(validAddOnIds: string[]) {
    const upsert = jest.fn((_args: unknown) => Promise.resolve({}));
    const prisma = {
      brandWishlist: {
        findUnique: jest.fn(() => Promise.resolve({ brandId: 'brand-1' })),
      },
      creatorAddOn: {
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(
            validAddOnIds
              .filter((id) => where.id.in.includes(id))
              .map((id) => ({ id })),
          ),
        ),
      },
      brandWishlistCreator: { upsert },
    };
    const brandAccess = {
      resolveBrandContext: jest.fn(() =>
        Promise.resolve({ brand: { id: 'brand-1' } }),
      ),
    };
    const service = new WishlistsService(prisma as any, brandAccess as any);
    return { service, upsert };
  }

  it('stores only add-ons that belong to the creator (drops foreign ids)', async () => {
    const { service, upsert } = makeService(['a1', 'a2']);

    await service.addCreator({
      actorUserId: 'u1',
      wishlistId: 'w1',
      creatorId: 'c1',
      addOnIds: ['a1', 'a2', 'foreign', 'a1'],
    });

    const args = upsert.mock.calls[0][0] as any;
    expect(args.create.selectedAddOnIds).toEqual(['a1', 'a2']);
    expect(args.update).toEqual({ selectedAddOnIds: ['a1', 'a2'] });
  });

  it('does not overwrite the saved selection when no add-ons are supplied', async () => {
    const { service, upsert } = makeService(['a1']);

    await service.addCreator({
      actorUserId: 'u1',
      wishlistId: 'w1',
      creatorId: 'c1',
    });

    const args = upsert.mock.calls[0][0] as any;
    expect(args.create.selectedAddOnIds).toEqual([]);
    // No add-ons supplied → update is a no-op so an earlier choice survives.
    expect(args.update).toEqual({});
  });
});
