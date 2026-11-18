/**
 * "20–28 Nov", "20 Nov", "from 20 Nov", "until 28 Nov" — whichever ends of
 * the range the creator actually gave.
 *
 * Returns null when there are no dates at all, so a card can skip the chip
 * rather than render an empty one.
 */
export function formatDateRange(
  startsOn: string | null,
  endsOn: string | null,
): string | null {
  const start = parse(startsOn);
  const end = parse(endsOn);

  if (!start && !end) return null;
  if (start && !end) return `from ${format(start)}`;
  if (!start && end) return `until ${format(end)}`;
  if (!start || !end) return null;

  if (start.getTime() === end.getTime()) return format(start);

  // Same month: "20–28 Nov" rather than repeating the month.
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) return `${start.getUTCDate()}–${format(end)}`;

  return `${format(start)} – ${format(end)}`;
}

/**
 * `@db.Date` arrives as "YYYY-MM-DD". Parsed as UTC so the day never shifts
 * under a reader whose clock is behind it — `new Date("2026-11-20")` is
 * already UTC, but being explicit keeps it that way if the format changes.
 */
function parse(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(date.getUTCFullYear() === new Date().getUTCFullYear()
      ? {}
      : { year: "numeric" }),
  });
}

/** Today as YYYY-MM-DD, for a date input's `min`. */
export function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
