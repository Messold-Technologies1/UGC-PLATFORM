import {
  CreatorFacetDimension,
  CreatorGender,
  PortfolioVisibilityStatus,
} from '@prisma/client';

import {
  PAYOUT_DETAILS_REQUIREMENT,
  REQUIRED_FACET_DIMENSIONS,
  REQUIRED_SECONDARY_NICHES,
  MIN_PORTFOLIO_VIDEOS,
} from './creator-profile-completeness.util';
import { loadCreatorCompleteness } from './listed-completeness.query';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * `loadCreatorCompleteness` is what the creator-facing payout gate reads after
 * a brand approves the work. The admin "Listed · incomplete" segment stopped
 * counting payout details; this path must NOT, because the money cannot be
 * sent without an account to send it to.
 */

/** A profile row shaped like `listedCompletenessSelect()`, complete by default. */
function profileRow(
  overrides: { payoutDetails?: unknown } = {},
): Record<string, unknown> {
  return {
    id: 'profile-1',
    profileImageUrl: 'https://cdn/img.jpg',
    displayName: 'Jane Doe',
    contactEmail: 'jane@example.com',
    bio: 'I make great content.',
    countryName: 'India',
    stateName: 'Karnataka',
    city: 'Bengaluru',
    gender: CreatorGender.FEMALE,
    dateOfBirth: new Date('1995-04-15'),
    shippingAddress: '221B Baker Street',
    isListed: true,
    user: { phoneOtpLastStatus: 'approved' },
    payoutDetails: { accountNumber: '123456789', ifsc: 'HDFC0001', upiId: null },
    facetSelections: [
      ...REQUIRED_FACET_DIMENSIONS.map((dimension) => ({
        rank: 0,
        option: { dimension },
      })),
      // One primary niche plus the required secondaries.
      { rank: 0, option: { dimension: CreatorFacetDimension.CONTENT_CATEGORY } },
      ...Array.from({ length: REQUIRED_SECONDARY_NICHES }, (_, i) => ({
        rank: i + 1,
        option: { dimension: CreatorFacetDimension.CONTENT_CATEGORY },
      })),
    ],
    addOns: [],
    _count: { profileLanguages: 1, packages: 1, restrictions: 1 },
    portfolioVideos: Array.from({ length: MIN_PORTFOLIO_VIDEOS }, (_, i) => ({
      id: `video-${i}`,
    })),
    socialConnections: [{ id: 'ig-1' }],
    ...overrides,
  };
}

function prismaStub(row: Record<string, unknown> | null): PrismaService {
  return {
    creatorProfile: { findUnique: jest.fn().mockResolvedValue(row) },
    creatorAddOnOption: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
}

describe('loadCreatorCompleteness', () => {
  it('is complete when everything including payout details is on file', async () => {
    const result = await loadCreatorCompleteness(
      prismaStub(profileRow()),
      { userId: 'user-1' },
    );
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('still reports missing payout details — this gate releases money', async () => {
    const result = await loadCreatorCompleteness(
      prismaStub(profileRow({ payoutDetails: null })),
      { userId: 'user-1' },
    );
    expect(result.complete).toBe(false);
    expect(result.missing.map((r) => r.label)).toEqual([
      PAYOUT_DETAILS_REQUIREMENT.label,
    ]);
  });

  it('counts a UPI ID alone as payable', async () => {
    const result = await loadCreatorCompleteness(
      prismaStub(
        profileRow({
          payoutDetails: { accountNumber: null, ifsc: null, upiId: 'jane@upi' },
        }),
      ),
      { userId: 'user-1' },
    );
    expect(result.complete).toBe(true);
  });

  it('does not count a bank account without an IFSC', async () => {
    const result = await loadCreatorCompleteness(
      prismaStub(
        profileRow({
          payoutDetails: { accountNumber: '123456789', ifsc: null, upiId: null },
        }),
      ),
      { userId: 'user-1' },
    );
    expect(result.missing.map((r) => r.label)).toContain(
      PAYOUT_DETAILS_REQUIREMENT.label,
    );
  });

  it('throws when the profile does not exist', async () => {
    await expect(
      loadCreatorCompleteness(prismaStub(null), { userId: 'nobody' }),
    ).rejects.toThrow('Creator profile not found');
  });

  it('reads only public, playable portfolio videos', async () => {
    const prisma = prismaStub(profileRow());
    await loadCreatorCompleteness(prisma, { userId: 'user-1' });
    const select = (
      prisma.creatorProfile.findUnique as jest.Mock
    ).mock.calls[0][0].select;
    expect(select.portfolioVideos.where.visibilityStatus).toBe(
      PortfolioVisibilityStatus.PUBLIC,
    );
  });
});
