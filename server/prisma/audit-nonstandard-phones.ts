import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { normalizeE164 } from '../src/common/phone/phone-e164.util';

/**
 * Read-only audit of every stored phone number. Writes nothing to the
 * database.
 *
 * Until now the only check on a phone number was `/^\+\d{8,15}$/`, which
 * counts digits and nothing else. It accepted numbers that are not dialable —
 * most commonly a country code followed by the national trunk prefix the
 * number is printed with (`+91` + `0` + the ten real digits, stored as
 * `+9108122064860`). WhatsApp delivered to those anyway, because Meta's Cloud
 * API resolves the string against registered accounts and drops the trunk
 * prefix, so they went on to pass OTP verification and were saved as-is.
 *
 * Validation is fixed going forward (see src/common/phone). This script finds
 * what is already stored, so the rows can be reviewed by a human rather than
 * rewritten underneath them:
 *
 *   REPAIRABLE  Valid once parsed, but not in canonical form. The canonical
 *               value is known and shown in `suggested`. The trunk-prefix case
 *               lands here: the person is reachable, the string is wrong.
 *
 *   INVALID     Does not parse to a real number at all. No safe suggestion
 *               exists; someone has to confirm the number with its owner.
 *
 * Usage:
 *   npm run audit:phones                 # summary + ./phone-audit-<ts>.csv
 *   npm run audit:phones -- --out=x.csv  # choose the file
 *   npm run audit:phones -- --quiet      # summary only, no CSV
 */

const prisma = new PrismaClient();

type Verdict = 'REPAIRABLE' | 'INVALID';

type Finding = {
  table: string;
  column: string;
  id: string;
  label: string;
  stored: string;
  verdict: Verdict;
  suggested: string;
  /** Verification state, where the table tracks one. */
  notes: string;
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

/** `null` when the stored value is already canonical — nothing to report. */
function classify(
  stored: string,
): Omit<Finding, 'table' | 'column' | 'id' | 'label' | 'notes'> | null {
  const canonical = normalizeE164(stored);
  if (canonical === stored) return null;
  if (canonical === null) {
    return { stored, verdict: 'INVALID', suggested: '' };
  }
  return { stored, verdict: 'REPAIRABLE', suggested: canonical };
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function auditUsers(): Promise<Finding[]> {
  const rows = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: {
      id: true,
      email: true,
      phone: true,
      phoneVerified: true,
      phoneOtpLastStatus: true,
    },
  });

  const findings: Finding[] = [];
  for (const row of rows) {
    const stored = row.phone?.trim();
    if (!stored) continue;
    const verdict = classify(stored);
    if (!verdict) continue;
    findings.push({
      table: 'User',
      column: 'phone',
      id: row.id,
      label: row.email ?? '',
      notes:
        `phoneVerified=${row.phoneVerified} ` +
        `otpLastStatus=${row.phoneOtpLastStatus ?? 'null'}`,
      ...verdict,
    });
  }
  return findings;
}

async function auditBrandProfiles(): Promise<Finding[]> {
  const rows = await prisma.brandProfile.findMany({
    where: { contactPhone: { not: null } },
    select: { id: true, brandName: true, contactPhone: true },
  });

  const findings: Finding[] = [];
  for (const row of rows) {
    const stored = row.contactPhone?.trim();
    if (!stored) continue;
    const verdict = classify(stored);
    if (!verdict) continue;
    findings.push({
      table: 'BrandProfile',
      column: 'contactPhone',
      id: row.id,
      label: row.brandName ?? '',
      notes: '',
      ...verdict,
    });
  }
  return findings;
}

async function auditAgencies(): Promise<Finding[]> {
  const rows = await prisma.agency.findMany({
    where: { contactPhone: { not: null } },
    select: {
      id: true,
      name: true,
      contactPhone: true,
      contactPhoneVerified: true,
    },
  });

  const findings: Finding[] = [];
  for (const row of rows) {
    const stored = row.contactPhone?.trim();
    if (!stored) continue;
    const verdict = classify(stored);
    if (!verdict) continue;
    findings.push({
      table: 'Agency',
      column: 'contactPhone',
      id: row.id,
      label: row.name ?? '',
      notes: `contactPhoneVerified=${row.contactPhoneVerified}`,
      ...verdict,
    });
  }
  return findings;
}

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return hit?.slice(flag.length + 1);
}

async function main(): Promise<void> {
  const findings = [
    ...(await auditUsers()),
    ...(await auditBrandProfiles()),
    ...(await auditAgencies()),
  ];

  const repairable = findings.filter((f) => f.verdict === 'REPAIRABLE');
  const invalid = findings.filter((f) => f.verdict === 'INVALID');

  console.log(`\n[phone-audit] ${dbFingerprint()}`);
  console.log(
    `[phone-audit] ${findings.length} number(s) need review: ` +
      `${repairable.length} repairable, ${invalid.length} invalid.`,
  );

  if (findings.length === 0) {
    console.log(
      '[phone-audit] Every stored number is already canonical E.164.',
    );
    return;
  }

  // A per-table tally first: it is the number worth quoting, and the full list
  // can be thousands of rows.
  const byTable = new Map<string, number>();
  for (const f of findings) {
    const key = `${f.table}.${f.column}`;
    byTable.set(key, (byTable.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...byTable].sort((a, b) => b[1] - a[1])) {
    console.log(`[phone-audit]   ${key}: ${count}`);
  }

  console.log('\n[phone-audit] First 20:');
  for (const f of findings.slice(0, 20)) {
    const arrow = f.suggested ? ` -> ${f.suggested}` : '';
    console.log(
      `  ${f.verdict.padEnd(10)} ${f.table}.${f.column} ${f.id} ` +
        `${f.stored}${arrow}`,
    );
  }

  if (process.argv.includes('--quiet')) return;

  const out = resolve(
    argValue('--out') ??
      `phone-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
  );
  const header = 'table,column,id,label,stored,verdict,suggested,notes';
  const body = findings
    .map((f) =>
      [
        f.table,
        f.column,
        f.id,
        f.label,
        f.stored,
        f.verdict,
        f.suggested,
        f.notes,
      ]
        .map(csvCell)
        .join(','),
    )
    .join('\n');
  writeFileSync(out, `${header}\n${body}\n`, 'utf8');
  console.log(`\n[phone-audit] Wrote ${findings.length} row(s) to ${out}`);
  console.log(
    '[phone-audit] Nothing was changed in the database. Review the CSV and ' +
      'apply corrections deliberately.',
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
