import { PreviewVideoQueueService } from './preview-video-queue.service';

/**
 * Edge cases for the queue's inline path (no REDIS_URL): the claim lock, failure
 * bookkeeping (failed vs dead), the in-flight guard, and the enabled flag. The
 * Redis/worker path is a thin wrapper over these and needs a live broker, so it
 * is exercised via the real app rather than here.
 */
describe('PreviewVideoQueueService (inline path)', () => {
  function build(opts?: {
    enabled?: boolean;
    maxAttempts?: number;
    claimAttempts?: number | null;
  }) {
    const configValues: Record<string, string> = {
      PREVIEW_VIDEO_ENABLED: opts?.enabled === false ? 'false' : 'true',
      PREVIEW_VIDEO_MAX_ATTEMPTS: String(opts?.maxAttempts ?? 5),
      // no REDIS_URL -> inline mode
    };
    const configMock = {
      get: jest.fn(
        (key: string, fallback?: unknown) => configValues[key] ?? fallback,
      ),
    };
    const previewMock = {
      generateForCreator: jest.fn().mockResolvedValue(undefined),
    };
    const claimAttempts =
      opts?.claimAttempts === undefined ? 1 : opts.claimAttempts;
    const prismaMock = {
      // claimForProcessing uses $queryRaw and returns [] or [{ previewVideoAttempts }]
      $queryRaw: jest
        .fn()
        .mockResolvedValue(
          claimAttempts === null
            ? []
            : [{ previewVideoAttempts: claimAttempts }],
        ),
      creatorProfile: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new PreviewVideoQueueService(
      configMock as never,
      previewMock as never,
      prismaMock as never,
    );
    return { service, previewMock, prismaMock, configMock };
  }

  it('no-ops when the claim is not won (already ready/held elsewhere)', async () => {
    const { service, previewMock } = build({ claimAttempts: null });
    await service.processCreatorDirect('c1', 'test');
    expect(previewMock.generateForCreator).not.toHaveBeenCalled();
  });

  it('generates when the claim is won', async () => {
    const { service, previewMock, prismaMock } = build({ claimAttempts: 1 });
    await service.processCreatorDirect('c1', 'test');
    expect(previewMock.generateForCreator).toHaveBeenCalledWith('c1');
    // No status write on success — generateForCreator owns the `ready` flip.
    expect(prismaMock.creatorProfile.update).not.toHaveBeenCalled();
  });

  it('marks failed (not dead) when generation throws under the attempt budget', async () => {
    const { service, previewMock, prismaMock } = build({
      claimAttempts: 2,
      maxAttempts: 5,
    });
    previewMock.generateForCreator.mockRejectedValueOnce(
      new Error('ffmpeg boom'),
    );

    await expect(service.processCreatorDirect('c1', 'test')).rejects.toThrow(
      'ffmpeg boom',
    );

    const statuses = prismaMock.creatorProfile.update.mock.calls.map(
      (c: any) => c[0].data.previewVideoStatus,
    );
    expect(statuses).toContain('failed');
    expect(statuses).not.toContain('dead');
  });

  it('parks the row dead once the attempt budget is exhausted', async () => {
    const { service, previewMock, prismaMock } = build({
      claimAttempts: 5,
      maxAttempts: 5,
    });
    previewMock.generateForCreator.mockRejectedValueOnce(
      new Error('ffmpeg boom'),
    );

    await expect(service.processCreatorDirect('c1', 'test')).rejects.toThrow(
      'ffmpeg boom',
    );

    const statuses = prismaMock.creatorProfile.update.mock.calls.map(
      (c: any) => c[0].data.previewVideoStatus,
    );
    expect(statuses).toContain('failed');
    expect(statuses).toContain('dead');
  });

  it('skips when the same creator is already processing in this instance', async () => {
    const { service, previewMock, prismaMock } = build({ claimAttempts: 1 });
    // Simulate an in-flight run for c1.
    (service as unknown as { processing: Set<string> }).processing.add('c1');
    await service.processCreatorDirect('c1', 'test');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(previewMock.generateForCreator).not.toHaveBeenCalled();
  });

  it('enqueue is a no-op when the feature is disabled', async () => {
    const { service, previewMock, prismaMock } = build({ enabled: false });
    await service.enqueue('c1');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(previewMock.generateForCreator).not.toHaveBeenCalled();
  });

  it('enqueue runs generation inline when there is no Redis', async () => {
    const { service, previewMock } = build({ claimAttempts: 1 });
    await service.enqueue('c1');
    // enqueue kicks processCreatorDirect (fire-and-forget); let it settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(previewMock.generateForCreator).toHaveBeenCalledWith('c1');
  });

  it('enqueueDirty resets status + attempts before re-queuing', async () => {
    const { service, prismaMock } = build({ claimAttempts: null });
    await service.enqueueDirty('c1');
    expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { previewVideoStatus: 'pending', previewVideoAttempts: 0 },
      }),
    );
  });
});
