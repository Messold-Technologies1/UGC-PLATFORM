/**
 * Turning email copy into notification copy.
 *
 * Push has no template of its own yet: the title is the email's subject and
 * the body is the start of its plain-text part. That is what lets the channel
 * be switched on for any of the catalog's events without authoring thirty new
 * templates first — see docs/BROWSER_PUSH_PLAN.md §4.3.
 */

/**
 * How much body text to keep.
 *
 * Every platform truncates further than this — around two lines on Android,
 * one on macOS — so the number is not trying to match any of them. It is the
 * point past which the text is certainly not being read, chosen to keep the
 * encrypted payload comfortably inside the ~4KB push limit.
 */
export const PUSH_BODY_MAX = 120;

/**
 * Shorten to at most `max` characters, breaking at a word.
 *
 * Breaking mid-word reads like a bug rather than an abbreviation, so a long
 * final word is dropped instead of being cut — unless dropping it would lose
 * most of the text, in which case a hard cut is the lesser evil (a single
 * 200-character "word" is a URL, and half a URL is still more informative than
 * an ellipsis on its own).
 */
export function truncateForPush(text: string, max = PUSH_BODY_MAX): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;

  const hardCut = collapsed.slice(0, max);
  const lastSpace = hardCut.lastIndexOf(' ');
  // Keep the word break only when it leaves most of the budget intact.
  const body = lastSpace > max * 0.6 ? hardCut.slice(0, lastSpace) : hardCut;
  return `${body.trimEnd()}…`;
}

/**
 * Trim the email subject down to a notification title.
 *
 * Every subject in the catalog is written for an inbox, where naming the
 * sender is the convention — 29 of the 40 end in "— Go Collab". A lock screen
 * already shows which site the notification came from, so that tail is pure
 * waste in a line the OS will truncate anyway.
 *
 * Matched against the rendered platform name rather than a general "strip
 * what follows a dash", because plenty of subjects use a dash to carry
 * meaning: "Dispute resolved — order rejected" must survive intact.
 */
export function pushTitleFrom(subject: string, platformName: unknown): string {
  const title = subject.trim();
  const name = typeof platformName === 'string' ? platformName.trim() : '';
  if (!name) return title;

  // Only the trailing segment, and only when that segment is about the
  // platform rather than about the event.
  const tail = /\s+[—–-]\s+([^—–]*)$/.exec(title);
  if (!tail?.[1]?.includes(name)) return title;

  const trimmed = title.slice(0, tail.index).trim();
  // Never trim a title away to nothing: a subject that is only the platform
  // name is worth more than an empty notification.
  return trimmed || title;
}

/**
 * Drop the greeting line an email opens with.
 *
 * All 40 text templates begin "Hi {{recipientName}}," because that is how an
 * email opens. A notification has about 120 characters before it is cut off,
 * and spending the first fifteen greeting someone who can already see the
 * message is on their own device is the difference between a body that says
 * what happened and one that does not.
 *
 * Narrow on purpose: a short opening line that is only a greeting. Anything
 * carrying content stays.
 */
export function stripGreeting(text: string): string {
  const [first, ...rest] = text.split(/\r?\n/);
  if (rest.length === 0) return text;
  if (!/^(hi|hello|hey|dear)\b[^.!?]{0,40},?\s*$/i.test(first.trim())) {
    return text;
  }
  const remainder = rest.join('\n').trim();
  // If the greeting was the whole message, keep it rather than send nothing.
  return remainder || text;
}

/**
 * The URL the notification opens.
 *
 * Every event in the catalog builds `actionUrl` from `frontendBaseUrl`, so it
 * is normally absolute already. The guards are for the two ways that can stop
 * being true — an event that forgets the base, or one with no action at all —
 * because a service worker handed a relative URL opens the push service's
 * origin, not ours, and the click goes nowhere.
 */
export function pushClickUrl(
  actionUrl: unknown,
  frontendBaseUrl: string,
): string {
  const base = frontendBaseUrl.replace(/\/$/, '');
  if (typeof actionUrl !== 'string' || !actionUrl.trim()) return base || '/';
  const url = actionUrl.trim();
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}/${url.replace(/^\//, '')}`;
}
