import { PreviewVideoService } from './preview-video.service';

describe('PreviewVideoService', () => {
  function build(overrides?: {
    introVideoKey?: string | null;
    previewVideoKey?: string | null;
    previewVideoSourceKey?: string | null;
    newestPortfolioKey?: string | null;
  }) {
    const profileRow = {
      id: 'creator-1',
      introVideoKey: overrides?.introVideoKey ?? null,
      previewVideoKey: overrides?.previewVideoKey ?? null,
      previewVideoSourceKey: overrides?.previewVideoSourceKey ?? null,
    };
    const prismaMock = {
      creatorProfile: {
        findUnique: jest.fn().mockResolvedValue(profileRow),
        update: jest.fn().mockResolvedValue(profileRow),
      },
      creatorPortfolioVideo: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            overrides?.newestPortfolioKey
              ? { videoKey: overrides.newestPortfolioKey }
              : null,
          ),
      },
    };
    const storageMock = {
      getObjectBuffer: jest.fn().mockResolvedValue(Buffer.from('x')),
      putObjectBuffer: jest.fn().mockResolvedValue('k'),
      buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
      deleteObjectIfExists: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PreviewVideoService(
      prismaMock as never,
      storageMock as never,
    );
    return { service, prismaMock, storageMock };
  }

  describe('resolveSourceKey', () => {
    it('prefers the intro video key when present', async () => {
      const { service, prismaMock } = build({
        introVideoKey: 'creator-profile/c/intro/a.mp4',
        newestPortfolioKey: 'creator-portfolio/c/videos/b.mp4',
      });
      await expect(service.resolveSourceKey('creator-1')).resolves.toBe(
        'creator-profile/c/intro/a.mp4',
      );
      // With an intro present it should not even look at the portfolio.
      expect(prismaMock.creatorPortfolioVideo.findFirst).not.toHaveBeenCalled();
    });

    it('falls back to the newest keyed portfolio video when there is no intro', async () => {
      const { service } = build({
        introVideoKey: null,
        newestPortfolioKey: 'creator-portfolio/c/videos/b.mp4',
      });
      await expect(service.resolveSourceKey('creator-1')).resolves.toBe(
        'creator-portfolio/c/videos/b.mp4',
      );
    });

    it('returns null when the creator has no eligible source video', async () => {
      const { service } = build({
        introVideoKey: null,
        newestPortfolioKey: null,
      });
      await expect(service.resolveSourceKey('creator-1')).resolves.toBeNull();
    });
  });

  describe('generateForCreator', () => {
    it('clears a stale rendition when there is no source video', async () => {
      const { service, prismaMock, storageMock } = build({
        introVideoKey: null,
        newestPortfolioKey: null,
        previewVideoKey: 'creator-profile/c/preview/old.mp4',
      });

      await service.generateForCreator('creator-1');

      expect(storageMock.getObjectBuffer).not.toHaveBeenCalled();
      expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previewVideoKey: null,
            previewVideoUrl: null,
            previewVideoSourceKey: null,
            previewVideoStatus: 'ready',
          }),
        }),
      );
      // The superseded object is cleaned up.
      expect(storageMock.deleteObjectIfExists).toHaveBeenCalledWith(
        'creator-profile/c/preview/old.mp4',
      );
    });

    it('is a no-op encode when the source has not changed', async () => {
      const { service, prismaMock, storageMock } = build({
        introVideoKey: 'creator-profile/c/intro/a.mp4',
        previewVideoSourceKey: 'creator-profile/c/intro/a.mp4',
        previewVideoKey: 'creator-profile/c/preview/current.mp4',
      });

      await service.generateForCreator('creator-1');

      // No download / encode / upload — just a status refresh.
      expect(storageMock.getObjectBuffer).not.toHaveBeenCalled();
      expect(storageMock.putObjectBuffer).not.toHaveBeenCalled();
      expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ previewVideoStatus: 'ready' }),
        }),
      );
    });
  });
});
