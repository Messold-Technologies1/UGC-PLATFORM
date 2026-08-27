import {
  InstagramMirrorService,
  MirrorRejectedError,
  assertMetaCdnUrl,
} from './instagram-mirror.service';

describe('assertMetaCdnUrl', () => {
  it('accepts Instagram and Facebook CDN hosts', () => {
    expect(
      assertMetaCdnUrl('https://scontent-lhr8-1.cdninstagram.com/v/t50/x.mp4')
        .hostname,
    ).toBe('scontent-lhr8-1.cdninstagram.com');
    expect(
      assertMetaCdnUrl('https://video-lhr6-2.xx.fbcdn.net/v/t42/y.mp4')
        .hostname,
    ).toBe('video-lhr6-2.xx.fbcdn.net');
  });

  it('refuses a URL with no value at all', () => {
    expect(() => assertMetaCdnUrl(null)).toThrow(MirrorRejectedError);
    expect(() => assertMetaCdnUrl('')).toThrow(MirrorRejectedError);
  });

  it('refuses plain http, so the fetch cannot be downgraded', () => {
    expect(() =>
      assertMetaCdnUrl('http://scontent.cdninstagram.com/x.mp4'),
    ).toThrow(/non-https/);
  });

  it('refuses an internal address', () => {
    for (const url of [
      'https://localhost/x.mp4',
      'https://127.0.0.1/x.mp4',
      'https://169.254.169.254/latest/meta-data/',
      'https://10.0.0.5/x.mp4',
    ]) {
      expect(() => assertMetaCdnUrl(url)).toThrow(/unexpected host/);
    }
  });

  it('is not fooled by a lookalike host that merely contains the suffix', () => {
    // The check is a suffix match on the hostname, so an attacker-controlled
    // domain that only embeds the string must still be refused.
    expect(() =>
      assertMetaCdnUrl('https://cdninstagram.com.evil.example/x.mp4'),
    ).toThrow(/unexpected host/);
    expect(() => assertMetaCdnUrl('https://notcdninstagram.com/x.mp4')).toThrow(
      /unexpected host/,
    );
  });

  it('refuses a non-URL string', () => {
    expect(() => assertMetaCdnUrl('not a url')).toThrow(/not a valid URL/);
  });
});

describe('InstagramMirrorService mirror claim', () => {
  const videoId = 'video-1';

  let prisma: {
    $queryRaw: jest.Mock;
    creatorPortfolioVideo: { findMany: jest.Mock; update: jest.Mock };
  };
  let configValues: Record<string, unknown>;
  let service: InstagramMirrorService;

  beforeEach(() => {
    configValues = {};
    prisma = {
      $queryRaw: jest.fn(),
      creatorPortfolioVideo: { findMany: jest.fn(), update: jest.fn() },
    };
    service = new InstagramMirrorService(
      prisma as never,
      {
        get: jest.fn(
          (key: string, fallback?: unknown) => configValues[key] ?? fallback,
        ),
      } as never,
      {} as never,
      {} as never,
      { emitVideoAssetUpdated: jest.fn() } as never,
    );
  });

  describe('claimForMirror', () => {
    it('returns the new attempt count when the claim is won', async () => {
      prisma.$queryRaw.mockResolvedValue([{ mirrorAttempts: 1 }]);

      await expect(service.claimForMirror(videoId)).resolves.toBe(1);
    });

    it('returns null when another owner holds it', async () => {
      // The conditional UPDATE matched no row: someone else claimed it, it is
      // no longer PROCESSING, or the budget is spent. All mean "stand down".
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.claimForMirror(videoId)).resolves.toBeNull();
    });
  });

  describe('listStuckMirrorIds', () => {
    it('looks for PROCESSING imports with no claim or a stale one', async () => {
      prisma.creatorPortfolioVideo.findMany.mockResolvedValue([
        { id: 'a', mirrorAttempts: 1 },
      ]);

      await expect(service.listStuckMirrorIds()).resolves.toEqual(['a']);

      const { where } = prisma.creatorPortfolioVideo.findMany.mock.calls[0]![0];
      expect(where.assetState).toBe('PROCESSING');
      expect(where.source).toBe('INSTAGRAM');
      expect(where.OR).toEqual([
        { mirrorClaimedAt: null },
        { mirrorClaimedAt: { lte: expect.any(Date) } },
      ]);
    });

    it('honours a configured stale window', async () => {
      configValues.IG_MIRROR_STALE_CLAIM_MS = 120_000;
      prisma.creatorPortfolioVideo.findMany.mockResolvedValue([]);

      await service.listStuckMirrorIds();

      const { where } = prisma.creatorPortfolioVideo.findMany.mock.calls[0]![0];
      const cutoff = where.OR[1].mirrorClaimedAt.lte as Date;
      expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(119_000);
      expect(Date.now() - cutoff.getTime()).toBeLessThan(180_000);
    });

    it('refuses a stale window shorter than a minute', async () => {
      // A short window would let the scan steal a claim from a mirror that is
      // simply taking a while, and re-download the same reel alongside it.
      configValues.IG_MIRROR_STALE_CLAIM_MS = 1_000;
      prisma.creatorPortfolioVideo.findMany.mockResolvedValue([]);

      await service.listStuckMirrorIds();

      const { where } = prisma.creatorPortfolioVideo.findMany.mock.calls[0]![0];
      const cutoff = where.OR[1].mirrorClaimedAt.lte as Date;
      expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(59_000);
    });
  });

  describe('parkExhaustedMirrors', () => {
    it('parks only rows at or past the attempt budget', async () => {
      configValues.IG_MIRROR_MAX_ATTEMPTS = 4;
      prisma.creatorPortfolioVideo.findMany.mockResolvedValue([{ id: 'a' }]);
      prisma.creatorPortfolioVideo.update.mockResolvedValue({
        creatorId: 'profile-1',
      });

      await expect(service.parkExhaustedMirrors()).resolves.toBe(1);

      const { where } = prisma.creatorPortfolioVideo.findMany.mock.calls[0]![0];
      expect(where.mirrorAttempts).toEqual({ gte: 4 });
      expect(prisma.creatorPortfolioVideo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a' },
          data: { assetState: 'FAILED' },
        }),
      );
    });
  });
});
