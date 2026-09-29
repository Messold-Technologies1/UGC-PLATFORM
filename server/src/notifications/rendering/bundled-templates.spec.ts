import { resolveMailTemplatesDir } from '../../mail/templates-dir';
import {
  STAGE_OFFSETS,
  buildTemplates,
  listBundledKeys,
  offsetSuffix,
  readBundledTemplates,
} from './bundled-templates';

/**
 * These run against the real `.hbs` files on disk, which is the point: the
 * admin template list is empty unless this import produces rows, and a missing
 * or malformed file is exactly the failure that leaves it empty.
 */
describe('bundled-templates', () => {
  const dir = resolveMailTemplatesDir();

  // 32 keys x 3 parts = the 96 .hbs files the build asserts on.
  it('finds every template key on disk', () => {
    const keys = listBundledKeys(dir);
    expect(keys).toHaveLength(32);
    expect(keys).toContain('creator-profile-completion-reminder');
  });

  // 32 keys, with the 2 drips split into 4 and 3 stages: 30 + 4 + 3 = 37.
  it('builds a row for every key without throwing', () => {
    const templates = readBundledTemplates(dir);
    expect(templates).toHaveLength(37);
    for (const t of templates) {
      expect(t.name).not.toHaveLength(0);
      expect(t.subjectHbs).not.toHaveLength(0);
      expect(t.htmlHbs).not.toHaveLength(0);
    }
  });

  it('gives every template a unique name, so the upsert key cannot collide', () => {
    const names = readBundledTemplates(dir).map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(Object.entries(STAGE_OFFSETS))(
    'splits %s into one template per stage',
    (key, offsets) => {
      const built = buildTemplates(dir, key);
      expect(built).toHaveLength(offsets.length);
      expect(built.map((t) => t.name)).toEqual(
        offsets.map((o) => `${key}-${offsetSuffix(o)}`),
      );
      // A stage template with an empty subject is the bug that made the two
      // drips render a blank subject line, which SES rejects outright.
      for (const t of built) {
        expect(t.subjectHbs.trim()).not.toHaveLength(0);
      }
    },
  );

  it('names the drip stages the way the drips are described', () => {
    expect(offsetSuffix(30)).toBe('30m');
    expect(offsetSuffix(24 * 60)).toBe('24h');
    expect(offsetSuffix(48 * 60)).toBe('48h');
    expect(offsetSuffix(3 * 24 * 60)).toBe('3d');
    expect(offsetSuffix(7 * 24 * 60)).toBe('7d');
  });

  it('throws a named error for a key with no files, rather than a blank row', () => {
    expect(() => buildTemplates(dir, 'does-not-exist')).toThrow(
      /template files missing for does-not-exist/,
    );
  });
});
