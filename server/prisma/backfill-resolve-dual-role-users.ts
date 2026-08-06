import { AuthProvider, PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN =
  process.env.DRY_RUN === '1' ||
  process.env.DRY_RUN === 'true' ||
  process.argv.includes('--dry-run');

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

type BrandProfileCounts = {
  orders: number;
  briefs: number;
  wishlists: number;
  checkoutBatches: number;
};

function brandHasBlockingData(counts: BrandProfileCounts): boolean {
  return (
    counts.orders > 0 ||
    counts.briefs > 0 ||
    counts.wishlists > 0 ||
    counts.checkoutBatches > 0
  );
}

/**
 * Google is linked to the user row, not to brand vs creator. For dual-role cleanup we
 * remove it when it was almost certainly added by mistaken brand Google login:
 * - password signup creators (Google linked later during brand OAuth), or
 * - Google AuthAccount created after the creator profile already existed.
 */
function shouldRemoveGoogleAuth(
  passwordHash: string | null,
  creatorProfileCreatedAt: Date | null,
  googleAuthCreatedAt: Date | null,
): boolean {
  if (!googleAuthCreatedAt) return false;
  if (passwordHash) return true;
  if (!creatorProfileCreatedAt) return true;
  return googleAuthCreatedAt > creatorProfileCreatedAt;
}

async function main(): Promise<void> {
  const [brandRole, creatorRole] = await Promise.all([
    prisma.role.findUnique({
      where: { name: RoleName.BRAND },
      select: { id: true },
    }),
    prisma.role.findUnique({
      where: { name: RoleName.CREATOR },
      select: { id: true },
    }),
  ]);

  if (!brandRole || !creatorRole) {
    throw new Error('BRAND or CREATOR role is not configured in the Role table');
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          userRoles: { some: { roleId: brandRole.id } },
          AND: { userRoles: { some: { roleId: creatorRole.id } } },
        },
        {
          creatorProfile: { isNot: null },
          brandProfile: { isNot: null },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      primaryRoleId: true,
      primaryRole: { select: { name: true } },
      creatorProfile: { select: { id: true, createdAt: true } },
      brandProfile: {
        select: {
          id: true,
          logoKey: true,
          brandPronunciationAudioKey: true,
          _count: {
            select: {
              orders: true,
              briefs: true,
              wishlists: true,
              checkoutBatches: true,
            },
          },
        },
      },
      authAccounts: {
        where: { provider: AuthProvider.GOOGLE },
        select: { id: true, createdAt: true },
      },
      userRoles: { select: { roleId: true } },
    },
    orderBy: { email: 'asc' },
  });

  console.log(
    `[backfill:dual-role] mode=${DRY_RUN ? 'dry-run' : 'apply'} candidates=${users.length} (${dbFingerprint()})`,
  );

  if (users.length === 0) {
    console.log('[backfill:dual-role] Nothing to do.');
    return;
  }

  let applied = 0;
  let skipped = 0;

  for (const user of users) {
    const hasBrandRole = user.userRoles.some((ur) => ur.roleId === brandRole.id);
    const hasCreatorRole = user.userRoles.some(
      (ur) => ur.roleId === creatorRole.id,
    );
    const hasBrandProfile = Boolean(user.brandProfile);
    const hasCreatorProfile = Boolean(user.creatorProfile);
    const brandCounts = user.brandProfile?._count;
    const googleAuth = user.authAccounts[0] ?? null;
    const removeGoogleAuth = shouldRemoveGoogleAuth(
      user.passwordHash,
      user.creatorProfile?.createdAt ?? null,
      googleAuth?.createdAt ?? null,
    );

    const summary = {
      email: user.email,
      primaryRole: user.primaryRole?.name ?? null,
      hasBrandRole,
      hasCreatorRole,
      hasBrandProfile,
      hasCreatorProfile,
      hasGoogleAuth: Boolean(googleAuth),
      removeGoogleAuth,
      hasPassword: Boolean(user.passwordHash),
      brandCounts,
    };

    if (removeGoogleAuth && !user.passwordHash) {
      console.warn(
        `[backfill:dual-role] NOTE ${user.email} will need a password reset after Google auth is removed`,
      );
    }

    if (hasBrandProfile && brandCounts && brandHasBlockingData(brandCounts)) {
      skipped += 1;
      console.warn(
        `[backfill:dual-role] SKIP (brand activity) ${JSON.stringify(summary)}`,
      );
      continue;
    }

    if (DRY_RUN) {
      console.log(`[backfill:dual-role] WOULD_FIX ${JSON.stringify(summary)}`);
      applied += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: creatorRole.id },
        },
        create: { userId: user.id, roleId: creatorRole.id },
        update: {},
      });

      await tx.userRole.deleteMany({
        where: { userId: user.id, roleId: brandRole.id },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { primaryRoleId: creatorRole.id },
      });

      if (user.brandProfile) {
        await tx.brandProfile.delete({
          where: { userId: user.id },
        });
      }

      if (removeGoogleAuth) {
        await tx.authAccount.deleteMany({
          where: { userId: user.id, provider: AuthProvider.GOOGLE },
        });
      }

      // Force a fresh login so stale sessions don't keep a brand workspace context.
      await tx.session.deleteMany({
        where: { userId: user.id },
      });
    });

    applied += 1;
    console.log(`[backfill:dual-role] FIXED ${JSON.stringify(summary)}`);
  }

  console.log(
    `[backfill:dual-role] done applied=${applied} skipped=${skipped} total=${users.length}`,
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
