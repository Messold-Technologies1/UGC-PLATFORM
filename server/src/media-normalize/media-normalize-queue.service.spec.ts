import { MediaNormalizeQueueService } from './media-normalize-queue.service';

/**
 * Edge cases for the inline path (no REDIS_URL): the per-table claim lock,
 * failed-vs-dead bookkeeping, and the enabled flag, for both media kinds.
 */
describe('MediaNormalizeQueueService (inline path)', () => {
  function build(opts?: {
    enabled?: boolean;
    maxAttempts?: number;
    claimAttempts?: number | null;
  }) {
    const configValues: Record<string, string> = {
      MEDIA_NORMALIZE_ENABLED: opts?.enabled === false ? 'false' : 'true',
      MEDIA_NORMALIZE_MAX_ATTEMPTS: String(opts?.maxAttempts ?? 5),
    };
    const configMock = {
      get: jest.fn(
        (key: string, fallback?: unknown) => configValues[key] ?? fallback,
      ),
    };
    const normalizeMock = {
      normalizePortfolioVideo: jest.fn().mockResolvedValue(undefined),
      normalizeIntroVideo: jest.fn().mockResolvedValue(undefined),
    };
    const n = opts?.claimAttempts === undefined ? 1 : opts.claimAttempts;
    const prismaMock = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue(
          n === null
            ? []
            : [{ videoNormalizeAttempts: n, introVideoNormalizeAttempts: n }],
        ),
      creatorPortfolioVideo: { update: jest.fn().mockResolvedValue({}) },
      creatorProfile: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new MediaNormalizeQueueService(
      configMock as never,
      normalizeMock as never,
      prismaMock as never,
    );
    return { service, normalizeMock, prismaMock };
  }

  it('no-ops when the claim is not won', async () => {
    const { service, normalizeMock } = build({ claimAttempts: null });
    await service.processDirect('portfolio', 'v1', 'test');
    expect(normalizeMock.normalizePortfolioVideo).not.toHaveBeenCalled();
  });

  it('normalizes a portfolio video when the claim is won', async () => {
    const { service, normalizeMock } = build({ claimAttempts: 1 });
    await service.processDirect('portfolio', 'v1', 'test');
    expect(normalizeMock.normalizePortfolioVideo).toHaveBeenCalledWith('v1');
    expect(normalizeMock.normalizeIntroVideo).not.toHaveBeenCalled();
  });

  it('normalizes an intro video for the intro kind', async () => {
    const { service, normalizeMock } = build({ claimAttempts: 1 });
    await service.processDirect('intro', 'c1', 'test');
    expect(normalizeMock.normalizeIntroVideo).toHaveBeenCalledWith('c1');
    expect(normalizeMock.normalizePortfolioVideo).not.toHaveBeenCalled();
  });

  it('marks a portfolio row failed (not dead) under the attempt budget', async () => {
    const { service, normalizeMock, prismaMock } = build({
      claimAttempts: 2,
      maxAttempts: 5,
    });
    normalizeMock.normalizePortfolioVideo.mockRejectedValueOnce(
      new Error('ffmpeg boom'),
    );
    await expect(
      service.processDirect('portfolio', 'v1', 'test'),
    ).rejects.toThrow('ffmpeg boom');
    const statuses = prismaMock.creatorPortfolioVideo.update.mock.calls.map(
      (c: any) => c[0].data.videoNormalizeStatus,
    );
    expect(statuses).toContain('failed');
    expect(statuses).not.toContain('dead');
  });

  it('parks a portfolio row dead once the budget is exhausted', async () => {
    const { service, normalizeMock, prismaMock } = build({
      claimAttempts: 5,
      maxAttempts: 5,
    });
    normalizeMock.normalizePortfolioVideo.mockRejectedValueOnce(
      new Error('ffmpeg boom'),
    );
    await expect(
      service.processDirect('portfolio', 'v1', 'test'),
    ).rejects.toThrow('ffmpeg boom');
    const statuses = prismaMock.creatorPortfolioVideo.update.mock.calls.map(
      (c: any) => c[0].data.videoNormalizeStatus,
    );
    expect(statuses).toContain('failed');
    expect(statuses).toContain('dead');
  });

  it('marks the intro on the profile row when an intro job fails', async () => {
    const { service, normalizeMock, prismaMock } = build({
      claimAttempts: 5,
      maxAttempts: 5,
    });
    normalizeMock.normalizeIntroVideo.mockRejectedValueOnce(
      new Error('ffmpeg boom'),
    );
    await expect(service.processDirect('intro', 'c1', 'test')).rejects.toThrow(
      'ffmpeg boom',
    );
    const statuses = prismaMock.creatorProfile.update.mock.calls.map(
      (c: any) => c[0].data.introVideoNormalizeStatus,
    );
    expect(statuses).toContain('failed');
    expect(statuses).toContain('dead');
  });

  it('enqueue is a no-op when disabled', async () => {
    const { service, normalizeMock, prismaMock } = build({ enabled: false });
    await service.enqueuePortfolio('v1');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(normalizeMock.normalizePortfolioVideo).not.toHaveBeenCalled();
  });

  it('runs inline when there is no Redis', async () => {
    const { service, normalizeMock } = build({ claimAttempts: 1 });
    await service.enqueuePortfolio('v1');
    await new Promise((r) => setTimeout(r, 0));
    expect(normalizeMock.normalizePortfolioVideo).toHaveBeenCalledWith('v1');
  });
});
