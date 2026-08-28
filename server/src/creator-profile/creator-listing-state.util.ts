import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  Prisma,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { evaluateProfileCompleteness } from './creator-profile-completeness.util';
import { isProfileFirstOnboardingMode } from '../config/creator-onboarding-mode';
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';

/**
 * Where a creator lands when their profile is (or becomes) complete.
 *
 *   SHORTLISTED → PENDING (Awaiting review) — even if they already completed,
 *     so a backfill that latched completeProfile cannot leave them shortlisted
 *     or dump them into Self complete.
 *   PENDING → SELF_COMPLETED on the first completion only, and only in
 *     profile_first. Approval_first keeps a single PENDING review queue.
 */
export function nextApprovalStatusOnCompletion({
  wasComplete,
  completeProfile,
  currentStatus,
  wasShortlisted,
  profileFirst,
}: {
  wasComplete: boolean;
  completeProfile: boolean;
  currentStatus: ApprovalStatus | undefined;
  wasShortlisted: boolean;
  profileFirst: boolean;
}): ApprovalStatus | null {
  if (!completeProfile) return null;
  // Shortlisted (now or still flagged) skip Self complete and wait in
  // Awaiting review. Unshortlist clears wasShortlisted so they can land in
  // Self complete like anyone else from Building profile.
  if (currentStatus === ApprovalStatus.SHORTLISTED) {
    return ApprovalStatus.PENDING;
  }
  if (
    wasShortlisted &&
    currentStatus === ApprovalStatus.SELF_COMPLETED
  ) {
    return ApprovalStatus.PENDING;
  }
  if (
    !wasComplete &&
    currentStatus === ApprovalStatus.PENDING &&
    profileFirst
  ) {
    return ApprovalStatus.SELF_COMPLETED;
  }
  return null;
}

/**
 * Single source of truth for the `completeProfile` latch and the derived
 * `isListed` discovery gate. Every write that can affect either flag
 * (profile edits, portfolio video creation, approval changes) calls this so the
 * stored values never drift.
 *
 * Rules:
 * - `completeProfile` is a one-way latch: once true it never reverts, so we only
 *   evaluate the checklist while it is still false.
 * - `isListed` = (approval APPROVED) AND completeProfile, recomputed every time.
 *
 * Safe to call with a transaction client or the base PrismaClient.
 */
export async function recomputeCreatorListingState(
  client: Prisma.TransactionClient,
  creatorProfileId: string,
  /**
   * Whether the `completeProfile` latch may flip false → true on this write.
   * Defaults to FALSE: publishing is an explicit creator action ("Go Live"),
   * so no incidental write — portfolio video upload, admin approval, package
   * edits, draft save — should auto-publish a profile. Only the Go Live path
   * passes true. `isListed` is still recomputed on every call, and once
   * `completeProfile` is true it stays true (one-way latch).
   */
  evaluateCompleteness = false,
): Promise<{
  completeProfile: boolean;
  isListed: boolean;
  /** True only on the isListed false -> true transition made by this call. */
  becameListed: boolean;
} | null> {
  const profile = await client.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: {
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
      creatorApproval: { select: { status: true, wasShortlisted: true } },
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

  if (!profile) return null;

  let completeProfile = profile.completeProfile;
  const wasComplete = profile.completeProfile;

  // Latch only flips false -> true; never re-evaluate once already complete,
  // and never auto-latch on a draft save (evaluateCompleteness === false).
  if (!completeProfile && evaluateCompleteness) {
    const publicVideoCount = await client.creatorPortfolioVideo.count({
      where: {
        creatorId: creatorProfileId,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        // A still-mirroring import has no playable bytes yet, so it must not
        // let a creator go live on three empty players.
        ...playableAssetWhere(),
      },
    });

    // Every mandatory add-on in the catalog must be priced by the creator.
    const mandatoryOptions = await client.creatorAddOnOption.findMany({
      where: { mandatory: true },
      select: { name: true },
    });
    const creatorAddOnNames = new Set(profile.addOns.map((a) => a.name));
    const mandatoryAddOnsPriced = mandatoryOptions.every((option) =>
      creatorAddOnNames.has(option.name),
    );

    // An active Instagram OAuth connection is required to go live.
    const instagramConnectionCount = await client.socialConnection.count({
      where: {
        creatorProfileId,
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
      mandatoryAddOnsPriced,
      instagramConnected: instagramConnectionCount > 0,
    });

    completeProfile = complete;
  }

  const currentStatus = profile.creatorApproval?.status;
  const nextStatus = nextApprovalStatusOnCompletion({
    wasComplete,
    completeProfile,
    currentStatus,
    wasShortlisted: profile.creatorApproval?.wasShortlisted === true,
    profileFirst: isProfileFirstOnboardingMode(
      process.env.CREATOR_ONBOARDING_MODE,
    ),
  });

  const isListed =
    (nextStatus ?? currentStatus) === ApprovalStatus.APPROVED &&
    completeProfile;

  // Latch completeProfile before flipping approval so a concurrent Go Live
  // cannot read PENDING + still-incomplete and shove a shortlisted creator
  // into Self complete.
  if (
    completeProfile !== profile.completeProfile ||
    isListed !== profile.isListed
  ) {
    await client.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { completeProfile, isListed },
    });
  }

  if (nextStatus && nextStatus !== currentStatus) {
    await client.creatorApproval.updateMany({
      where: {
        creatorId: creatorProfileId,
        ...(currentStatus ? { status: currentStatus } : {}),
      },
      data: {
        status: nextStatus,
        rejectionReason: null,
        ...(nextStatus === ApprovalStatus.SELF_COMPLETED
          ? { approvedAt: new Date() }
          : {}),
      },
    });
    profile.creatorApproval = { status: nextStatus };
  }

  const becameListed = !profile.isListed && isListed;

  return { completeProfile, isListed, becameListed };
}
