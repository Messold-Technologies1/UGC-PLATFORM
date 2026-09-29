import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveMailTemplatesDir } from '../../mail/templates-dir';
import { deriveText, deriveTextHbs } from './derive-text';

describe('deriveText', () => {
  it('collapses runs of blank lines', () => {
    expect(deriveText('<p>one</p><p></p><p></p><p>two</p>')).toBe('one\n\ntwo');
  });

  it('keeps a link target when the label does not already contain it', () => {
    expect(deriveText('<a href="https://x.test">Open</a>')).toBe(
      'Open (https://x.test)',
    );
  });
});

describe('deriveTextHbs', () => {
  it('leaves handlebars expressions intact, so the result is itself a template', () => {
    expect(deriveTextHbs('<p>Hi {{recipientName}}</p>')).toBe(
      'Hi {{recipientName}}',
    );
  });

  it('drops the editor comment every bundled template opens with', () => {
    const out = deriveTextHbs(
      '{{!-- context: recipientName, actionUrl --}}\n<p>Body</p>',
    );
    expect(out).toBe('Body');
  });

  it('turns the action button into the "Label: url" line the text files use', () => {
    const out = deriveTextHbs(
      '<p>Before</p>{{> actionButton url=actionUrl label="Review order →"}}<p>After</p>',
    );
    // Adjacent blocks give one newline each; blank lines come from blank
    // lines in the source markup, as they do in the bundled templates.
    expect(out).toBe('Before\nReview order: {{actionUrl}}\nAfter');
  });

  it('resolves a concat label into its literal and variable parts', () => {
    const out = deriveTextHbs(
      '{{> actionButton url=actionUrl label=(concat "Get Listed on " platformName " →")}}',
    );
    expect(out).toBe('Get Listed on {{platformName}}: {{actionUrl}}');
  });

  it('decodes entities in a label', () => {
    const out = deriveTextHbs(
      '{{> actionButton url=actionUrl label="Edit &amp; submit →"}}',
    );
    expect(out).toBe('Edit & submit: {{actionUrl}}');
  });

  it('survives an action button with no arguments rather than emitting markup', () => {
    expect(deriveTextHbs('<p>a</p>{{> actionButton }}<p>b</p>')).toBe('a\nb');
  });

  // The whole point: an admin pastes HTML and gets usable plain text back. If a
  // partial call or an editor comment leaks through, it goes out in the email.
  it('leaves no partial call or comment in any bundled template', () => {
    const dir = resolveMailTemplatesDir();
    const keys = readdirSync(dir)
      .filter((f) => f.endsWith('.html.hbs'))
      .map((f) => f.replace('.html.hbs', ''));

    expect(keys.length).toBe(32);
    for (const key of keys) {
      const out = deriveTextHbs(
        readFileSync(join(dir, `${key}.html.hbs`), 'utf8'),
      );
      expect(out).not.toContain('{{>');
      expect(out).not.toContain('{{!');
      expect(out.trim()).not.toHaveLength(0);
    }
  });
});
