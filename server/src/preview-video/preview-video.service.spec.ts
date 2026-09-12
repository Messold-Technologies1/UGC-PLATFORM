import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { PreviewVideoService } from './preview-video.service';

const ffmpegPath: string =
  process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string) || 'ffmpeg';

function runFfmpeg(
  args: string[],
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => resolve({ code, stderr }));
  });
}

/** Top-level MP4 atom order — used to assert +faststart (moov before mdat). */
function topLevelAtoms(buf: Buffer): string[] {
  const atoms: string[] = [];
  let i = 0;
  while (i + 8 <= buf.length && atoms.length < 12) {
    let size = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    atoms.push(type);
    if (size === 1) size = Number(buf.readBigUInt64BE(i + 8)); // 64-bit size
    if (size <= 0) break;
    i += size;
  }
  return atoms;
}

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

  // Real end-to-end encode through the actual ffmpeg binary — proves the worker
  // produces a faststart, downscaled, audio-stripped rendition from a raw
  // (moov-at-end, has-audio, >720p) source. Skips itself if ffmpeg can't run in
  // this environment rather than failing the suite.
  describe('generateForCreator (real ffmpeg encode)', () => {
    jest.setTimeout(120_000);
    let sample: Buffer | null = null;

    beforeAll(async () => {
      const dir = await mkdtemp(join(tmpdir(), 'preview-src-'));
      const src = join(dir, 'src.mp4');
      try {
        // 1080x1920 (vertical, >720), 2s, WITH an audio track, moov at end (the
        // default for a file output) — i.e. the exact "slow to start" shape.
        const { code } = await runFfmpeg([
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'testsrc=size=1080x1920:rate=30:duration=2',
          '-f',
          'lavfi',
          '-i',
          'sine=frequency=1000:duration=2',
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          src,
        ]);
        if (code === 0) sample = await readFile(src);
      } catch {
        sample = null; // ffmpeg unavailable — the tests below skip
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    });

    it('produces a faststart, <=720p, audio-free mp4 from a raw source', async () => {
      if (!sample) {
        console.warn('ffmpeg unavailable — skipping real-encode test');
        return;
      }

      const profileRow = {
        id: 'creator-1',
        introVideoKey: 'creator-profile/creator-1/intro/src.mp4',
        previewVideoKey: null,
        previewVideoSourceKey: null,
      };
      let uploaded: Buffer | null = null;
      const prismaMock = {
        creatorProfile: {
          findUnique: jest.fn().mockResolvedValue(profileRow),
          update: jest.fn().mockResolvedValue(profileRow),
        },
        creatorPortfolioVideo: { findFirst: jest.fn() },
      };
      const storageMock = {
        getObjectBuffer: jest.fn().mockResolvedValue(sample),
        putObjectBuffer: jest.fn((input: { body: Buffer }) => {
          uploaded = input.body;
          return Promise.resolve('k');
        }),
        buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
        deleteObjectIfExists: jest.fn().mockResolvedValue(undefined),
      };
      const service = new PreviewVideoService(
        prismaMock as never,
        storageMock as never,
      );

      await service.generateForCreator('creator-1');

      expect(storageMock.putObjectBuffer).toHaveBeenCalledTimes(1);
      expect(uploaded).toBeInstanceOf(Buffer);
      const out = uploaded as unknown as Buffer;

      // Valid MP4 with the moov atom ahead of mdat (i.e. +faststart applied).
      const atoms = topLevelAtoms(out);
      expect(atoms).toContain('ftyp');
      expect(atoms.indexOf('moov')).toBeGreaterThanOrEqual(0);
      expect(atoms.indexOf('moov')).toBeLessThan(atoms.indexOf('mdat'));

      // A smaller object than the raw source.
      expect(out.length).toBeLessThan(sample.length);

      // Probe the output: a video stream, no audio, height capped at 720.
      const dir = await mkdtemp(join(tmpdir(), 'preview-out-'));
      const outPath = join(dir, 'out.mp4');
      try {
        await writeFile(outPath, out);
        const { stderr } = await runFfmpeg(['-hide_banner', '-i', outPath]);
        expect(stderr).toContain('Video:');
        expect(stderr).not.toContain('Audio:');
        const res = /,\s(\d+)x(\d+)/.exec(stderr);
        expect(res).not.toBeNull();
        const height = Number(res![2]);
        expect(height).toBeLessThanOrEqual(720);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }

      // Records the rendition + the source key it was built from.
      expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previewVideoStatus: 'ready',
            previewVideoSourceKey: profileRow.introVideoKey,
          }),
        }),
      );
    });
  });
});
