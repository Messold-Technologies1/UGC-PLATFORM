import {
  allocateUniqueCreatorPublicSlug,
  deriveCreatorPublicSlugBase,
  normalizeCreatorPublicProfileSlug,
} from './creator-public-slug.util';

describe('creator-public-slug.util', () => {
  describe('normalizeCreatorPublicProfileSlug', () => {
    it('lowercases and removes spaces', () => {
      expect(normalizeCreatorPublicProfileSlug('Riya Sharma')).toBe('riyasharma');
    });

    it('preserves hyphen suffixes', () => {
      expect(normalizeCreatorPublicProfileSlug('riya-4821')).toBe('riya-4821');
    });
  });

  describe('deriveCreatorPublicSlugBase', () => {
    it('falls back to creator when display name normalizes to empty', () => {
      expect(deriveCreatorPublicSlugBase('   ')).toBe('creator');
    });
  });

  describe('allocateUniqueCreatorPublicSlug', () => {
    const makeClient = (
      taken: Set<string>,
    ): Parameters<typeof allocateUniqueCreatorPublicSlug>[0] => ({
      creatorProfile: {
        findFirst: async ({ where }) =>
          taken.has(where.publicSlug) ? { id: 'other' } : null,
      },
    });

    it('returns base slug when available', async () => {
      const slug = await allocateUniqueCreatorPublicSlug(
        makeClient(new Set()),
        'Jane Doe',
      );
      expect(slug).toBe('janedoe');
    });

    it('appends numeric suffix when base is taken', async () => {
      const slug = await allocateUniqueCreatorPublicSlug(
        makeClient(new Set(['janedoe'])),
        'Jane Doe',
      );
      expect(slug).toMatch(/^janedoe-\d{4}$/);
    });
  });
});
