import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveMailTemplatesDir } from '../../mail/templates-dir';
import { emailBodyImportSupport } from './email-body-import';

/**
 * Which bundled bodies the visual editor will open.
 *
 * Pinned by name rather than counted, because the failure is silent in both
 * directions: a template written with an inline conditional simply stops
 * being editable, and nobody finds out until an admin opens it and is handed
 * the HTML editor instead.
 *
 * Shrinking this list is the goal. Adding to it should be a deliberate choice
 * made in review, which is what naming them forces.
 */
describe('visual editor coverage of the bundled bodies', () => {
  const dir = resolveMailTemplatesDir();
  const keys = readdirSync(dir)
    .filter((f) => f.endsWith('.html.hbs'))
    .map((f) => f.replace('.html.hbs', ''))
    .sort();

  const support = (key: string) =>
    emailBodyImportSupport(readFileSync(join(dir, `${key}.html.hbs`), 'utf8'));

  it('names every body the editor cannot open, and why', () => {
    const blocked = keys
      .filter((key) => !support(key).supported)
      .map((key) => `${key}: ${support(key).reason ?? ''}`)
      .sort();

    expect(blocked).toEqual(
      [
        // A data table has no equivalent in the document model. Making these
        // two editable means replacing the table with ordinary blocks, which is
        // a change to how the email looks and so a separate decision.
        'order-brief-submitted-for-creator: This body uses a data table, which the visual editor cannot represent.',
        'order-refunded-for-brand: This body uses a data table, which the visual editor cannot represent.',
        // The conditional here is real — a courier may have no tracking id — and
        // it sits inside a table, so the table is the thing to remove first.
        'order-product-shipped-for-creator: This body puts a conditional inside a sentence, which the visual editor cannot represent.',
        // Its button label is built with a helper.
        'creator-profile-completion-reminder: This body builds its button label with a helper, which the visual editor cannot represent.',
      ].sort(),
    );
  });

  // The ones a dead conditional used to block. Each guard was unreachable:
  // chat resolves to nobody when nothing is unread, and both revision counts
  // are strings that are always present — "0" included, which Handlebars
  // counts as truthy.
  it.each([
    'order-chat-message-for-brand',
    'order-chat-message-for-creator',
    'order-revision-requested-for-creator',
  ])('%s opens in the visual editor', (key) => {
    expect(`${key}:${support(key).supported}`).toBe(`${key}:true`);
  });

  it('leaves most of the catalog editable', () => {
    const editable = keys.filter((key) => support(key).supported);

    expect(editable.length).toBe(keys.length - 4);
  });
});
