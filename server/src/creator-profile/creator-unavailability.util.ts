/** Calendar-date helpers for CreatorUnavailability (@db.Date). */

export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateOnly(value: Date): string {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDateOnlyUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function toDateOnlyUtc(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function isDateWithinInclusiveRange(
  day: Date,
  startsOn: Date,
  endsOn: Date,
): boolean {
  const d = toDateOnlyUtc(day).getTime();
  const start = toDateOnlyUtc(startsOn).getTime();
  const end = toDateOnlyUtc(endsOn).getTime();
  return d >= start && d <= end;
}

export function mapUnavailabilityToPublicAvailability(unavailability?: {
  startsOn: Date;
  endsOn: Date;
} | null): {
  available: boolean;
  startsOn: string | null;
  endsOn: string | null;
} {
  if (!unavailability) {
    return { available: true, startsOn: null, endsOn: null };
  }
  const today = todayDateOnlyUtc();
  const available = !isDateWithinInclusiveRange(
    today,
    unavailability.startsOn,
    unavailability.endsOn,
  );
  return {
    available,
    startsOn: formatDateOnly(unavailability.startsOn),
    endsOn: formatDateOnly(unavailability.endsOn),
  };
}
