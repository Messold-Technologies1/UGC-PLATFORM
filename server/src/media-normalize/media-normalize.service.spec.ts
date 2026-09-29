import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { MediaNormalizeService } from './media-normalize.service';

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

function topLevelAtoms(buf: Buffer): string[] {
  const atoms: string[] = [];
  let i = 0;
  while (i + 8 <= buf.length && atoms.length < 12) {
    let size = buf.readUInt32BE(i);
    atoms.push(buf.toString('latin1', i + 4, i + 8));
    if (size === 1) size = Number(buf.readBigUInt64BE(i + 8));
    if (size <= 0) break;
    i += size;
  }
  return atoms;
}

async function generate(args: string[]): Promise<Buffer | null> {
  const dir = await mkdtemp(join(tmpdir(), 'mn-src-'));
  const out = join(dir, args[args.length - 1]);
  try {
    const { code } = await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...args.slice(0, -1),
      out,
    ]);
    return code === 0 ? await readFile(out) : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

describe('MediaNormalizeService (real ffmpeg)', () => {
  jest.setTimeout(180_000);

  function build(row: { videoKey: string | null }) {
    let uploaded: Buffer | null = null;
    let uploadedKey: string | null = null;
    const prismaMock = {
      creatorPortfolioVideo: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'v1', creatorId: 'c1', ...row }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const storageMock = {
      getObjectBuffer: jest.fn(),
      putObjectBuffer: jest.fn((input: { key: string; body: Buffer }) => {
        uploaded = input.body;
        uploadedKey = input.key;
        return Promise.resolve(input.key);
      }),
      buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
      deleteObjectIfExists: jest.fn().mockResolvedValue(undefined),
    };
    const previewMock = { enqueueDirty: jest.fn() };
    const service = new MediaNormalizeService(
      prismaMock as never,
      storageMock as never,
      previewMock as never,
    );
    return {
      service,
      prismaMock,
      storageMock,
      previewMock,
      get uploaded() {
        return uploaded;
      },
      get uploadedKey() {
        return uploadedKey;
      },
    };
  }

  it('transcodes a raw HEVC/.mov upload to a web-safe H.264/AAC MP4 (audio kept, source resolution preserved, faststart)', async () => {
    // 1080x1920 HEVC .mov WITH audio — the classic black-with-audio source.
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=1080x1920:rate=30:duration=2',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=1000:duration=2',
      '-c:v',
      'libx265',
      '-tag:v',
      'hvc1',
      '-c:a',
      'aac',
      'src.mov',
    ]);
    if (!sample) {
      console.warn('ffmpeg/libx265 unavailable — skipping HEVC normalize test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mov' });
    h.storageMock.getObjectBuffer.mockResolvedValue(sample);

    await h.service.normalizePortfolioVideo('v1');

    expect(h.storageMock.putObjectBuffer).toHaveBeenCalledTimes(1);
    const out = h.uploaded as unknown as Buffer;
    expect(out).toBeInstanceOf(Buffer);

    // faststart: moov before mdat
    const atoms = topLevelAtoms(out);
    expect(atoms.indexOf('moov')).toBeGreaterThanOrEqual(0);
    expect(atoms.indexOf('moov')).toBeLessThan(atoms.indexOf('mdat'));

    // Probe the output: H.264 video, AAC audio kept, and the full 1080x1920
    // source resolution retained (no downscale — that's the point).
    const dir = await mkdtemp(join(tmpdir(), 'mn-out-'));
    const outPath = join(dir, 'out.mp4');
    try {
      await writeFile(outPath, out);
      const { stderr } = await runFfmpeg(['-hide_banner', '-i', outPath]);
      expect(stderr).toMatch(/Video:\s*h264/i);
      expect(stderr).toMatch(/Audio:\s*aac/i);
      const res = /,\s(\d+)x(\d+)/.exec(stderr);
      expect(res).not.toBeNull();
      expect(Number(res![1])).toBe(1080);
      expect(Number(res![2])).toBe(1920);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }

    // Row repointed to the new key + marked ready; old object deleted; preview nudged.
    expect(h.prismaMock.creatorPortfolioVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          videoKey: h.uploadedKey,
          videoNormalizeStatus: 'ready',
        }),
      }),
    );
    expect(h.storageMock.deleteObjectIfExists).toHaveBeenCalledWith(
      'creator-portfolio/c1/videos/src.mov',
    );
    expect(h.previewMock.enqueueDirty).toHaveBeenCalledWith('c1');
  });

  it('skips (no swap) a file that is already a web-safe H.264/AAC MP4 within the cap', async () => {
    // 640x360 H.264 + AAC MP4 — already fine.
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=30:duration=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=1000:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping already-safe test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.storageMock.getObjectBuffer.mockResolvedValue(sample);

    await h.service.normalizePortfolioVideo('v1');

    // No re-encode / upload / delete — just a status flip to ready.
    expect(h.storageMock.putObjectBuffer).not.toHaveBeenCalled();
    expect(h.storageMock.deleteObjectIfExists).not.toHaveBeenCalled();
    expect(h.prismaMock.creatorPortfolioVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ videoNormalizeStatus: 'ready' }),
      }),
    );
    // videoKey must NOT be changed on a skip.
    const call = h.prismaMock.creatorPortfolioVideo.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.videoKey).toBeUndefined();
  });

  it('remuxes a web-safe MP4 whose moov is at the end, keeping resolution', async () => {
    // 1080x1920 H.264 + AAC, but muxed WITHOUT +faststart, so moov trails mdat.
    // Nothing about the picture needs fixing — only the atom order, which would
    // otherwise force the browser to fetch the whole file before frame one.
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=1080x1920:rate=30:duration=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=1000:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping faststart remux test');
      return;
    }
    // Guard the premise: the source really must have moov after mdat.
    const srcAtoms = topLevelAtoms(sample);
    expect(srcAtoms.indexOf('moov')).toBeGreaterThan(srcAtoms.indexOf('mdat'));

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.storageMock.getObjectBuffer.mockResolvedValue(sample);

    await h.service.normalizePortfolioVideo('v1');

    expect(h.storageMock.putObjectBuffer).toHaveBeenCalledTimes(1);
    const out = h.uploaded as unknown as Buffer;
    const atoms = topLevelAtoms(out);
    expect(atoms.indexOf('moov')).toBeLessThan(atoms.indexOf('mdat'));

    // Stream copy — the full resolution survives the remux untouched.
    const dir = await mkdtemp(join(tmpdir(), 'mn-remux-'));
    const outPath = join(dir, 'out.mp4');
    try {
      await writeFile(outPath, out);
      const { stderr } = await runFfmpeg(['-hide_banner', '-i', outPath]);
      const res = /,\s(\d+)x(\d+)/.exec(stderr);
      expect(res).not.toBeNull();
      expect(Number(res![1])).toBe(1080);
      expect(Number(res![2])).toBe(1920);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  it('still downscales when PORTFOLIO_MAX_HEIGHT is set (opt-in escape hatch)', async () => {
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=1080x1920:rate=30:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping height-cap test');
      return;
    }

    const prev = process.env.PORTFOLIO_MAX_HEIGHT;
    process.env.PORTFOLIO_MAX_HEIGHT = '720';
    try {
      const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
      h.storageMock.getObjectBuffer.mockResolvedValue(sample);

      await h.service.normalizePortfolioVideo('v1');

      expect(h.storageMock.putObjectBuffer).toHaveBeenCalledTimes(1);
      const out = h.uploaded as unknown as Buffer;
      const dir = await mkdtemp(join(tmpdir(), 'mn-cap-'));
      const outPath = join(dir, 'out.mp4');
      try {
        await writeFile(outPath, out);
        const { stderr } = await runFfmpeg(['-hide_banner', '-i', outPath]);
        const res = /,\s(\d+)x(\d+)/.exec(stderr);
        expect(res).not.toBeNull();
        expect(Number(res![2])).toBe(720);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    } finally {
      if (prev === undefined) delete process.env.PORTFOLIO_MAX_HEIGHT;
      else process.env.PORTFOLIO_MAX_HEIGHT = prev;
    }
  });
});
