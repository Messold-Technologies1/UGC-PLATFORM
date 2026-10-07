import type { DocNode, EmailBodyDoc } from './email-body-doc';
import { CALLOUT_TONES, type CalloutTone } from './email-body-styles';

/**
 * Reads a hand-written body back into an editor document.
 *
 * The thirty-odd bundled templates were written as HTML long before there was
 * a visual editor, so without this the editor would only ever be usable for new
 * ones. The markup is ours and highly regular — a flat run of styled <p>, a
 * callout <div>, the actionButton partial — so this matches on those shapes and
 * infers each block's ROLE from the styling it was given.
 *
 * Best-effort by design: anything it cannot place becomes an ordinary
 * paragraph rather than being dropped, and the import is only ever a starting
 * point the admin sees rendered in the preview before saving.
 */

type Token = { tag: string; attrs: string; inner: string };

/** Splits the top-level elements of a body, keeping nested markup intact. */
function topLevelElements(html: string): Token[] {
  const out: Token[] = [];
  const re = /<(p|div|ul|ol|h[1-3]|table)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html))) {
    const [open, rawTag, attrs] = match;
    const tag = rawTag.toLowerCase();
    const start = match.index + open.length;

    // Walk to the matching close, counting nested opens of the same tag.
    const scan = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
    scan.lastIndex = start;
    let depth = 1;
    let end = -1;
    let step: RegExpExecArray | null;
    while ((step = scan.exec(html))) {
      depth += step[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = step.index;
        break;
      }
    }
    if (end === -1) break;

    out.push({ tag, attrs, inner: html.slice(start, end) });
    re.lastIndex = scan.lastIndex;
  }
  return out;
}

const styleOf = (attrs: string): string =>
  /style="([^"]*)"/i.exec(attrs)?.[1] ?? '';

/** Which paragraph role a set of inline styles was expressing. */
function paragraphVariant(style: string): string | null {
  if (/text-transform:\s*uppercase/i.test(style)) return 'eyebrow';
  const size = Number(/font-size:\s*(\d+)px/i.exec(style)?.[1] ?? 0);
  const weight = Number(/font-weight:\s*(\d+)/i.exec(style)?.[1] ?? 0);
  if (size >= 20 || weight >= 700) return null; // a heading, handled separately
  if (size <= 14) return 'note';
  if (size === 15) return 'lead';
  return 'body';
}

function calloutTone(style: string): CalloutTone {
  const bg = /background:\s*(#[0-9a-f]{3,8})/i.exec(style)?.[1]?.toLowerCase();
  for (const [name, value] of Object.entries(CALLOUT_TONES)) {
    if (value.toLowerCase() === bg) return name as CalloutTone;
  }
  return 'neutral';
}

const decode = (s: string): string =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** Turns a run of inline markup into text nodes, marks and variable chips. */
function parseInline(html: string): DocNode[] {
  const out: DocNode[] = [];

  const push = (text: string, marks: DocNode['marks']) => {
    if (!text) return;
    // Variables become their own atom so the editor cannot half-delete them.
    for (const piece of text.split(/(\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\})/g)) {
      if (!piece) continue;
      const variable = /^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/.exec(piece);
      if (variable) {
        // Marks carry onto the chip: "{{days}}-day" set in bold must come back
        // with the variable bold too, not just the "-day".
        out.push({
          type: 'variable',
          attrs: { name: variable[1] },
          ...(marks?.length ? { marks } : {}),
        });
      } else {
        out.push({
          type: 'text',
          text: decode(piece),
          ...(marks?.length ? { marks } : {}),
        });
      }
    }
  };

  const re =
    /<(strong|b|em|i|a|code|span)\b([^>]*)>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html))) {
    push(html.slice(cursor, match.index).replace(/<[^>]+>/g, ''), undefined);
    cursor = match.index + match[0].length;

    if (!match[1]) {
      out.push({ type: 'hardBreak' });
      continue;
    }
    const tag = match[1].toLowerCase();
    // A plain <span> is only a wrapper unless it carries the monospace styling
    // the templates use for order ids; otherwise its text passes through bare.
    const mono = /font-family:\s*monospace/i.test(match[2]);
    if (tag === 'span' && !mono) {
      push(match[3].replace(/<[^>]+>/g, ''), undefined);
      continue;
    }
    const marks: DocNode['marks'] =
      tag === 'a'
        ? [
            {
              type: 'link',
              attrs: { href: /href="([^"]*)"/i.exec(match[2])?.[1] ?? '' },
            },
          ]
        : tag === 'em' || tag === 'i'
          ? [{ type: 'italic' }]
          : tag === 'code' || tag === 'span'
            ? [{ type: 'code' }]
            : [{ type: 'bold' }];
    push(match[3].replace(/<[^>]+>/g, ''), marks);
  }
  push(html.slice(cursor).replace(/<[^>]+>/g, ''), undefined);

  return out.filter((n) => n.type !== 'text' || (n.text ?? '').length > 0);
}

const paragraph = (inner: string, variant?: string | null): DocNode => ({
  type: 'paragraph',
  ...(variant && variant !== 'body' ? { attrs: { variant } } : {}),
  content: parseInline(inner),
});

/** The CTA partial, e.g. `{{> actionButton url=actionUrl label="Open →"}}`. */
const BUTTON_PARTIAL =
  /\{\{>\s*actionButton\s+url=([^\s}]+)\s+label="([^"]*)"\s*\}\}/i;

function buttonFrom(source: string): DocNode | null {
  const partial = BUTTON_PARTIAL.exec(source);
  if (partial) {
    const url = partial[1].trim();
    return {
      type: 'button',
      attrs: {
        // `url=actionUrl` in the partial means the variable, not a literal.
        url: /^[A-Za-z_][A-Za-z0-9_]*$/.test(url) ? `{{${url}}}` : url,
        label: decode(partial[2]),
      },
    };
  }
  // An inlined button table, for templates that did not use the partial.
  const anchor = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(source);
  if (anchor && /border-radius:\s*999px/i.test(source)) {
    return {
      type: 'button',
      attrs: {
        url: anchor[1],
        label: decode(anchor[2].replace(/<[^>]+>/g, '')).trim(),
      },
    };
  }
  return null;
}

/**
 * Whether a hand-written body can be represented as an editor document.
 *
 * Half the bundled templates cannot. A document has no notion of a conditional,
 * so importing `{{#if actionUrl}}` would quietly drop the condition and leave a
 * button that renders unconditionally — a worse outcome than not offering the
 * editor at all. Data tables have no editor block either. Those templates keep
 * the HTML editor, and the caller is told which it is so it can say why.
 */
/**
 * Whether every conditional wraps whole blocks rather than cutting through one.
 *
 * `<p>{{#if x}}A{{else}}B{{/if}}</p>` is a conditional on a few words, not on a
 * block, and the editor has no inline equivalent. Splitting the body at it
 * would leave half a paragraph on each side and silently lose the copy, so the
 * import has to refuse rather than guess. Detected by whether each piece the
 * split produces closes every tag it opens.
 */
function conditionalsWrapWholeBlocks(source: string): boolean {
  const balanced = (fragment: string): boolean => {
    const tags =
      /<(\/?)(p|div|ul|ol|li|table|tr|td|h[1-6]|strong|em|a)\b[^>]*?(\/?)>/gi;
    let depth = 0;
    let m: RegExpExecArray | null;
    while ((m = tags.exec(fragment))) {
      if (m[3] === '/') continue; // self-closing
      depth += m[1] === '/' ? -1 : 1;
      if (depth < 0) return false;
    }
    return depth === 0;
  };

  const walk = (text: string): boolean => {
    const found = nextConditional(text);
    if (!found) return true;
    if (!balanced(found.before) || !balanced(found.body)) return false;
    return walk(found.body) && walk(found.after);
  };
  return walk(source);
}

export function emailBodyImportSupport(html: string): {
  supported: boolean;
  reason?: string;
} {
  const source = html.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  // {{#if}} and {{#unless}} are blocks in the editor; anything else ({{#each}},
  // a custom helper) has no equivalent and would be dropped silently.
  const blocks = [...source.matchAll(/\{\{#\s*([a-zA-Z]+)/g)].map((m) => m[1]);
  const unsupported = blocks.filter((h) => h !== 'if' && h !== 'unless');
  if (unsupported.length) {
    return {
      supported: false,
      reason: `This body uses {{#${unsupported[0]}}}, which the visual editor cannot represent.`,
    };
  }
  // A computed label — label=(concat "Get listed on " platformName) — cannot be
  // a literal string on a button node, and dropping it would lose the CTA.
  const computedLabel =
    /\{\{>\s*actionButton\b(?![^}]*label="[^"]*")[^}]*\}\}/i.exec(source);
  if (computedLabel) {
    return {
      supported: false,
      reason:
        'This body builds its button label with a helper, which the visual editor cannot represent.',
    };
  }
  if (!conditionalsWrapWholeBlocks(source)) {
    return {
      supported: false,
      reason:
        'This body puts a conditional inside a sentence, which the visual editor cannot represent.',
    };
  }
  // The CTA partial is a table once rendered, so discount it before looking.
  const withoutButton = source.replace(/\{\{>\s*actionButton[^}]*\}\}/gi, '');
  if (
    /<table/i.test(withoutButton) &&
    !/border-radius:\s*999px/i.test(withoutButton)
  ) {
    return {
      supported: false,
      reason:
        'This body uses a data table, which the visual editor cannot represent.',
    };
  }
  return { supported: true };
}

/** The blocks in one run of markup, with no conditional wrappers left in it. */
function parseBlocks(source: string): DocNode[] {
  const content: DocNode[] = [];

  for (const el of topLevelElements(source)) {
    const style = styleOf(el.attrs);

    if (el.tag === 'div') {
      const button = buttonFrom(el.inner);
      if (button) {
        content.push(button);
        continue;
      }
      // A bordered, tinted box is a callout.
      if (/border-radius:\s*\d+px/i.test(style) && /background:/i.test(style)) {
        const inner = topLevelElements(el.inner)
          .filter((child) => child.tag === 'p')
          .map((child) => paragraph(child.inner));
        content.push({
          type: 'callout',
          attrs: { tone: calloutTone(style) },
          content: inner.length ? inner : [paragraph(el.inner)],
        });
        continue;
      }
      // Any other wrapper: keep what is inside it rather than the box.
      for (const child of topLevelElements(el.inner)) {
        if (child.tag === 'p')
          content.push(
            paragraph(child.inner, paragraphVariant(styleOf(child.attrs))),
          );
      }
      continue;
    }

    if (el.tag === 'p') {
      const size = Number(/font-size:\s*(\d+)px/i.exec(style)?.[1] ?? 0);
      const weight = Number(/font-weight:\s*(\d+)/i.exec(style)?.[1] ?? 0);
      // The written templates style their headings as <p>, so size is the only
      // thing that distinguishes one.
      if (size >= 20 && weight >= 700) {
        content.push({
          type: 'heading',
          attrs: { level: size >= 24 ? 1 : 2 },
          content: parseInline(el.inner),
        });
      } else {
        content.push(paragraph(el.inner, paragraphVariant(style)));
      }
      continue;
    }

    if (el.tag === 'ul' || el.tag === 'ol') {
      const items = topLevelElements(`<p>${el.inner}</p>`);
      const lis = [...el.inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(
        (m) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(m[1]) }],
        }),
      );
      void items;
      if (lis.length) {
        content.push({
          type: el.tag === 'ul' ? 'bulletList' : 'orderedList',
          content: lis,
        });
      }
      continue;
    }

    if (el.tag.startsWith('h')) {
      content.push({
        type: 'heading',
        attrs: { level: el.tag === 'h1' ? 1 : 2 },
        content: parseInline(el.inner),
      });
      continue;
    }

    if (el.tag === 'table') {
      const button = buttonFrom(`<table${el.attrs}>${el.inner}</table>`);
      if (button) content.push(button);
      // A data table has no editor equivalent; those templates stay on HTML.
      continue;
    }
  }

  // A standalone button partial sitting outside any wrapper.
  if (!content.some((n) => n.type === 'button')) {
    const loose = buttonFrom(
      source.replace(/<(p|div|ul|ol|table)\b[\s\S]*?<\/\1>/gi, ''),
    );
    if (loose) content.push(loose);
  }

  return content;
}

/**
 * Finds a top-level `{{#if x}} ... {{/if}}`, counting nested opens so an inner
 * conditional does not end the outer one early.
 */
function nextConditional(source: string): {
  before: string;
  variable: string;
  negated: boolean;
  body: string;
  after: string;
} | null {
  const open = /\{\{#\s*(if|unless)\s+([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}/.exec(
    source,
  );
  if (!open) return null;

  const scan =
    /\{\{#\s*(?:if|unless)\b[^}]*\}\}|\{\{\/\s*(?:if|unless)\s*\}\}/g;
  scan.lastIndex = open.index + open[0].length;
  let depth = 1;
  let step: RegExpExecArray | null;
  while ((step = scan.exec(source))) {
    depth += step[0].startsWith('{{#') ? 1 : -1;
    if (depth === 0) {
      return {
        before: source.slice(0, open.index),
        variable: open[2],
        negated: open[1] === 'unless',
        body: source.slice(open.index + open[0].length, step.index),
        after: source.slice(step.index + step[0].length),
      };
    }
  }
  return null;
}

/**
 * Splits a body at its conditionals and keeps each one as a block.
 *
 * `{{else}}` becomes a second block on the same variable, negated — an `unless`
 * says the same thing as the else arm and survives as an ordinary block the
 * admin can edit or delete on its own, rather than a branch hidden inside
 * another block's UI.
 */
function parseWithConditionals(source: string): DocNode[] {
  const found = nextConditional(source);
  if (!found) return parseBlocks(source);

  const out = [...parseBlocks(found.before)];
  const elseAt = /\{\{\s*else\s*\}\}/.exec(found.body);
  const thenPart = elseAt ? found.body.slice(0, elseAt.index) : found.body;
  const elsePart = elseAt
    ? found.body.slice(elseAt.index + elseAt[0].length)
    : null;

  const thenBlocks = parseWithConditionals(thenPart);
  if (thenBlocks.length) {
    out.push({
      type: 'conditional',
      attrs: { variable: found.variable, negated: found.negated },
      content: thenBlocks,
    });
  }
  if (elsePart !== null) {
    const elseBlocks = parseWithConditionals(elsePart);
    if (elseBlocks.length) {
      out.push({
        type: 'conditional',
        attrs: { variable: found.variable, negated: !found.negated },
        content: elseBlocks,
      });
    }
  }

  out.push(...parseWithConditionals(found.after));
  return out;
}

export function importEmailBodyHtml(html: string): EmailBodyDoc {
  // Handlebars comments carry authoring notes, not content.
  const source = html.replace(/\{\{!--[\s\S]*?--\}\}/g, '').trim();
  const content = parseWithConditionals(source);
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  };
}
