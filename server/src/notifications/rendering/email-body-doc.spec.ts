import {
  EmailBodyDocError,
  escapeText,
  renderEmailBodyDoc,
} from './email-body-doc';
import { CALLOUT_TONES, EMAIL_PALETTE } from './email-body-styles';

const p = (text: string, variant?: string) => ({
  type: 'paragraph',
  ...(variant ? { attrs: { variant } } : {}),
  content: [{ type: 'text', text }],
});

describe('renderEmailBodyDoc', () => {
  it('rejects anything that is not an editor document', () => {
    for (const bad of [null, undefined, {}, { type: 'paragraph' }, 'doc']) {
      expect(() => renderEmailBodyDoc(bad)).toThrow(EmailBodyDocError);
    }
  });

  it('gives each block role its own fixed style', () => {
    const html = renderEmailBodyDoc({
      type: 'doc',
      content: [
        p('Hi there', 'lead'),
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Big' }],
        },
        p('Ordinary copy'),
        p('Quieter', 'note'),
      ],
    });

    expect(html).toContain(
      `font-size:15px;line-height:1.5;color:${EMAIL_PALETTE.muted}`,
    );
    expect(html).toContain('font-size:26px;font-weight:800');
    expect(html).toContain(
      `font-size:16px;line-height:1.6;color:${EMAIL_PALETTE.body}`,
    );
    // Headings render as <p>: Outlook applies its own margins to <h1>.
    expect(html).not.toContain('<h1');
  });

  describe('variables', () => {
    it('renders a variable node back to its Handlebars expression', () => {
      const html = renderEmailBodyDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hi ' },
              { type: 'variable', attrs: { name: 'recipientName' } },
              { type: 'text', text: ', welcome' },
            ],
          },
        ],
      });
      expect(html).toContain('Hi {{recipientName}}, welcome');
    });

    it('refuses a variable name that is not an identifier', () => {
      expect(() =>
        renderEmailBodyDoc({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'variable', attrs: { name: 'a}}{{b' } }],
            },
          ],
        }),
      ).toThrow(EmailBodyDocError);
    });

    it('escapes prose but leaves an inline expression intact', () => {
      // Escaping the braces would print them literally in the delivered email.
      expect(escapeText('5 < 6 & {{brandName}} > 4')).toBe(
        '5 &lt; 6 &amp; {{brandName}} &gt; 4',
      );
    });
  });

  describe('links', () => {
    it('keeps http, mailto and variable hrefs', () => {
      for (const href of [
        'https://x.example',
        'mailto:a@b.co',
        '{{actionUrl}}',
      ]) {
        const html = renderEmailBodyDoc({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'go',
                  marks: [{ type: 'link', attrs: { href } }],
                },
              ],
            },
          ],
        });
        expect(html).toContain(`href="${href}"`);
      }
    });

    it('refuses a javascript: href', () => {
      expect(() =>
        renderEmailBodyDoc({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'tap',
                  // eslint-disable-next-line no-script-url
                  marks: [
                    { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                  ],
                },
              ],
            },
          ],
        }),
      ).toThrow(EmailBodyDocError);
    });
  });

  describe('callout', () => {
    it('uses the tone tint and treats the first of several lines as the label', () => {
      const html = renderEmailBodyDoc({
        type: 'doc',
        content: [
          {
            type: 'callout',
            attrs: { tone: 'info' },
            content: [
              p('Why finish your profile?'),
              p('Creators decide in seconds.'),
            ],
          },
        ],
      });

      expect(html).toContain(`background:${CALLOUT_TONES.info}`);
      expect(html).toContain('font-weight:700;">Why finish your profile?');
      expect(html).toContain('Creators decide in seconds.');
    });

    it('falls back to the neutral tint for an unknown tone', () => {
      const html = renderEmailBodyDoc({
        type: 'doc',
        content: [
          { type: 'callout', attrs: { tone: 'chartreuse' }, content: [p('x')] },
        ],
      });
      expect(html).toContain(`background:${CALLOUT_TONES.neutral}`);
    });
  });

  describe('button', () => {
    it('renders the bulletproof table with the colour on both cell and link', () => {
      const html = renderEmailBodyDoc({
        type: 'doc',
        content: [
          {
            type: 'button',
            attrs: {
              url: '{{actionUrl}}',
              label: 'Complete my brand profile →',
            },
          },
        ],
      });

      expect(html).toContain('role="presentation"');
      expect(html).toContain(`bgcolor="${EMAIL_PALETTE.accent}"`);
      expect(html).toContain('Complete my brand profile →');
    });

    it('refuses to render a button with no link', () => {
      expect(() =>
        renderEmailBodyDoc({
          type: 'doc',
          content: [{ type: 'button', attrs: { label: 'Go' } }],
        }),
      ).toThrow(EmailBodyDocError);
    });
  });

  it('flattens list items so the paragraph margin cannot double-space them', () => {
    const html = renderEmailBodyDoc({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [p('one')] },
            { type: 'listItem', content: [p('two')] },
          ],
        },
      ],
    });

    expect(html).toContain('<li style="margin:0 0 6px;">one</li>');
    expect(html).not.toContain('<li style="margin:0 0 6px;"><p');
  });

  it('drops a node type it does not know rather than emitting raw markup', () => {
    const html = renderEmailBodyDoc({
      type: 'doc',
      content: [
        { type: 'iframe', attrs: { src: 'https://evil.example' } },
        p('kept'),
      ],
    });
    expect(html).not.toContain('iframe');
    expect(html).toContain('kept');
  });
});
