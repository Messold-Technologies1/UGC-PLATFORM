import {
  BLOCK_STYLES,
  buttonHtml,
  calloutWrapperStyle,
  isButtonTone,
  isCalloutTone,
  type ButtonTone,
  type CalloutTone,
} from './email-body-styles';

/**
 * Renders the visual editor's document into the email body.
 *
 * The editor stores a ProseMirror/TipTap document rather than HTML, and the
 * HTML is produced here. That split is the point: the admin picks what a block
 * MEANS (a headline, an aside, the call to action) and the server decides what
 * that looks like, so no edit can post a broken table or an unreadable colour
 * into a live email. It also means restyling every template is a change to
 * email-body-styles.ts, not thirty-two find-and-replaces.
 *
 * Output is Handlebars source, not final HTML: `{{recipientName}}` and friends
 * survive as-is and are substituted per send, exactly as the hand-written
 * templates are.
 */

export type DocMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'code' }
  | { type: 'link'; attrs?: { href?: string } };

export type DocNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: DocMark[];
  content?: DocNode[];
};

export type EmailBodyDoc = { type: 'doc'; content?: DocNode[] };

export class EmailBodyDocError extends Error {}

/** True for the shape the editor produces; anything else is rejected on save. */
export function isEmailBodyDoc(value: unknown): value is EmailBodyDoc {
  if (!value || typeof value !== 'object') return false;
  const doc = value as EmailBodyDoc;
  return (
    doc.type === 'doc' &&
    (doc.content === undefined || Array.isArray(doc.content))
  );
}

/**
 * Escapes text for HTML while leaving Handlebars expressions alone.
 *
 * A variable typed as `{{brandName}}` must reach the renderer intact — escaping
 * the braces would print them literally in the email — but the prose around it
 * is author input and has to be escaped, or a stray `<` silently eats the rest
 * of the paragraph.
 */
export function escapeText(raw: string): string {
  return raw
    .split(/(\{\{[^}]*\}\})/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'),
    )
    .join('');
}

/** A URL safe to put in href. Rejects javascript: and friends. */
function safeUrl(raw: unknown): string {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return '';
  // A URL that starts with a Handlebars expression is built at send time from
  // server-generated values — `{{frontendUrl}}/contact` is the common shape.
  // escapeText leaves the expression alone and escapes the path after it.
  if (/^\{\{[^}]+\}\}/.test(url)) return escapeText(url);
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return escapeText(url);
  throw new EmailBodyDocError(
    `Links must be http(s), mailto, tel or a variable — got "${url}"`,
  );
}

/** The bare content of one node, before its marks are applied. */
function inlineContent(node: DocNode): string | null {
  if (node.type === 'hardBreak') return '<br />';
  if (node.type === 'variable') {
    // The chip is stored as a node so it cannot be half-deleted into a broken
    // `{{recipien`; it renders back to the expression.
    const name = typeof node.attrs?.name === 'string' ? node.attrs.name : '';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new EmailBodyDocError(`Invalid variable name "${name}"`);
    }
    return `{{${name}}}`;
  }
  if (node.type === 'text' && typeof node.text === 'string') {
    return escapeText(node.text);
  }
  return null;
}

function applyMarks(html: string, marks: DocMark[] | undefined): string {
  let out = html;
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') out = `<strong>${out}</strong>`;
    else if (mark.type === 'italic') out = `<em>${out}</em>`;
    // <code> is stripped of styling by most clients, so it goes out as a span.
    else if (mark.type === 'code')
      out = `<span style="${BLOCK_STYLES.mono}">${out}</span>`;
    else if (mark.type === 'link') {
      const href = safeUrl(mark.attrs?.href);
      if (href) {
        out = `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${BLOCK_STYLES.link}">${out}</a>`;
      }
    }
  }
  return out;
}

/**
 * Marks apply to a variable exactly as they do to text, so `{{days}}-day` set
 * in bold comes back with both parts bold.
 *
 * Neighbours carrying the same marks are wrapped once rather than each in turn.
 * The editor splits a styled run at every chip, so `"{{packageName}}"` in bold
 * arrives as three nodes and would otherwise emit three adjacent <strong>s —
 * same rendering, but noisier markup in a format where bytes are scarce and
 * some clients choke on deep nesting.
 */
function renderInline(nodes: DocNode[] | undefined): string {
  if (!nodes?.length) return '';

  const key = (marks: DocMark[] | undefined) => JSON.stringify(marks ?? []);
  const out: string[] = [];
  let run = '';
  let runKey: string | null = null;
  let runMarks: DocMark[] | undefined;

  const flush = () => {
    if (runKey !== null) out.push(applyMarks(run, runMarks));
    run = '';
    runKey = null;
    runMarks = undefined;
  };

  for (const node of nodes) {
    const content = inlineContent(node);
    if (content === null) continue;
    const nodeKey = key(node.marks);
    if (nodeKey !== runKey) {
      flush();
      runKey = nodeKey;
      runMarks = node.marks;
    }
    run += content;
  }
  flush();

  return out.join('');
}

function renderList(node: DocNode, tag: 'ul' | 'ol'): string {
  const items = (node.content ?? [])
    .map((item) => {
      // A list item wraps paragraphs; flatten them so the <li> does not inherit
      // the paragraph's bottom margin and double-space the list.
      const inner = (item.content ?? [])
        .map((child) => renderInline(child.content))
        .filter(Boolean)
        .join('<br />');
      return `<li style="${BLOCK_STYLES.listItem}">${inner}</li>`;
    })
    .join('');
  return `<${tag} style="${BLOCK_STYLES.list}">${items}</${tag}>`;
}

function renderBlock(node: DocNode): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = renderInline(node.content);
      // An empty paragraph is the author's blank line; keep the spacing.
      if (!inner) return `<p style="${BLOCK_STYLES.paragraph}">&nbsp;</p>`;
      const variant =
        typeof node.attrs?.variant === 'string' ? node.attrs.variant : 'body';
      const style =
        variant === 'lead'
          ? BLOCK_STYLES.lead
          : variant === 'note'
            ? BLOCK_STYLES.note
            : variant === 'eyebrow'
              ? BLOCK_STYLES.eyebrow
              : BLOCK_STYLES.paragraph;
      return `<p style="${style}">${inner}</p>`;
    }
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      const style =
        level <= 1 ? BLOCK_STYLES.headline : BLOCK_STYLES.subheading;
      return `<p style="${style}">${renderInline(node.content)}</p>`;
    }
    case 'bulletList':
      return renderList(node, 'ul');
    case 'orderedList':
      return renderList(node, 'ol');
    case 'callout': {
      const tone: CalloutTone = isCalloutTone(node.attrs?.tone)
        ? node.attrs.tone
        : 'neutral';
      const body = (node.content ?? [])
        .map((child, i) => {
          const inner = renderInline(child.content);
          if (!inner) return '';
          // First line of a callout is its label, as in the written templates.
          const style =
            i === 0 && (node.content?.length ?? 0) > 1
              ? BLOCK_STYLES.calloutHeading
              : BLOCK_STYLES.calloutText;
          return `<p style="${style}">${inner}</p>`;
        })
        .filter(Boolean)
        .join('');
      return `<div style="${calloutWrapperStyle(tone)}">${body}</div>`;
    }
    case 'button': {
      const href = safeUrl(node.attrs?.url);
      const label = escapeText(
        typeof node.attrs?.label === 'string' && node.attrs.label.trim()
          ? node.attrs.label
          : 'Open',
      );
      if (!href) {
        throw new EmailBodyDocError(
          'The button needs a link before it can be saved',
        );
      }
      const tone: ButtonTone = isButtonTone(node.attrs?.tone)
        ? node.attrs.tone
        : 'brand';
      return buttonHtml(href, label, tone);
    }
    case 'conditional': {
      // Everything inside is skipped at send time unless the variable has a
      // value — which is how a template offers an action link only when there
      // is one to offer, rather than rendering a button that goes nowhere.
      const variable =
        typeof node.attrs?.variable === 'string' ? node.attrs.variable : '';
      if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(variable)) {
        throw new EmailBodyDocError(
          `"Only show if" needs a variable name — got "${variable}"`,
        );
      }
      const helper = node.attrs?.negated ? 'unless' : 'if';
      const inner = (node.content ?? [])
        .map(renderBlock)
        .filter(Boolean)
        .join('\n');
      if (!inner) return '';
      return `{{#${helper} ${variable}}}\n${inner}\n{{/${helper}}}`;
    }
    default:
      return '';
  }
}

/** Renders a document to Handlebars body source. Throws EmailBodyDocError. */
export function renderEmailBodyDoc(doc: unknown): string {
  if (!isEmailBodyDoc(doc)) {
    throw new EmailBodyDocError('Not a valid editor document');
  }
  return (doc.content ?? []).map(renderBlock).filter(Boolean).join('\n');
}
