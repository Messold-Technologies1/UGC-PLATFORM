import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderEmailBodyDoc } from './email-body-doc';
import {
  emailBodyImportSupport,
  importEmailBodyHtml,
} from './email-body-import';

const TEMPLATE_DIR = join(__dirname, '../../mail/templates');

const BRAND_WELCOME = readFileSync(
  join(TEMPLATE_DIR, 'brand-welcome.html.hbs'),
  'utf8',
);

/**
 * Text content, so comparisons ignore markup and whitespace.
 *
 * The source is normalised the same way the import treats it: the authoring
 * comment is not copy, and the CTA partial stands for its label — otherwise the
 * comparison would be against text no reader ever sees.
 */
const words = (html: string): string =>
  html
    .replace(/\{\{!--[\s\S]*?--\}\}/g, ' ')
    .replace(/\{\{>\s*actionButton[^}]*label="([^"]*)"[^}]*\}\}/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

describe('importEmailBodyHtml', () => {
  describe('on the shipped brand-welcome body', () => {
    const doc = importEmailBodyHtml(BRAND_WELCOME);
    const types = (doc.content ?? []).map((n) => n.type);

    it('recognises each block for what it is', () => {
      expect(types).toEqual([
        'paragraph', // Hi {{recipientName}}
        'heading', // You're in...
        'paragraph', // Welcome to ...
        'callout', // Why finish your profile?
        'button', // Complete my brand profile
        'paragraph', // Two minutes now...
        'paragraph', // — The team
      ]);
    });

    it('keeps the greeting as a lead and the headline as a heading', () => {
      expect(doc.content?.[0]).toMatchObject({ attrs: { variant: 'lead' } });
      expect(doc.content?.[1]).toMatchObject({ attrs: { level: 1 } });
    });

    it('reads the callout tone from its tint', () => {
      expect(doc.content?.[3]).toMatchObject({ attrs: { tone: 'info' } });
    });

    it('turns the actionButton partial into a button with its variable url', () => {
      expect(doc.content?.[4]).toMatchObject({
        type: 'button',
        attrs: { url: '{{actionUrl}}', label: 'Complete my brand profile →' },
      });
    });

    it('carries variables through as atoms, not as typed braces', () => {
      const first = doc.content?.[0] as { content?: Array<{ type: string }> };
      expect(first.content?.map((n) => n.type)).toContain('variable');
    });

    it('round-trips: re-rendering says the same thing as the original', () => {
      expect(words(renderEmailBodyDoc(doc))).toBe(words(BRAND_WELCOME));
    });
  });

  /**
   * The import is only worth having if it handles the real corpus, so every
   * bundled body goes through it. The ones it declines are declined on purpose
   * — a conditional or a data table cannot be a document — and the point of
   * asserting both halves is that the line between them is deliberate rather
   * than wherever the parser happens to give up.
   */
  describe('across every bundled template', () => {
    const files = readdirSync(TEMPLATE_DIR).filter((f) =>
      f.endsWith('.html.hbs'),
    );
    const read = (f: string) => readFileSync(join(TEMPLATE_DIR, f), 'utf8');
    const supported = files.filter(
      (f) => emailBodyImportSupport(read(f)).supported,
    );
    const declined = files.filter(
      (f) => !emailBodyImportSupport(read(f)).supported,
    );

    it('covers the whole set', () => {
      expect(files.length).toBeGreaterThanOrEqual(30);
      expect(supported.length + declined.length).toBe(files.length);
      // Enough of the corpus to be useful, or this feature is not earning its
      // keep; the rest are the conditional and table bodies.
      expect(supported.length).toBeGreaterThanOrEqual(13);
    });

    it.each(supported)(
      '%s survives import and re-render with its wording intact',
      (file) => {
        expect(words(renderEmailBodyDoc(importEmailBodyHtml(read(file))))).toBe(
          words(read(file)),
        );
      },
    );

    it.each(declined)(
      '%s is declined with a reason, not silently mangled',
      (file) => {
        const { supported: ok, reason } = emailBodyImportSupport(read(file));
        expect(ok).toBe(false);
        expect(reason).toMatch(/conditional|data table/);
      },
    );
  });

  describe('emailBodyImportSupport', () => {
    it('declines a body with a conditional', () => {
      expect(
        emailBodyImportSupport('{{#if actionUrl}}<p>Hi</p>{{/if}}'),
      ).toMatchObject({ supported: false });
    });

    it('declines a body with a data table', () => {
      expect(
        emailBodyImportSupport('<table><tr><td>Order</td></tr></table>'),
      ).toMatchObject({ supported: false });
    });

    it('accepts the CTA partial, which only becomes a table once rendered', () => {
      expect(
        emailBodyImportSupport(
          '<p>Hi</p><div>{{> actionButton url=actionUrl label="Go"}}</div>',
        ).supported,
      ).toBe(true);
    });
  });

  it('drops the authoring comment rather than importing it as copy', () => {
    const doc = importEmailBodyHtml(
      '{{!-- context: a, b --}}\n<p style="font-size:16px;">Hello</p>',
    );
    expect(words(renderEmailBodyDoc(doc))).toBe('Hello');
  });

  it('falls back to one empty paragraph for an empty body', () => {
    expect(importEmailBodyHtml('   ')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });
});
