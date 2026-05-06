import { CreatorAgeGroup } from '@prisma/client';

/** Inclusive min/max age filters against `dateOfBirth` (calendar-day based). */
export function dateOfBirthRangeForAgeFilter(
  minAge?: number,
  maxAge?: number,
  ref: Date = new Date(),
): { lte?: Date; gte?: Date } {
  const out: { lte?: Date; gte?: Date } = {};
  if (minAge !== undefined && Number.isFinite(minAge) && minAge >= 0) {
    out.lte = new Date(
      ref.getFullYear() - minAge,
      ref.getMonth(),
      ref.getDate(),
    );
  }
  if (maxAge !== undefined && Number.isFinite(maxAge) && maxAge >= 0) {
    out.gte = new Date(
      ref.getFullYear() - maxAge - 1,
      ref.getMonth(),
      ref.getDate() + 1,
    );
  }
  return out;
}

export function ageGroupToAgeRange(
  group: CreatorAgeGroup,
): { minAge: number; maxAge: number } {
  switch (group) {
    case CreatorAgeGroup.AGE_18_24:
      return { minAge: 18, maxAge: 24 };
    case CreatorAgeGroup.AGE_25_34:
      return { minAge: 25, maxAge: 34 };
    case CreatorAgeGroup.AGE_35_44:
      return { minAge: 35, maxAge: 44 };
    case CreatorAgeGroup.AGE_45_54:
      return { minAge: 45, maxAge: 54 };
    case CreatorAgeGroup.AGE_55_PLUS:
      return { minAge: 55, maxAge: 120 };
    default:
      return { minAge: 18, maxAge: 120 };
  }
}

export function computeAgeYears(dob: Date, ref: Date = new Date()): number {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function computeAgeGroup(dob: Date, ref?: Date): CreatorAgeGroup {
  const age = computeAgeYears(dob, ref);
  if (age < 25) return CreatorAgeGroup.AGE_18_24;
  if (age < 35) return CreatorAgeGroup.AGE_25_34;
  if (age < 45) return CreatorAgeGroup.AGE_35_44;
  if (age < 55) return CreatorAgeGroup.AGE_45_54;
  return CreatorAgeGroup.AGE_55_PLUS;
}
