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

    expect(blocked).toEqual([
      // The last one, and a different problem from the rest: its button label
      // is built with a helper rather than being a plain string.
      'creator-profile-completion-reminder: This body builds its button label with a helper, which the visual editor cannot represent.',
    ]);
  });

  // The six that could not be opened before.
  //
  // Three were blocked by a guard that was never false: chat resolves to
  // nobody when nothing is unread, and both revision counts are strings that
  // are always present — "0" included, which Handlebars counts as truthy.
  //
  // Three were blocked by a data table, now written as a bordered block of
  // lines. The shipment notice needed both: its tracking row was genuinely
  // optional, so the resolver supplies a dash and the template prints it
  // unconditionally.
  it.each([
    'order-chat-message-for-brand',
    'order-chat-message-for-creator',
    'order-revision-requested-for-creator',
    'order-product-shipped-for-creator',
    'order-refunded-for-brand',
    'order-brief-submitted-for-creator',
  ])('%s opens in the visual editor', (key) => {
    expect(`${key}:${support(key).supported}`).toBe(`${key}:true`);
  });

  it('leaves all but one of the catalog editable', () => {
    const editable = keys.filter((key) => support(key).supported);

    expect(editable.length).toBe(keys.length - 1);
  });
});
