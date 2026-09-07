import { ApprovalStatus, PrismaClient } from '@prisma/client';
import { recomputeCreatorListingState } from '../src/creator-profile/creator-listing-state.util';

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
 * One-time backfill for making the intro video optional to go live.
 *
 * The Go-Live checklist no longer requires an intro video, but `completeProfile`
 * is a one-way latch that is only re-evaluated on a creator's next profile
 * write. So a creator sitting at SHORTLISTED whose *only* remaining gap was the
 * intro video would stay stuck there until they happened to save again.
 *
 * This script re-runs the authoritative listing recompute (the same code the
 * "Go Live" path uses) for every currently-shortlisted creator, with completeness
 * evaluation enabled. Because it reuses `recomputeCreatorListingState`:
 *   - it latches `completeProfile` ONLY for profiles that are genuinely complete
 *     under the current rules (everything except the now-optional intro video),
 *     so a shortlisted creator missing anything else is left untouched;
 *   - it applies the SHORTLISTED -> PENDING (Awaiting review) transition exactly
 *     as the runtime does — no rule is duplicated here, so nothing can drift.
 *
 * Scope is deliberately limited to SHORTLISTED creators: they are an
 * admin-curated set already in the review pipeline. `isListed` still requires
 * APPROVED, so this can never publish a profile to brand discovery — the most it
 * does is move a completed-but-shortlisted creator into Awaiting review.
 *
 * Idempotent: profiles already past SHORTLISTED are not selected, and a second
 * run over any remaining ones is a no-op once they have transitioned.
 */
async function main(): Promise<void> {
  const profiles = await prisma.creatorProfile.findMany({
    where: { creatorApproval: { status: ApprovalStatus.SHORTLISTED } },
    select: { id: true },
  });

  let movedToAwaitingReview = 0;
  let stillShortlisted = 0;

  for (const profile of profiles) {
    const before = await prisma.creatorApproval.findUnique({
      where: { creatorId: profile.id },
      select: { status: true },
    });

    // Same call the Go Live path makes: evaluate completeness and, when the
    // profile is complete, latch completeProfile + transition the approval.
    await recomputeCreatorListingState(prisma, profile.id, true);

    const after = await prisma.creatorApproval.findUnique({
      where: { creatorId: profile.id },
      select: { status: true },
    });

    if (
      before?.status === ApprovalStatus.SHORTLISTED &&
      after?.status === ApprovalStatus.PENDING
    ) {
      movedToAwaitingReview += 1;
    } else if (after?.status === ApprovalStatus.SHORTLISTED) {
      stillShortlisted += 1;
    }
  }

  console.log(
    `[backfill] Processed ${profiles.length} shortlisted creator(s). ` +
      `movedToAwaitingReview=${movedToAwaitingReview} ` +
      `stillShortlisted=${stillShortlisted} (${dbFingerprint()})`,
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
