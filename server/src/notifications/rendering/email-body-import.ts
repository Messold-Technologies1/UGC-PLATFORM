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

  const re = /<(strong|b|em|i|a)\b([^>]*)>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
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
export function emailBodyImportSupport(html: string): {
  supported: boolean;
  reason?: string;
} {
  const source = html.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  if (/\{\{#/.test(source)) {
    return {
      supported: false,
      reason:
        'This body uses a conditional ({{#if}}), which the visual editor cannot represent.',
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

export function importEmailBodyHtml(html: string): EmailBodyDoc {
  // Handlebars comments carry authoring notes, not content.
  const source = html.replace(/\{\{!--[\s\S]*?--\}\}/g, '').trim();
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

  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  };
}
