import {
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  Prisma,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';
import {
  evaluateListedProfileCompleteness,
  requirementForLabel,
  type GoLiveRequirement,
  type ListedProfileCompletenessInput,
} from './creator-profile-completeness.util';

/**
 * Reading the listed-profile checklist out of the database, in one place.
 *
 * Three callers need the same answer — the admin "Listed · incomplete" sweep,
 * the creator's own completeness endpoint, and the brief-acceptance gate — and
 * a second copy of this query is exactly how the three would drift apart.
 */

/**
 * The columns the checklist reads, and nothing more, so the sweep across every
 * listed creator stays cheap.
 */
export function listedCompletenessSelect() {
  return {
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
    user: { select: { phoneOtpLastStatus: true } },
    payoutDetails: { select: { accountNumber: true, ifsc: true, upiId: true } },
    facetSelections: {
      select: { rank: true, option: { select: { dimension: true } } },
    },
    addOns: { select: { name: true } },
    _count: {
      select: { profileLanguages: true, packages: true, restrictions: true },
    },
    portfolioVideos: {
      where: {
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        ...playableAssetWhere(),
      },
      select: { id: true },
    },
    socialConnections: {
      where: {
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.ACTIVE,
      },
      select: { id: true },
    },
  } satisfies Prisma.CreatorProfileSelect;
}

export type ListedCompletenessProfile = Prisma.CreatorProfileGetPayload<{
  select: ReturnType<typeof listedCompletenessSelect>;
}>;

/** Names of every add-on a creator must have priced to count as complete. */
export async function mandatoryAddOnNames(
  prisma: PrismaService,
): Promise<string[]> {
  const options = await prisma.creatorAddOnOption.findMany({
    where: { mandatory: true },
    select: { name: true },
  });
  return options.map((option) => option.name);
}

/** Shapes a `listedCompletenessSelect()` row into checklist input. */
export function toListedCompletenessInput(
  profile: ListedCompletenessProfile,
  addOnNames: string[],
): ListedProfileCompletenessInput {
  const niches = profile.facetSelections.filter(
    (selection) =>
      selection.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY,
  );

  return {
    profileImageUrl: profile.profileImageUrl,
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
    nichePrimaryCount: niches.filter((selection) => selection.rank === 0)
      .length,
    nicheSecondaryCount: niches.filter((selection) => selection.rank > 0)
      .length,
    restrictionCount: profile._count.restrictions,
    languageCount: profile._count.profileLanguages,
    packageCount: profile._count.packages,
    publicVideoCount: profile.portfolioVideos.length,
    mandatoryAddOnsPriced: addOnNames.every((name) =>
      profile.addOns.some((addOn) => addOn.name === name),
    ),
    instagramConnected: profile.socialConnections.length > 0,
    phoneOtpLastStatus: profile.user?.phoneOtpLastStatus ?? null,
    // Payable means a full bank account or a UPI ID — the same rule the
    // creator's own masked endpoint reports as "configured".
    hasPayoutDetails: Boolean(
      (profile.payoutDetails?.accountNumber && profile.payoutDetails?.ifsc) ||
      profile.payoutDetails?.upiId,
    ),
  };
}

export interface CreatorCompleteness {
  complete: boolean;
  isListed: boolean;
  /** Stable keys + labels, so a UI can route each gap to the step that fixes it. */
  missing: GoLiveRequirement[];
}

/**
 * The live checklist for ONE creator, by user id or profile id.
 *
 * Evaluated on every call rather than read off `completeProfile`, which is a
 * latch stamped at Go Live: this gates brief acceptance, so it has to reflect
 * the profile as it stands right now.
 */
export async function loadCreatorCompleteness(
  prisma: PrismaService,
  where: { userId: string } | { id: string },
): Promise<CreatorCompleteness> {
  const [profile, addOnNames] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where,
      select: listedCompletenessSelect(),
    }),
    mandatoryAddOnNames(prisma),
  ]);
  if (!profile) throw new NotFoundException('Creator profile not found');

  const { complete, missing } = evaluateListedProfileCompleteness(
    toListedCompletenessInput(profile, addOnNames),
  );

  return {
    complete,
    isListed: profile.isListed,
    missing: missing.map(requirementForLabel),
  };
}
