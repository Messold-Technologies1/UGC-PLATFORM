import { ApprovalStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    const host = u.host;
    const db = u.pathname.replace(/^\//, '') || '<no-db>';
    return `host=${host} db=${db}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

async function main(): Promise<void> {
  // Don't rely on relation-null filters (can be finicky across Prisma versions).
  // Instead: compute the diff between CreatorProfile ids and CreatorApproval.creatorId.
  const [profiles, approvals] = await Promise.all([
    prisma.creatorProfile.findMany({
      select: { id: true, isListed: true, completeProfile: true },
    }),
    prisma.creatorApproval.findMany({ select: { creatorId: true } }),
  ]);
  const approvedSet = new Set(approvals.map((a) => a.creatorId));
  const missing = profiles.filter((p) => !approvedSet.has(p.id));

  if (missing.length === 0) {
    console.log(
      `[backfill] No missing CreatorApproval rows found. profiles=${profiles.length} approvals=${approvals.length} (${dbFingerprint()})`,
    );
    return;
  }

  const listed = missing.filter((p) => p.isListed);
  const unlisted = missing.filter((p) => !p.isListed);

  // Listed profiles must be APPROVED — that is the listing gate. Inserting
  // PENDING here would hide them from Awaiting review (they're already live)
  // and leave List with nothing to update.
  if (listed.length > 0) {
    await prisma.creatorApproval.createMany({
      data: listed.map((row) => ({
        creatorId: row.id,
        status: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  if (unlisted.length > 0) {
    await prisma.creatorApproval.createMany({
      data: unlisted.map((row) => ({ creatorId: row.id })),
      skipDuplicates: true,
    });
  }

  console.log(
    `[backfill] Ensured CreatorApproval for ${missing.length} creator(s). listedApproved=${listed.length} unlistedPending=${unlisted.length}. profiles=${profiles.length} approvalsBefore=${approvals.length} (${dbFingerprint()})`,
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
