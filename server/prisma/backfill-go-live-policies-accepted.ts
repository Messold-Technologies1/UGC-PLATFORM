import { PrismaClient } from '@prisma/client';

/**
 * One-time backfill for CreatorProfile.goLivePoliciesAcceptedAt.
 *
 * Policy acceptance (AI Content, Usage Rights, Payout, Creator Guidelines) is
 * now persisted, but existing creators who already completed their profile
 * accepted the policies under the old client-only flow, so their acceptance was
 * never recorded. Every creator with completeProfile = true went through Go Live
 * and therefore accepted the policies — this covers listed (APPROVED), Self
 * complete (SELF_COMPLETED) and Awaiting review (PENDING) creators alike.
 *
 * The real acceptance time is unknown, so we stamp each profile's own updatedAt
 * (its most recent save, roughly when it went live) as a best-effort proxy. A
 * raw UPDATE is used so updatedAt is not itself bumped, and so the stamp can be
 * copied from the same row in a single statement.
 *
 * Idempotent: only rows still missing the stamp are touched.
 */

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

async function main(): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE "CreatorProfile"
    SET "goLivePoliciesAcceptedAt" = "updatedAt"
    WHERE "completeProfile" = true
      AND "goLivePoliciesAcceptedAt" IS NULL
  `;

  console.log(
    `[backfill] Stamped goLivePoliciesAcceptedAt on ${updated} completed ` +
      `creator profile(s). (${dbFingerprint()})`,
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
