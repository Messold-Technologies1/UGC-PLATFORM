import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  PrismaClient,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { evaluateProfileCompleteness } from '../src/creator-profile/creator-profile-completeness.util';

const prisma = new PrismaClient();

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    return `host=${u.host} db=${u.pathname.replace(/^\//, '') || '<no-db>'}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

/**
 * One-time backfill for the completeProfile latch + isListed gate.
 *
 * For each creator we evaluate the Go-Live checklist against current data and
 * set completeProfile accordingly, then isListed = approved AND completeProfile.
 * Already-approved creators who don't meet the bar will (intentionally) drop out
 * of brand discovery until they complete their profile.
 */
async function main(): Promise<void> {
  const profiles = await prisma.creatorProfile.findMany({
    select: {
      id: true,
      profileImageUrl: true,
      introVideoUrl: true,
      displayName: true,
      contactEmail: true,
      bio: true,
      countryName: true,
      stateName: true,
      city: true,
      gender: true,
      dateOfBirth: true,
      shippingAddress: true,
      completeProfile: true,
      isListed: true,
      creatorApproval: { select: { status: true } },
      facetSelections: {
        select: { rank: true, option: { select: { dimension: true } } },
      },
      addOns: { select: { name: true } },
      _count: {
        select: {
          profileLanguages: true,
          packages: true,
          restrictions: true,
        },
      },
    },
  });

  const mandatoryOptions = await prisma.creatorAddOnOption.findMany({
    where: { mandatory: true },
    select: { name: true },
  });
  const mandatoryAddOnNames = mandatoryOptions.map((o) => o.name);

  let updated = 0;
  let listed = 0;

  for (const profile of profiles) {
    const publicVideoCount = await prisma.creatorPortfolioVideo.count({
      where: {
        creatorId: profile.id,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      },
    });

    const instagramConnectionCount = await prisma.socialConnection.count({
      where: {
        creatorProfileId: profile.id,
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.ACTIVE,
      },
    });

    const { complete } = evaluateProfileCompleteness({
      profileImageUrl: profile.profileImageUrl,
      introVideoUrl: profile.introVideoUrl,
      displayName: profile.displayName,
      contactEmail: profile.contactEmail,
      bio: profile.bio,
      countryName: profile.countryName,
      stateName: profile.stateName,
      city: profile.city,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      shippingAddress: profile.shippingAddress,
      selectedFacetDimensions: profile.facetSelections.map(
        (selection) => selection.option.dimension,
      ),
      nichePrimaryCount: profile.facetSelections.filter(
        (s) =>
          s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
          s.rank === 0,
      ).length,
      nicheSecondaryCount: profile.facetSelections.filter(
        (s) =>
          s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
          s.rank > 0,
      ).length,
      restrictionCount: profile._count.restrictions,
      languageCount: profile._count.profileLanguages,
      packageCount: profile._count.packages,
      publicVideoCount,
      mandatoryAddOnsPriced: mandatoryAddOnNames.every((name) =>
        profile.addOns.some((addOn) => addOn.name === name),
      ),
      instagramConnected: instagramConnectionCount > 0,
    });

    const isListed =
      profile.creatorApproval?.status === ApprovalStatus.APPROVED && complete;

    if (complete !== profile.completeProfile || isListed !== profile.isListed) {
      await prisma.creatorProfile.update({
        where: { id: profile.id },
        data: { completeProfile: complete, isListed },
      });
      updated += 1;
    }
    if (isListed) listed += 1;
  }

  console.log(
    `[backfill] Recomputed listing state for ${profiles.length} creator(s). updated=${updated} listed=${listed} (${dbFingerprint()})`,
  );
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
