import { parse as parseHtml } from 'node-html-parser';

/**
 * A readable plain-text part from rendered HTML: block elements become line
 * breaks, links keep their target, and runs of blank lines collapse.
 */
export function deriveText(html: string): string {
  const root = parseHtml(html);
  root.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    const label = a.textContent.trim();
    if (href && label && !label.includes(href)) {
      a.replaceWith(`${label} (${href})`);
    }
  });
  root
    .querySelectorAll('p, div, br, tr, h1, h2, h3, h4, li')
    .forEach((el) => el.insertAdjacentHTML('afterend', '\n'));

  return root.textContent
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------------ hbs → text */

/**
 * One argument of a Handlebars partial call: `label="Review order →"`,
 * `url=actionUrl`, or `label=(concat "Get Listed on " platformName)`.
 */
type Arg =
  | { kind: 'literal'; value: string }
  | { kind: 'path'; value: string }
  | { kind: 'concat'; parts: Arg[] };

function argToText(arg: Arg): string {
  if (arg.kind === 'literal') return arg.value;
  if (arg.kind === 'path') return `{{${arg.value}}}`;
  return arg.parts.map(argToText).join('');
}

/** Reads one value: a quoted string, a `(helper …)` subexpression, or a path. */
function readValue(src: string, start: number): { arg: Arg; next: number } {
  let i = start;
  const quote = src[i];

  if (quote === '"' || quote === "'") {
    i += 1;
    const from = i;
    while (i < src.length && src[i] !== quote) i += 1;
    return { arg: { kind: 'literal', value: src.slice(from, i) }, next: i + 1 };
  }

  if (src[i] === '(') {
    i += 1;
    // Skip the helper name; `concat` is the only one templates use here, and
    // any other helper still degrades to its arguments joined together.
    while (i < src.length && /\S/.test(src[i]) && src[i] !== ')') i += 1;
    const parts: Arg[] = [];
    while (i < src.length && src[i] !== ')') {
      if (/\s/.test(src[i])) {
        i += 1;
        continue;
      }
      const read = readValue(src, i);
      parts.push(read.arg);
      i = read.next;
    }
    return { arg: { kind: 'concat', parts }, next: i + 1 };
  }

  const from = i;
  while (i < src.length && /[^\s)]/.test(src[i])) i += 1;
  return { arg: { kind: 'path', value: src.slice(from, i) }, next: i };
}

/** `url=actionUrl label="Review order →"` -> { url, label }. */
function parseHashArgs(src: string): Record<string, Arg> {
  const args: Record<string, Arg> = {};
  let i = 0;

  while (i < src.length) {
    if (/\s/.test(src[i])) {
      i += 1;
      continue;
    }
    const from = i;
    while (i < src.length && /[\w-]/.test(src[i])) i += 1;
    const key = src.slice(from, i);

    if (!key || src[i] !== '=') {
      // Not a key=value pair — skip the token rather than misreading it.
      while (i < src.length && /\S/.test(src[i])) i += 1;
      continue;
    }

    const read = readValue(src, i + 1);
    args[key] = read.arg;
    i = read.next;
  }
  return args;
}

/** Matches `{{> actionButton url=… label=…}}`, the only partial templates call. */
const ACTION_BUTTON = /\{\{>\s*actionButton\s+([\s\S]*?)\}\}/g;
const HBS_COMMENT = /\{\{!--[\s\S]*?--\}\}|\{\{![\s\S]*?\}\}/g;

/**
 * Derives the plain-text *template* from the HTML *template* — `{{var}}`
 * expressions are left intact, so the result is itself a Handlebars template.
 *
 * Two things have to happen before {@link deriveText} can do its job, because
 * it works on markup and a template is not yet markup:
 *
 * - **Comments are dropped.** Every bundled template opens with
 *   `{{!-- context: … --}}`, which is a note to whoever edits it. Left in, it
 *   would become the first line of every plain-text email.
 * - **The action button becomes a line of text.** All 32 templates render their
 *   CTA through `{{> actionButton url=… label=…}}`. The partial is not expanded
 *   at this point, so the raw call would appear verbatim. It turns into
 *   `Label: {{url}}`, which is exactly the convention the hand-written
 *   plain-text files already use.
 *
 * The trailing `→` is dropped from labels: it reads as an arrow next to a
 * button, and as a stray glyph in a line of text.
 */
export function deriveTextHbs(htmlHbs: string): string {
  const withButtons = htmlHbs
    .replace(HBS_COMMENT, '')
    .replace(ACTION_BUTTON, (_match, rawArgs: string) => {
      const args = parseHashArgs(rawArgs);
      const label = args.label ? argToText(args.label) : '';
      const url = args.url ? argToText(args.url) : '';
      const cleanLabel = label.replace(/[\s→>]+$/u, '').trim();
      if (!cleanLabel && !url) return '';
      // A <p> so the block-splitting below puts it on its own line.
      return `<p>${cleanLabel ? `${cleanLabel}: ` : ''}${url}</p>`;
    });

  return deriveText(withButtons);
}
