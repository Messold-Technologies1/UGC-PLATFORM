/** Shared BrandAccessService mock for unit tests after agency XOR ownership. */
export function createBrandAccessMock(options?: {
  brandId?: string | null;
  agencyId?: string | null;
  actorUserId?: string;
  brandActorUserId?: string;
}) {
  const brandId = options?.brandId === undefined ? 'brand-1' : options.brandId;
  const agencyId = options?.agencyId ?? null;
  const actorUserId = options?.actorUserId ?? 'user-1';
  const brandActorUserId = options?.brandActorUserId ?? actorUserId;
  const isAgencyWorkspace = Boolean(agencyId) && !brandId;

  const actor = {
    brand: brandId ? { id: brandId } : null,
    agency: agencyId
      ? {
          id: agencyId,
          ownerUserId: brandActorUserId,
          name: 'Agency',
          logoUrl: null,
          contactFullName: 'Agency Contact',
          contactEmail: 'agency@example.com',
          contactPhone: null,
        }
      : null,
    brandId,
    agencyId,
    actorUserId,
    brandActorUserId,
    isAgencyWorkspace,
  };

  const resolveOrderActor = jest.fn(() => Promise.resolve(actor));
  const resolveBrandContext = jest.fn(() =>
    Promise.resolve({
      brand: actor.brand,
      agency: actor.agency
        ? { id: actor.agency.id, ownerUserId: actor.agency.ownerUserId }
        : null,
      brandProfileId: actor.brandId,
      agencyId: actor.agencyId,
      actorUserId: actor.actorUserId,
      brandActorUserId: actor.brandActorUserId,
      isAgencyWorkspace: actor.isAgencyWorkspace,
    }),
  );

  return {
    resolveOrderActor,
    resolveBrandContext,
    orderOwnerCreateData: jest.fn((a: typeof actor) => {
      if (a.agencyId) return { brandId: null, agencyId: a.agencyId };
      if (a.brandId) return { brandId: a.brandId, agencyId: null };
      throw new Error('Order owner is required');
    }),
    orderOwnerWhere: jest.fn((a: typeof actor) => {
      if (a.agencyId) return { agencyId: a.agencyId };
      if (a.brandId) return { brandId: a.brandId };
      throw new Error('Order owner is required');
    }),
    assertOwnsOrder: jest.fn(
      (
        order: { brandId: string | null; agencyId: string | null },
        a: { brandId?: string | null; agencyId?: string | null },
      ) => {
        if (a.brandId && order.brandId === a.brandId) return;
        if (a.agencyId && order.agencyId === a.agencyId) return;
        throw new Error('Not your order');
      },
    ),
    requireBrandProfile: jest.fn((ctx: { brand?: { id: string } | null }) => {
      if (!ctx?.brand) {
        throw new Error('This action requires a standalone brand profile.');
      }
      return ctx.brand;
    }),
    resolveBuyerActorUserId: jest.fn(
      ({
        brandId: bid,
        agencyId: aid,
      }: {
        brandId?: string | null;
        agencyId?: string | null;
      }) => Promise.resolve(aid ? brandActorUserId : bid ? brandActorUserId : actorUserId),
    ),
    resolveBrandActorUserIdForProfile: jest.fn(() =>
      Promise.resolve(brandActorUserId),
    ),
  };
}
