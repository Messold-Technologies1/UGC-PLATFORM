import { PrismaClient } from '@prisma/client';

/**
 * One-time backfill for User.phoneVerified.
 *
 * Phone OTP verification is now part of signup, but existing users (mainly
 * creators who signed up before OTP was enforced) already have a phone number
 * on their account with phoneVerified = false. Forcing them to re-verify an
 * existing number in Edit Profile is bad UX, so this grandfathers every account
 * that already has a phone: their phone is treated as verified.
 *
 * A raw UPDATE is used so updatedAt is not bumped. Idempotent: only rows that
 * have a non-empty phone and are still unverified are touched.
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
    UPDATE "User"
    SET "phoneVerified" = true
    WHERE "phone" IS NOT NULL
      AND btrim("phone") <> ''
      AND "phoneVerified" = false
  `;

  console.log(
    `[backfill] Marked phoneVerified = true on ${updated} existing account(s) ` +
      `with a phone. (${dbFingerprint()})`,
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
