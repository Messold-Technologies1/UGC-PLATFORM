import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVideoAssetState,
  PortfolioVisibilityStatus,
  PrismaClient,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';

/**
 * One-time companion to the "intro video optional" change, for creators still
 * in the Building profile stage (completeProfile = false, approval PENDING).
 *
 * `completeProfile` is a one-way latch re-evaluated only on a creator's next
 * profile write, so a Building-profile creator whose *only* remaining gap was
 * the intro video would stay in Building profile until they saved again. This
 * script latches those creators complete and moves them to Self complete —
 * exactly the PENDING -> SELF_COMPLETED transition the runtime makes on Go Live
 * (`recomputeCreatorListingState` -> `nextApprovalStatusOnCompletion`).
 *
 * That runtime transition only happens in profile_first onboarding mode
 * (approval_first keeps a single PENDING review queue and has no Self complete
 * stage), so this script no-ops unless CREATOR_ONBOARDING_MODE=profile_first —
 * the same env the runtime reads.
 *
 * The Go-Live rule is intentionally INLINED here (no import from `src/`) so the
 * script can run inside the production container, which ships only `dist/`. It
 * mirrors `evaluateProfileCompleteness` as of this change:
 *   - media: profile photo (intro video NO LONGER required)
 *   - basics: display name, contact email, bio
 *   - about you: country, state, city, gender, date of birth, shipping address
 *   - niche: 1 primary + 2 secondary CONTENT_CATEGORY picks
 *   - identity facets (>=1 each): CREATOR_TYPE, OCCUPATION, APPEARANCE
 *   - >=1 language, >=1 package, all mandatory add-ons priced
 *   - >=3 public, playable portfolio videos
 *   - an active Instagram connection
 *
 * `isListed` still requires APPROVED, so Self complete never publishes a profile
 * to brand discovery. Idempotent: a second run is a no-op.
 */

const prisma = new PrismaClient();

const MIN_PORTFOLIO_VIDEOS = 3;
const REQUIRED_SECONDARY_NICHES = 2;
const REQUIRED_FACET_DIMENSIONS: CreatorFacetDimension[] = [
  CreatorFacetDimension.CREATOR_TYPE,
  CreatorFacetDimension.OCCUPATION,
  CreatorFacetDimension.APPEARANCE,
];
const PLAYABLE_ASSET_STATES: PortfolioVideoAssetState[] = [
  PortfolioVideoAssetState.READY,
  PortfolioVideoAssetState.LINK_ONLY,
];

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isProfileFirst(): boolean {
  return process.env.CREATOR_ONBOARDING_MODE === 'profile_first';
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
  if (!isProfileFirst()) {
    console.log(
      '[backfill] CREATOR_ONBOARDING_MODE is not profile_first — there is no ' +
        'Self complete stage in approval_first, so nothing to do. ' +
        `(${dbFingerprint()})`,
    );
    return;
  }

  // Building profile = incomplete (completeProfile false). The PENDING ->
  // SELF_COMPLETED transition only applies to creators currently in PENDING.
  const profiles = await prisma.creatorProfile.findMany({
    where: {
      completeProfile: false,
      creatorApproval: { status: ApprovalStatus.PENDING },
    },
    select: {
      id: true,
      profileImageUrl: true,
      displayName: true,
      contactEmail: true,
      bio: true,
      countryName: true,
      stateName: true,
      city: true,
      gender: true,
      dateOfBirth: true,
      shippingAddress: true,
      isListed: true,
      facetSelections: {
        select: { rank: true, option: { select: { dimension: true } } },
      },
      addOns: { select: { name: true } },
      _count: { select: { profileLanguages: true, packages: true } },
    },
  });

  const mandatoryOptions = await prisma.creatorAddOnOption.findMany({
    where: { mandatory: true },
    select: { name: true },
  });
  const mandatoryAddOnNames = mandatoryOptions.map((o) => o.name);

  let movedToSelfComplete = 0;
  let stillBuilding = 0;

  for (const profile of profiles) {
    const publicVideoCount = await prisma.creatorPortfolioVideo.count({
      where: {
        creatorId: profile.id,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        assetState: { in: PLAYABLE_ASSET_STATES },
      },
    });

    const instagramConnectionCount = await prisma.socialConnection.count({
      where: {
        creatorProfileId: profile.id,
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.ACTIVE,
      },
    });

    const selectedDimensions = new Set(
      profile.facetSelections.map((selection) => selection.option.dimension),
    );
    const nichePrimaryCount = profile.facetSelections.filter(
      (s) =>
        s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
        s.rank === 0,
    ).length;
    const nicheSecondaryCount = profile.facetSelections.filter(
      (s) =>
        s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
        s.rank > 0,
    ).length;

    const complete =
      hasText(profile.profileImageUrl) &&
      hasText(profile.displayName) &&
      hasText(profile.contactEmail) &&
      hasText(profile.bio) &&
      hasText(profile.countryName) &&
      hasText(profile.stateName) &&
      hasText(profile.city) &&
      !!profile.gender &&
      !!profile.dateOfBirth &&
      hasText(profile.shippingAddress) &&
      nichePrimaryCount >= 1 &&
      nicheSecondaryCount >= REQUIRED_SECONDARY_NICHES &&
      REQUIRED_FACET_DIMENSIONS.every((dimension) =>
        selectedDimensions.has(dimension),
      ) &&
      profile._count.profileLanguages >= 1 &&
      profile._count.packages >= 1 &&
      mandatoryAddOnNames.every((name) =>
        profile.addOns.some((addOn) => addOn.name === name),
      ) &&
      publicVideoCount >= MIN_PORTFOLIO_VIDEOS &&
      instagramConnectionCount > 0;

    if (!complete) {
      stillBuilding += 1;
      continue;
    }

    // Latch completeProfile before flipping approval, mirroring the runtime.
    // isListed stays false: SELF_COMPLETED is not APPROVED. approvedAt is set
    // to match nextApprovalStatusOnCompletion's SELF_COMPLETED branch.
    await prisma.$transaction(async (tx) => {
      await tx.creatorProfile.update({
        where: { id: profile.id },
        data: { completeProfile: true, isListed: false },
      });
      await tx.creatorApproval.updateMany({
        where: { creatorId: profile.id, status: ApprovalStatus.PENDING },
        data: {
          status: ApprovalStatus.SELF_COMPLETED,
          rejectionReason: null,
          approvedAt: new Date(),
        },
      });
    });

    movedToSelfComplete += 1;
  }

  console.log(
    `[backfill] Processed ${profiles.length} building-profile creator(s). ` +
      `movedToSelfComplete=${movedToSelfComplete} ` +
      `stillBuilding=${stillBuilding} (${dbFingerprint()})`,
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
