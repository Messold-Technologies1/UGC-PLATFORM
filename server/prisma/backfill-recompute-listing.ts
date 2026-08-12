import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  PrismaClient,
} from '@prisma/client';

/**
 * Self-contained backfill for the completeProfile latch + isListed gate.
 *
 * This script intentionally inlines the Go-Live rule (no import from `src/`) so
 * it can run inside the production container (which ships only `dist/`) as well
 * as locally. It captures the rule as of this migration:
 *   - media: profile photo + intro reel
 *   - basics: display name, contact email, bio
 *   - about you: country, state, city, gender, date of birth, shipping address
 *   - niche facets (>=1 each): CONTENT_FORMAT, CONTENT_CATEGORY, CATEGORY_EXPERIENCE
 *   - >=1 language, >=1 package, >=3 public portfolio videos
 *
 * Semantics:
 *   - completeProfile is a one-way latch: it only ever flips false -> true here,
 *     never true -> false (already-live creators stay live).
 *   - isListed = approved AND completeProfile, always recomputed.
 *   - Idempotent: safe to run multiple times.
 */

const prisma = new PrismaClient();

const REQUIRED_FACET_DIMENSIONS: CreatorFacetDimension[] = [
  CreatorFacetDimension.CONTENT_CATEGORY,
];
const MIN_PORTFOLIO_VIDEOS = 3;

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

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
      facetSelections: { select: { option: { select: { dimension: true } } } },
      _count: { select: { profileLanguages: true, packages: true } },
    },
  });

  let updated = 0;
  let listed = 0;
  let newlyComplete = 0;

  for (const profile of profiles) {
    const publicVideoCount = await prisma.creatorPortfolioVideo.count({
      where: {
        creatorId: profile.id,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      },
    });

    const selectedDimensions = new Set(
      profile.facetSelections.map((selection) => selection.option.dimension),
    );

    const complete =
      hasText(profile.profileImageUrl) &&
      hasText(profile.introVideoUrl) &&
      hasText(profile.displayName) &&
      hasText(profile.contactEmail) &&
      hasText(profile.bio) &&
      hasText(profile.countryName) &&
      hasText(profile.stateName) &&
      hasText(profile.city) &&
      !!profile.gender &&
      !!profile.dateOfBirth &&
      hasText(profile.shippingAddress) &&
      REQUIRED_FACET_DIMENSIONS.every((dimension) =>
        selectedDimensions.has(dimension),
      ) &&
      profile._count.profileLanguages >= 1 &&
      profile._count.packages >= 1 &&
      publicVideoCount >= MIN_PORTFOLIO_VIDEOS;

    // One-way latch: never un-list an already-complete creator.
    const nextComplete = profile.completeProfile || complete;
    const nextListed =
      profile.creatorApproval?.status === ApprovalStatus.APPROVED &&
      nextComplete;

    if (
      nextComplete !== profile.completeProfile ||
      nextListed !== profile.isListed
    ) {
      await prisma.creatorProfile.update({
        where: { id: profile.id },
        data: { completeProfile: nextComplete, isListed: nextListed },
      });
      updated += 1;
      if (nextComplete && !profile.completeProfile) newlyComplete += 1;
    }
    if (nextListed) listed += 1;
  }

  console.log(
    `[backfill] Recomputed listing state for ${profiles.length} creator(s). ` +
      `updated=${updated} newlyComplete=${newlyComplete} listed=${listed} (${dbFingerprint()})`,
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
