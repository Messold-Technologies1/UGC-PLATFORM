import { PrismaClient } from '@prisma/client';

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

async function countProfilesNeedingUpdate(): Promise<{
  creators: number;
  brands: number;
}> {
  const [creators, brands] = await Promise.all([
    prisma.creatorProfile.count({
      where: {
        OR: [
          { emailNotificationsEnabled: false },
          { whatsappNotificationsEnabled: false },
        ],
      },
    }),
    prisma.brandProfile.count({
      where: {
        OR: [
          { emailNotificationsEnabled: false },
          { whatsappNotificationsEnabled: false },
        ],
      },
    }),
  ]);
  return { creators, brands };
}

async function main(): Promise<void> {
  const before = await countProfilesNeedingUpdate();
  const [creatorTotal, brandTotal] = await Promise.all([
    prisma.creatorProfile.count(),
    prisma.brandProfile.count(),
  ]);

  console.log(
    `[backfill] Enabling email + WhatsApp notifications for all profiles (${dbFingerprint()})`,
  );
  console.log(
    `[backfill] Before: creators=${creatorTotal} (${before.creators} not fully enabled), brands=${brandTotal} (${before.brands} not fully enabled)`,
  );

  const [creatorResult, brandResult] = await prisma.$transaction([
    prisma.creatorProfile.updateMany({
      data: {
        emailNotificationsEnabled: true,
        whatsappNotificationsEnabled: true,
      },
    }),
    prisma.brandProfile.updateMany({
      data: {
        emailNotificationsEnabled: true,
        whatsappNotificationsEnabled: true,
      },
    }),
  ]);

  const after = await countProfilesNeedingUpdate();

  console.log(
    `[backfill] Updated creators=${creatorResult.count}, brands=${brandResult.count}`,
  );
  console.log(
    `[backfill] After: creatorsNeedingUpdate=${after.creators}, brandsNeedingUpdate=${after.brands}`,
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
