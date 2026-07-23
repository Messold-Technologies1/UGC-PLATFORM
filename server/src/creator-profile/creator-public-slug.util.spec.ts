import {
  allocateUniqueCreatorPublicSlug,
  generateCreatorPublicSlug,
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

  describe('generateCreatorPublicSlug', () => {
    it('returns an 8-char token from the unambiguous alphabet only', () => {
      for (let i = 0; i < 50; i++) {
        expect(generateCreatorPublicSlug()).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{8}$/);
      }
    });

    it('does not derive from any input (no name leakage)', () => {
      // The generator takes no arguments — nothing about a creator can shape it.
      expect(generateCreatorPublicSlug.length).toBe(0);
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

    it('returns an opaque 8-char token', async () => {
      const slug = await allocateUniqueCreatorPublicSlug(makeClient(new Set()));
      expect(slug).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{8}$/);
    });

    it('retries past collisions and still returns a unique token', async () => {
      // Everything is "taken" for the first few checks, forcing retries; the
      // client only reports the first candidate as free after some attempts.
      let calls = 0;
      const client: Parameters<typeof allocateUniqueCreatorPublicSlug>[0] = {
        creatorProfile: {
          findFirst: async () => {
            calls += 1;
            return calls <= 3 ? { id: 'other' } : null;
          },
        },
      };
      const slug = await allocateUniqueCreatorPublicSlug(client);
      expect(slug).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{8}$/);
      expect(calls).toBeGreaterThan(3);
    });
  });
});
