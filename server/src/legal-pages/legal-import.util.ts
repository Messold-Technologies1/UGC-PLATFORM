import { marked } from 'marked';
import { parse, type Node, type HTMLElement } from 'node-html-parser';

export type LegalImportFormat = 'html' | 'markdown';

/**
 * A section produced by parsing an uploaded document. Structurally matches
 * `DraftSectionInputDto`, so the result can be fed straight into `saveDraft`
 * (which sanitizes and validates it through the normal draft pipeline).
 */
export interface ParsedLegalSection {
  anchorId: string;
  title: string;
  tocLabel: string;
  content: string;
  sortOrder: number;
}

const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 3;

const HEADING_LEVEL: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NODE_TYPE_ELEMENT;
}

function tagOf(node: Node): string | null {
  if (!isElement(node)) return null;
  const raw = (node as HTMLElement).rawTagName;
  return raw ? raw.toLowerCase() : null;
}

function headingLevelOf(node: Node): number | undefined {
  const tag = tagOf(node);
  return tag ? HEADING_LEVEL[tag] : undefined;
}

/** Keep elements and non-blank text nodes; drop comments and whitespace. */
function isKeepable(node: Node): boolean {
  if (isElement(node)) return true;
  if (node.nodeType === NODE_TYPE_TEXT) {
    const raw = (node as { rawText?: string }).rawText;
    return Boolean(raw && raw.trim());
  }
  return false;
}

function outerHtmlOf(node: Node): string {
  if (isElement(node)) return (node as HTMLElement).outerHTML;
  return node.toString();
}

/**
 * Section titles are rendered as `<h2>` by the public renderer, and the section
 * sanitizer whitelist only permits `h3`/`h4` in the body. So any heading that
 * ends up *inside* a section body is demoted: h1–h3 → h3, h4–h6 → h4.
 */
function demoteBodyHeadings(html: string): string {
  return html
    .replace(/<(\/?)h[123](\b[^>]*)?>/gi, (_m, slash: string, rest?: string) =>
      slash ? '</h3>' : `<h3${rest ?? ''}>`,
    )
    .replace(/<(\/?)h[456](\b[^>]*)?>/gi, (_m, slash: string, rest?: string) =>
      slash ? '</h4>' : `<h4${rest ?? ''}>`,
    );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
    .replace(/-+$/g, '');
}

/**
 * Descend through single wrapper elements (e.g. a `<div>`/`<article>` that some
 * exporters wrap the whole document in) until we reach the level where the
 * heading flow actually lives.
 */
function unwrapToHeadingFlow(nodes: Node[]): Node[] {
  let current = nodes;
  while (
    current.length === 1 &&
    isElement(current[0]) &&
    headingLevelOf(current[0]) === undefined
  ) {
    const children = (current[0] as HTMLElement).childNodes.filter(isKeepable);
    if (!children.some(isElement)) break;
    current = children;
  }
  return current;
}

interface RawSection {
  title: string;
  parts: string[];
}

/**
 * Parse an uploaded legal document (HTML or Markdown) into an ordered list of
 * sections, splitting on the shallowest heading level present. Content that
 * appears before the first heading becomes an "Overview" section; a document
 * with no headings at all becomes a single section.
 */
export function parseDocumentToSections(
  content: string,
  format: LegalImportFormat,
): ParsedLegalSection[] {
  const html =
    format === 'markdown'
      ? (marked.parse(content, { async: false }) as string)
      : content;

  const root = parse(html, { comment: false });
  const nodes = unwrapToHeadingFlow(root.childNodes.filter(isKeepable));

  const headingLevels = nodes
    .map(headingLevelOf)
    .filter((level): level is number => level !== undefined);
  const boundaryLevel = headingLevels.length ? Math.min(...headingLevels) : null;

  const rawSections: RawSection[] = [];
  const preamble: string[] = [];
  let current: RawSection | null = null;

  for (const node of nodes) {
    const level = headingLevelOf(node);
    if (boundaryLevel !== null && level === boundaryLevel) {
      current = { title: (node as HTMLElement).text.trim(), parts: [] };
      rawSections.push(current);
    } else if (current) {
      current.parts.push(outerHtmlOf(node));
    } else {
      preamble.push(outerHtmlOf(node));
    }
  }

  const sections: ParsedLegalSection[] = [];
  const usedAnchors = new Set<string>();

  const pushSection = (rawTitle: string, bodyHtml: string): void => {
    const title =
      rawTitle.replace(/\s+/g, ' ').trim().slice(0, 500) || 'Section';
    const base = slugify(title) || `section-${sections.length + 1}`;
    let anchorId = base;
    let suffix = 2;
    while (usedAnchors.has(anchorId)) {
      anchorId = `${base}-${suffix++}`;
    }
    usedAnchors.add(anchorId);

    const body = demoteBodyHeadings(bodyHtml).trim() || '<p></p>';

    sections.push({
      anchorId,
      title,
      tocLabel: title.slice(0, 200),
      content: body,
      sortOrder: sections.length,
    });
  };

  const preambleHtml = preamble.join('').trim();
  if (rawSections.length > 0) {
    if (preambleHtml) pushSection('Overview', preambleHtml);
    for (const section of rawSections) {
      pushSection(section.title, section.parts.join(''));
    }
  } else {
    const whole = nodes.map(outerHtmlOf).join('').trim();
    pushSection('Document', whole || html);
  }

  return sections.map((section, index) => ({ ...section, sortOrder: index }));
}
