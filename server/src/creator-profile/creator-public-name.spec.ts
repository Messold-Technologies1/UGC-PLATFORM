import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatorProfileService } from './creator-profile.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  allocateUniqueCreatorPublicNameSlug,
  slugifyCreatorPublicName,
} from './creator-public-slug.util';

/**
 * Admin-chosen name reveal.
 *
 * Creators are anonymous by default — an opaque slug in the URL and a
 * niche-derived headline. An admin can reveal one creator's real name, which
 * changes their PUBLIC PAGE ONLY: the name becomes the headline and the URL
 * segment. Orders, chat and the brand browse drawer stay anonymous.
 */
describe('creator public name reveal', () => {
  describe('slugifyCreatorPublicName', () => {
    it('turns a name into a URL segment', () => {
      expect(slugifyCreatorPublicName('Riya Sharma')).toBe('riya-sharma');
    });

    it('collapses punctuation and extra whitespace', () => {
      expect(slugifyCreatorPublicName("  D'Souza,   Ann-Marie  ")).toBe(
        'd-souza-ann-marie',
      );
    });

    it('strips accents rather than dropping the letters', () => {
      expect(slugifyCreatorPublicName('Zoë Álvarez')).toBe('zoe-alvarez');
    });

    it('returns empty for a name with nothing sluggable', () => {
      expect(slugifyCreatorPublicName('***')).toBe('');
    });

    it('never leaves a trailing hyphen after truncation', () => {
      const slug = slugifyCreatorPublicName(`${'a'.repeat(60)} Sharma`);
      expect(slug).not.toMatch(/-$/);
      expect(slug.length).toBeLessThanOrEqual(60);
    });
  });

  describe('allocateUniqueCreatorPublicNameSlug', () => {
    const makeClient = (taken: Set<string>) => ({
      creatorProfile: {
        findFirst: jest.fn(async ({ where }: any) => {
          const candidates = where.OR.map(
            (clause: Record<string, string>) =>
              clause.publicSlug ?? clause.publicNameSlug,
          );
          return candidates.some((candidate: string) => taken.has(candidate))
            ? { id: 'other' }
            : null;
        }),
      },
    });

    it('uses the plain slug when it is free', async () => {
      await expect(
        allocateUniqueCreatorPublicNameSlug(
          makeClient(new Set()) as any,
          'Riya Sharma',
        ),
      ).resolves.toBe('riya-sharma');
    });

    it('suffixes on collision with another creator', async () => {
      await expect(
        allocateUniqueCreatorPublicNameSlug(
          makeClient(new Set(['riya-sharma'])) as any,
          'Riya Sharma',
        ),
      ).resolves.toBe('riya-sharma-2');
    });

    it('checks the opaque slug column too, so a name can never shadow one', async () => {
      const client = makeClient(new Set());
      await allocateUniqueCreatorPublicNameSlug(client as any, 'Riya Sharma');
      expect(client.creatorProfile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { publicSlug: 'riya-sharma' },
              { publicNameSlug: 'riya-sharma' },
            ],
          }),
        }),
      );
    });

    it('skips reserved route segments', async () => {
      await expect(
        allocateUniqueCreatorPublicNameSlug(
          makeClient(new Set()) as any,
          'Admin',
        ),
      ).resolves.toBe('admin-2');
    });

    it('returns null when the name has no sluggable characters', async () => {
      await expect(
        allocateUniqueCreatorPublicNameSlug(makeClient(new Set()) as any, '!!'),
      ).resolves.toBeNull();
    });
  });

  describe('CreatorProfileService', () => {
    let prismaMock: {
      creatorProfile: {
        findUnique: jest.Mock;
        findFirst: jest.Mock;
        update: jest.Mock;
      };
    };
    let service: CreatorProfileService;

    beforeEach(() => {
      prismaMock = {
        creatorProfile: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
      };
      service = new CreatorProfileService(
        prismaMock as unknown as PrismaService,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
    });

    describe('setCreatorPublicNameRevealed', () => {
      const profile = (over = {}) => ({
        id: 'creator-1',
        publicSlug: 'k7m2p9qx',
        displayName: 'Riya Sharma',
        ...over,
      });

      it("mints the URL from the creator's own name", async () => {
        prismaMock.creatorProfile.findUnique.mockResolvedValue(profile());
        prismaMock.creatorProfile.findFirst.mockResolvedValue(null);
        prismaMock.creatorProfile.update.mockImplementation(
          async ({ data }: any) => ({ ...profile(), ...data }),
        );

        const result = await service.setCreatorPublicNameRevealed(
          'creator-1',
          true,
        );

        expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'creator-1' },
            data: { publicNameSlug: 'riya-sharma' },
          }),
        );
        expect(result.publicNameRevealed).toBe(true);
        expect(result.publicDisplayName).toBe('Riya Sharma');
        expect(result.canonicalSlug).toBe('riya-sharma');
        // The opaque slug is never rewritten, so links already shared still
        // resolve (and redirect to the name URL).
        expect(result.publicSlug).toBe('k7m2p9qx');
      });

      it('clears only the slug when hidden, back to anonymous', async () => {
        prismaMock.creatorProfile.findUnique.mockResolvedValue(profile());
        prismaMock.creatorProfile.update.mockResolvedValue({ id: 'creator-1' });

        const result = await service.setCreatorPublicNameRevealed(
          'creator-1',
          false,
        );

        expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { publicNameSlug: null } }),
        );
        expect(result.publicNameRevealed).toBe(false);
        expect(result.publicDisplayName).toBeNull();
        expect(result.canonicalSlug).toBe('k7m2p9qx');
      });

      it('gives a second creator with the same name its own URL', async () => {
        // Two real "Riya Sharma"s: the first keeps /riya-sharma, the second
        // gets /riya-sharma-2. Both pages are reachable and distinct.
        prismaMock.creatorProfile.findUnique.mockResolvedValue(
          profile({ id: 'creator-2', publicSlug: 'b4t8w1zr' }),
        );
        prismaMock.creatorProfile.findFirst
          // riya-sharma is already creator-1's
          .mockResolvedValueOnce({ id: 'creator-1' })
          .mockResolvedValueOnce(null);
        prismaMock.creatorProfile.update.mockImplementation(
          async ({ data }: any) => ({
            ...profile({ id: 'creator-2', publicSlug: 'b4t8w1zr' }),
            ...data,
          }),
        );

        const result = await service.setCreatorPublicNameRevealed(
          'creator-2',
          true,
        );

        expect(result.publicNameSlug).toBe('riya-sharma-2');
        expect(result.publicNameShared).toBe(true);
      });

      it('re-revealing does not grow another suffix', async () => {
        prismaMock.creatorProfile.findUnique.mockResolvedValue(profile());
        prismaMock.creatorProfile.findFirst.mockResolvedValue(null);
        prismaMock.creatorProfile.update.mockImplementation(
          async ({ data }: any) => ({ ...profile(), ...data }),
        );

        const result = await service.setCreatorPublicNameRevealed(
          'creator-1',
          true,
        );

        expect(result.publicNameSlug).toBe('riya-sharma');
        expect(result.publicNameShared).toBe(false);
        // The uniqueness check excludes the creator being edited.
        expect(prismaMock.creatorProfile.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ NOT: { id: 'creator-1' } }),
          }),
        );
      });

      it('refuses a profile name with no URL in it', async () => {
        prismaMock.creatorProfile.findUnique.mockResolvedValue(
          profile({ displayName: '###' }),
        );

        await expect(
          service.setCreatorPublicNameRevealed('creator-1', true),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prismaMock.creatorProfile.update).not.toHaveBeenCalled();
      });

      it('404s for an unknown creator', async () => {
        prismaMock.creatorProfile.findUnique.mockResolvedValue(null);

        await expect(
          service.setCreatorPublicNameRevealed('nope', true),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe('getCreatorByPublicSlug', () => {
      beforeEach(() => {
        jest.spyOn(service, 'getCreatorById').mockResolvedValue({
          id: 'creator-1',
          displayName: 'k7m2p9qx',
        } as any);
      });

      it('resolves either slug column', async () => {
        prismaMock.creatorProfile.findFirst.mockResolvedValue({
          id: 'creator-1',
          displayName: 'Riya Sharma',
          publicNameSlug: null,
        });

        await service.getCreatorByPublicSlug(null, 'K7M2P9QX');

        expect(prismaMock.creatorProfile.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              OR: [{ publicNameSlug: 'k7m2p9qx' }, { publicSlug: 'k7m2p9qx' }],
            },
          }),
        );
      });

      it('attaches the revealed name and its canonical slug', async () => {
        prismaMock.creatorProfile.findFirst.mockResolvedValue({
          id: 'creator-1',
          displayName: 'Riya Sharma',
          publicNameSlug: 'riya-sharma',
        });

        const dto = await service.getCreatorByPublicSlug(null, 'k7m2p9qx');

        expect(dto.publicDisplayName).toBe('Riya Sharma');
        expect(dto.publicNameSlug).toBe('riya-sharma');
      });

      it('withholds the name until an admin reveals it', async () => {
        // displayName is right there in the row — it must not reach the
        // public page while publicNameSlug is null.
        prismaMock.creatorProfile.findFirst.mockResolvedValue({
          id: 'creator-1',
          displayName: 'Riya Sharma',
          publicNameSlug: null,
        });

        const dto = await service.getCreatorByPublicSlug(null, 'k7m2p9qx');

        expect(dto.publicDisplayName).toBeNull();
        expect(dto.publicNameSlug).toBeNull();
      });

      it('404s for an unknown slug', async () => {
        prismaMock.creatorProfile.findFirst.mockResolvedValue(null);

        await expect(
          service.getCreatorByPublicSlug(null, 'nothing'),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('keeps the revealed name out of displayName', async () => {
        // `displayName` is what brands read (browse cards, order snapshots,
        // chat). Redaction sets it to the opaque slug, and revealing a name
        // must not change that — the name rides on its own field, which only
        // the public page reads.
        prismaMock.creatorProfile.findFirst.mockResolvedValue({
          id: 'creator-1',
          displayName: 'Riya Sharma',
          publicNameSlug: 'riya-sharma',
        });

        const dto = await service.getCreatorByPublicSlug(null, 'riya-sharma');

        expect(dto.displayName).toBe('k7m2p9qx');
      });
    });
  });
});
