import { ApprovalStatus, PortfolioVisibilityStatus, Prisma } from '@prisma/client';
import { evaluateProfileCompleteness } from './creator-profile-completeness.util';

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
      creatorApproval: { select: { status: true } },
      facetSelections: { select: { option: { select: { dimension: true } } } },
      _count: { select: { profileLanguages: true, packages: true } },
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
      languageCount: profile._count.profileLanguages,
      packageCount: profile._count.packages,
      publicVideoCount,
    });

    completeProfile = complete;
  }

  // Shortlisted creators move to awaiting review (PENDING) once the profile
  // completes — clears shortlist automatically with no email.
  if (
    !wasComplete &&
    completeProfile &&
    profile.creatorApproval?.status === ApprovalStatus.SHORTLISTED
  ) {
    await client.creatorApproval.update({
      where: { creatorId: creatorProfileId },
      data: {
        status: ApprovalStatus.PENDING,
        rejectionReason: null,
      },
    });
    profile.creatorApproval = { status: ApprovalStatus.PENDING };
  }

  const isListed =
    profile.creatorApproval?.status === ApprovalStatus.APPROVED &&
    completeProfile;

  if (
    completeProfile !== profile.completeProfile ||
    isListed !== profile.isListed
  ) {
    await client.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { completeProfile, isListed },
    });
  }

  const becameListed = !profile.isListed && isListed;

  return { completeProfile, isListed, becameListed };
}
