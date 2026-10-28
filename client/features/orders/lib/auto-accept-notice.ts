/**
 * Copy for the auto-accept deadline a delivered order carries.
 *
 * The deadline is enforced by an hourly sweep on the server, so it can run up
 * to an hour late. The wording is therefore days-and-dates rather than a live
 * ticking countdown — a clock reading "0h 00m" beside an order that has not
 * closed yet reads as a bug.
 */

export interface AutoAcceptNotice {
  /** Short line for a list card, e.g. "Auto-approves in 3 days". */
  short: string;
  /** Fuller sentence for the detail page. */
  detail: string;
  /** True inside the last day, when the card should draw attention to it. */
  urgent: boolean;
}

const DAY_MS = 86_400_000;

function formatDeadline(at: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(at);
}

/**
 * Null when no clock is running, or when the date cannot be read — the caller
 * then shows nothing rather than a half-rendered warning.
 */
export function autoAcceptNotice(
  autoAcceptAt: string | null | undefined,
  now: Date = new Date(),
): AutoAcceptNotice | null {
  if (!autoAcceptAt) return null;

  const at = new Date(autoAcceptAt);
  if (Number.isNaN(at.getTime())) return null;

  const remainingMs = at.getTime() - now.getTime();
  const deadline = formatDeadline(at);

  // Past the deadline the sweep has simply not run yet. Saying "in 0 days"
  // would be wrong in both directions, so say what is actually true.
  if (remainingMs <= 0) {
    return {
      short: "Auto-approving shortly",
      detail:
        "The review window has closed. This order will be approved " +
        "automatically within the hour unless you request a revision first.",
      urgent: true,
    };
  }

  // Round up: with 30 hours left a brand has "2 days" in the sense they care
  // about — today and tomorrow — not 1.25.
  const days = Math.ceil(remainingMs / DAY_MS);

  if (days <= 1) {
    return {
      short: "Auto-approves today",
      detail:
        `This order approves itself on ${deadline} if you take no action. ` +
        "Request a revision or raise an issue before then to keep it open.",
      urgent: true,
    };
  }

  return {
    short: `Auto-approves in ${days} days`,
    detail:
      `If you take no action, this order approves itself on ${deadline} ` +
      "and the creator is paid. Requesting a revision stops the clock.",
    urgent: false,
  };
}
