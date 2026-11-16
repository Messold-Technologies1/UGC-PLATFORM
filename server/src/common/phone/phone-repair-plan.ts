import { classifyPhoneRepair, type PhoneRepairKind } from './phone-e164.util';

/**
 * Planning for the phone repair script, separated from it so the collision
 * rule can be tested. The script does the I/O; everything decided here is
 * pure.
 */

export type PlannedRepair = {
  id: string;
  from: string;
  /** Empty when there is nothing safe to store. */
  to: string;
  kind: PhoneRepairKind;
  /** Set when the row will NOT be written, and why. */
  skipped?: string;
};

export type RepairPolicy = {
  /** Apply the inferred `recovered` class as well as plain `normalized`. */
  includeRecovered: boolean;
};

export function willWrite(
  kind: PhoneRepairKind,
  policy: RepairPolicy,
): boolean {
  if (kind === 'normalized') return true;
  if (kind === 'recovered') return policy.includeRecovered;
  return false;
}

/**
 * Plan rewrites for a column that identifies a person.
 *
 * `User.phone` carries no unique constraint, so a rewrite landing on a number
 * another account already holds would not fail — it would quietly produce two
 * accounts with one number, which is worse than the malformed value it
 * replaced. So the target state of EVERY row is computed first, and any
 * rewrite whose destination is contested is dropped and reported.
 *
 * `rows` must be every row in the column, not just the broken ones; a
 * collision is only visible against the full set.
 */
export function planIdentityPhoneRepairs(
  rows: { id: string; phone: string | null }[],
  policy: RepairPolicy,
): PlannedRepair[] {
  const intended = new Map<string, string[]>();

  for (const row of rows) {
    const stored = row.phone?.trim();
    if (!stored) continue;
    const repair = classifyPhoneRepair(stored);
    const target =
      willWrite(repair.kind, policy) && repair.to ? repair.to : stored;
    const holders = intended.get(target) ?? [];
    holders.push(row.id);
    intended.set(target, holders);
  }

  const planned: PlannedRepair[] = [];
  for (const row of rows) {
    const stored = row.phone?.trim();
    if (!stored) continue;
    const repair = classifyPhoneRepair(stored);
    if (repair.kind === 'canonical') continue;

    const base = { id: row.id, from: stored, kind: repair.kind };

    if (!repair.to) {
      planned.push({ ...base, to: '', skipped: 'unrecoverable' });
      continue;
    }
    if (!willWrite(repair.kind, policy)) {
      planned.push({
        ...base,
        to: repair.to,
        skipped: 'needs --include-recovered',
      });
      continue;
    }

    const others = (intended.get(repair.to) ?? []).filter(
      (id) => id !== row.id,
    );
    if (others.length > 0) {
      planned.push({
        ...base,
        to: repair.to,
        skipped: `collides with ${others.join(', ')}`,
      });
      continue;
    }

    planned.push({ ...base, to: repair.to });
  }

  return planned;
}

/**
 * Plan rewrites for a column that is contact information rather than an
 * identity — `BrandProfile.contactPhone`, `Agency.contactPhone`. Two brands
 * legitimately sharing a contact number is not a conflict, so no collision
 * rule applies.
 */
export function planContactPhoneRepairs(
  rows: { id: string; phone: string | null }[],
  policy: RepairPolicy,
): PlannedRepair[] {
  const planned: PlannedRepair[] = [];
  for (const row of rows) {
    const stored = row.phone?.trim();
    if (!stored) continue;
    const repair = classifyPhoneRepair(stored);
    if (repair.kind === 'canonical') continue;

    const base = { id: row.id, from: stored, kind: repair.kind };
    if (!repair.to) {
      planned.push({ ...base, to: '', skipped: 'unrecoverable' });
    } else if (!willWrite(repair.kind, policy)) {
      planned.push({
        ...base,
        to: repair.to,
        skipped: 'needs --include-recovered',
      });
    } else {
      planned.push({ ...base, to: repair.to });
    }
  }
  return planned;
}
