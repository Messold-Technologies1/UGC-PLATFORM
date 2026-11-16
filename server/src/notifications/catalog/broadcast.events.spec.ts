import { BROADCAST_EVENTS } from './broadcast.events';
import { AGENCY, BRAND } from '../broadcast/broadcast-audiences';
import type { EventContext, EventDefinition } from './define-events';

const PAYER_EVENT = 'broadcast-orders-awaiting-payment';

// `defineEvents` keeps each entry's literal type, so an optional field is
// absent from the members that omit it. Widened to the shared shape to read
// `defaultActive` across all of them.
const BROADCASTS: Record<string, EventDefinition> = BROADCAST_EVENTS;

function build() {
  const brandFindUnique = jest.fn().mockResolvedValue({
    id: 'b1',
    brandName: 'Acme',
    contactFullName: 'Bea',
    contactEmail: 'bea@acme.test',
    contactPhone: '+911',
    user: { id: 'u-brand', email: 'u@acme.test', name: 'Bea', phone: '+912' },
  });
  const agencyFindUnique = jest.fn().mockResolvedValue({
    id: 'a1',
    name: 'Agency Co',
    ownerUserId: 'u-agency',
    contactFullName: 'Ann',
    contactEmail: 'ann@agency.test',
    contactPhone: '+913',
  });
  const userFindUnique = jest.fn().mockResolvedValue({
    email: 'o@agency.test',
    name: 'Ann',
    phone: null,
  });

  const ctx = {
    frontendBaseUrl: 'https://app.test',
    prisma: {
      brandProfile: { findUnique: brandFindUnique },
      agency: { findUnique: agencyFindUnique },
      user: { findUnique: userFindUnique },
    },
  } as unknown as EventContext;

  return { ctx, brandFindUnique, agencyFindUnique };
}

describe(`${PAYER_EVENT} resolve`, () => {
  const def = BROADCASTS[PAYER_EVENT];

  it('resolves a brand-prefixed id through the brand table', async () => {
    const { ctx, brandFindUnique } = build();
    const out = await def.resolve(ctx, `${BRAND}:b1`);

    expect(out).toMatchObject({ profileType: 'brand', profileId: 'b1' });
    // The prefix constant is 'brand'; the recipient-role enum in the same file
    // is 'BRAND'. Comparing against the wrong one sent every brand down the
    // null path and nobody would have been chased for payment.
    expect(brandFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b1' } }),
    );
  });

  it('resolves an agency-prefixed id through the agency table', async () => {
    const { ctx, agencyFindUnique } = build();
    const out = await def.resolve(ctx, `${AGENCY}:a1`);

    expect(out).toMatchObject({ profileType: 'agency', profileId: 'a1' });
    expect(agencyFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } }),
    );
  });

  it('refuses an unprefixed id rather than guessing a table', async () => {
    const { ctx, brandFindUnique, agencyFindUnique } = build();

    // A bare uuid is a job from a version of the audience that no longer
    // exists. Null makes the log say entity_gone instead of addressing
    // whichever table happens to answer first.
    expect(await def.resolve(ctx, 'b1')).toBeNull();
    expect(brandFindUnique).not.toHaveBeenCalled();
    expect(agencyFindUnique).not.toHaveBeenCalled();
  });

  it('refuses an unknown prefix', async () => {
    expect(await def.resolve(build().ctx, 'creator:c1')).toBeNull();
  });

  it('is switched off until an admin turns it on', () => {
    // Chasing people for money should not become possible by deploying.
    expect(def.defaultActive).toBe(false);
  });

  it('is the only broadcast event that ships switched off', () => {
    const off = Object.entries(BROADCASTS)
      .filter(([, d]) => d.defaultActive === false)
      .map(([key]) => key);

    expect(off).toEqual([PAYER_EVENT]);
  });
});
