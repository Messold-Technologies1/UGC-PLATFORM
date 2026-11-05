import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { type PhoneRepairKind } from '../common/phone/phone-e164.util';
import {
  planContactPhoneRepairs,
  planIdentityPhoneRepairs,
  type PlannedRepair,
  type RepairPolicy,
} from '../common/phone/phone-repair-plan';

/**
 * Rewrite stored phone numbers into canonical E.164.
 *
 * Companion to audit-nonstandard-phones.ts, which reports; this one writes.
 * It classifies each row with the same shared `classifyPhoneRepair`, so the
 * two can never disagree about what is wrong with a number.
 *
 * Three classes, and they are NOT treated alike:
 *
 *   normalized   The stored value parses as a real number and we are simply
 *                storing a non-canonical spelling of it — a national trunk
 *                prefix (`+91` + `0` + the ten real digits), spaces, dashes.
 *                No inference: the canonical form is the same number, and it
 *                is the number that received the OTP. Applied by --apply.
 *
 *   recovered    The stored value is NOT dialable, but it is a dialable
 *                number with its country code typed twice. Dropping the
 *                repeat yields a valid number. This is an inference, so it
 *                needs --include-recovered on top of --apply.
 *
 *   unrecoverable  Never written. Reported so a human can ask the owner.
 *
 * Safety:
 *   - Dry run unless --apply. The dry run prints exactly what would change.
 *   - `User.phone` has no unique constraint, so a rewrite that collided with
 *     another account would silently create two users sharing a number rather
 *     than failing. Collisions are detected up front and skipped.
 *   - Each UPDATE carries `AND "phone" = <the value we read>`, so a row edited
 *     by someone else since the scan is left alone rather than clobbered.
 *   - Verification flags are untouched. For `normalized` rows the canonical
 *     number IS the handset that received and returned the code, so clearing
 *     phoneVerified would lock out people who did nothing wrong.
 *   - `phoneOtpLastPhone` is moved with `phone` when it holds the same stale
 *     string; it is the fallback the order courier details read from.
 *   - Idempotent: a second run finds nothing to do.
 *
 * Usage, on the server (from /opt/gocollab/current):
 *   npm run repair:phones                              # dry run, changes nothing
 *   npm run repair:phones -- --apply                   # writes `normalized` only
 *   npm run repair:phones -- --apply --include-recovered
 *   npm run repair:phones -- --apply --out=/opt/gocollab/shared/repair.csv
 *
 * Locally: npm run repair:phones:dev
 */

const prisma = new PrismaClient();

type Planned = PlannedRepair & {
  table: 'User' | 'BrandProfile' | 'Agency';
  column: string;
  label: string;
};

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

function argValue(flag: string): string | undefined {
  return process.argv
    .find((arg) => arg.startsWith(`${flag}=`))
    ?.slice(flag.length + 1);
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const APPLY = process.argv.includes('--apply');
const INCLUDE_RECOVERED = process.argv.includes('--include-recovered');

const POLICY: RepairPolicy = { includeRecovered: INCLUDE_RECOVERED };

/** Attach table/column/label to a planned repair for reporting. */
function decorate(
  table: Planned['table'],
  column: string,
  labels: Map<string, string>,
  rows: PlannedRepair[],
): Planned[] {
  return rows.map((row) => ({
    ...row,
    table,
    column,
    label: labels.get(row.id) ?? '',
  }));
}

async function applyChanges(changes: Planned[]): Promise<number> {
  let written = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const change of changes) {
        if (change.table === 'User') {
          // Raw UPDATE so `updatedAt` is not bumped — this corrects a stored
          // value, it is not the account being edited. The `phone = from`
          // guard means a row changed since the scan is skipped, not
          // overwritten. phoneOtpLastPhone moves with it only when it holds
          // the same stale string.
          written += await tx.$executeRaw`
            UPDATE "User"
            SET "phone" = ${change.to},
                "phoneOtpLastPhone" = CASE
                  WHEN "phoneOtpLastPhone" = ${change.from} THEN ${change.to}
                  ELSE "phoneOtpLastPhone"
                END
            WHERE "id" = ${change.id}::uuid
              AND "phone" = ${change.from}
          `;
        } else if (change.table === 'BrandProfile') {
          written += await tx.$executeRaw`
            UPDATE "BrandProfile"
            SET "contactPhone" = ${change.to}
            WHERE "id" = ${change.id}::uuid
              AND "contactPhone" = ${change.from}
          `;
        } else {
          written += await tx.$executeRaw`
            UPDATE "Agency"
            SET "contactPhone" = ${change.to}
            WHERE "id" = ${change.id}::uuid
              AND "contactPhone" = ${change.from}
          `;
        }
      }
    },
    { timeout: 120_000 },
  );
  return written;
}

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, email: true, phone: true, phoneOtpLastPhone: true },
  });
  const brands = await prisma.brandProfile.findMany({
    where: { contactPhone: { not: null } },
    select: { id: true, brandName: true, contactPhone: true },
  });
  const agencies = await prisma.agency.findMany({
    where: { contactPhone: { not: null } },
    select: { id: true, name: true, contactPhone: true },
  });

  const planned: Planned[] = [
    ...decorate(
      'User',
      'phone',
      new Map(users.map((u) => [u.id, u.email ?? ''])),
      planIdentityPhoneRepairs(users, POLICY),
    ),
    ...decorate(
      'BrandProfile',
      'contactPhone',
      new Map(brands.map((b) => [b.id, b.brandName ?? ''])),
      planContactPhoneRepairs(
        brands.map((b) => ({ id: b.id, phone: b.contactPhone })),
        POLICY,
      ),
    ),
    ...decorate(
      'Agency',
      'contactPhone',
      new Map(agencies.map((a) => [a.id, a.name ?? ''])),
      planContactPhoneRepairs(
        agencies.map((a) => ({ id: a.id, phone: a.contactPhone })),
        POLICY,
      ),
    ),
  ];

  const writable = planned.filter((p) => !p.skipped);
  const skipped = planned.filter((p) => p.skipped);

  const byKind = (kind: PhoneRepairKind): number =>
    planned.filter((p) => p.kind === kind).length;

  console.log(`\n[phone-repair] ${dbFingerprint()}`);
  console.log(
    `[phone-repair] ${planned.length} non-canonical number(s): ` +
      `${byKind('normalized')} normalized, ${byKind('recovered')} recovered, ` +
      `${byKind('unrecoverable')} unrecoverable.`,
  );
  console.log(
    `[phone-repair] ${writable.length} will be written, ` +
      `${skipped.length} left alone.`,
  );

  if (!INCLUDE_RECOVERED && byKind('recovered') > 0) {
    console.log(
      `[phone-repair] ${byKind('recovered')} recovered row(s) held back. ` +
        'Pass --include-recovered to write them too.',
    );
  }

  if (writable.length > 0) {
    console.log('\n[phone-repair] To write (first 20):');
    for (const c of writable.slice(0, 20)) {
      console.log(
        `  ${c.kind.padEnd(12)} ${c.table}.${c.column} ${c.id} ` +
          `${c.from} -> ${c.to}`,
      );
    }
  }

  const collisions = skipped.filter((s) => s.skipped?.startsWith('collides'));
  if (collisions.length > 0) {
    console.log(
      `\n[phone-repair] ${collisions.length} SKIPPED for collision — two ` +
        'accounts would end up on one number. These need a human:',
    );
    for (const c of collisions) {
      console.log(`  ${c.table} ${c.id} ${c.from} -> ${c.to} (${c.skipped})`);
    }
  }

  const out = resolve(
    argValue('--out') ??
      `phone-repair-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
  );
  const header = 'table,column,id,label,from,to,kind,action';
  const body = planned
    .map((p) =>
      [
        p.table,
        p.column,
        p.id,
        p.label,
        p.from,
        p.to,
        p.kind,
        p.skipped ? `skipped: ${p.skipped}` : APPLY ? 'written' : 'would write',
      ]
        .map(csvCell)
        .join(','),
    )
    .join('\n');

  if (!APPLY) {
    if (planned.length > 0) {
      writeFileSync(out, `${header}\n${body}\n`, 'utf8');
      console.log(`\n[phone-repair] Plan written to ${out}`);
    }
    console.log(
      '\n[phone-repair] DRY RUN — nothing was changed. Re-run with --apply.',
    );
    return;
  }

  const written = await applyChanges(writable);
  // The CSV is the undo list: every `from` is recoverable from it.
  if (planned.length > 0) {
    writeFileSync(out, `${header}\n${body}\n`, 'utf8');
  }
  console.log(`\n[phone-repair] Updated ${written} row(s).`);
  if (written !== writable.length) {
    console.log(
      `[phone-repair] ${writable.length - written} row(s) changed underneath ` +
        'the scan and were left alone. Re-run to pick them up.',
    );
  }
  console.log(`[phone-repair] Record of this run: ${out}`);
  console.log('[phone-repair] Verify with: npm run audit:phones -- --quiet');
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
