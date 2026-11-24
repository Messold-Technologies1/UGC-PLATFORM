import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
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

  function build(row: { videoKey: string | null; thumbnailKey?: string | null }) {
    let uploaded: Buffer | null = null;
    let uploadedKey: string | null = null;
    let poster: Buffer | null = null;
    let posterKey: string | null = null;
    // The service no longer buffers the source — it asks storage to stream the
    // object onto disk — so the fake writes whatever `setSource` was given to
    // the path the service picked.
    let source: Buffer | null = null;
    const prismaMock = {
      creatorPortfolioVideo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v1',
          creatorId: 'c1',
          thumbnailKey: null,
          ...row,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    let prefixBytes: number | null = null;
    const storageMock = {
      downloadToFile: jest.fn(async (_key: string, destPath: string) => {
        if (!source) throw new Error('test did not call setSource()');
        await writeFile(destPath, source);
      }),
      downloadPrefixToFile: jest.fn(
        async (_key: string, destPath: string, bytes: number) => {
          if (!source) throw new Error('test did not call setSource()');
          // `prefixBytes` lets a test force a head too short to decode.
          await writeFile(destPath, source.subarray(0, prefixBytes ?? bytes));
        },
      ),
      uploadStream: jest.fn(
        async (input: { key: string; body: Readable; contentType: string }) => {
          const chunks: Buffer[] = [];
          for await (const chunk of input.body) {
            chunks.push(Buffer.from(chunk as Buffer));
          }
          const body = Buffer.concat(chunks);
          // The service uploads two kinds of object now; keep them apart so a
          // test can assert on the video without the poster overwriting it.
          if (input.contentType === 'image/jpeg') {
            poster = body;
            posterKey = input.key;
          } else {
            uploaded = body;
            uploadedKey = input.key;
          }
          return { key: input.key, bytes: body.length };
        },
      ),
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
      setSource(buf: Buffer) {
        source = buf;
      },
      /** Truncate what a ranged read returns, to exercise the fallback. */
      setPrefixBytes(n: number) {
        prefixBytes = n;
      },
      get uploaded() {
        return uploaded;
      },
      get uploadedKey() {
        return uploadedKey;
      },
      get poster() {
        return poster;
      },
      get posterKey() {
        return posterKey;
      },
      /** Upload calls that carried the video, i.e. excluding the poster. */
      videoUploads() {
        return storageMock.uploadStream.mock.calls.filter(
          (c) => (c[0] as { contentType: string }).contentType !== 'image/jpeg',
        ).length;
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
    h.setSource(sample);

    await h.service.normalizePortfolioVideo('v1');

    expect(h.videoUploads()).toBe(1);
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
    h.setSource(sample);

    await h.service.normalizePortfolioVideo('v1');

    // No re-encode and no delete: the video bytes are untouched. A poster is
    // still minted, because the row had none.
    expect(h.videoUploads()).toBe(0);
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
    h.setSource(sample);

    await h.service.normalizePortfolioVideo('v1');

    expect(h.videoUploads()).toBe(1);
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
      h.setSource(sample);

      await h.service.normalizePortfolioVideo('v1');

      expect(h.videoUploads()).toBe(1);
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

  it('mints a JPEG poster for a portfolio video that has none', async () => {
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=1080x1920:rate=30:duration=2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping poster test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.setSource(sample);

    await h.service.normalizePortfolioVideo('v1');

    // Already web-safe, so the reel itself is untouched — only a poster is new.
    expect(h.videoUploads()).toBe(0);
    expect(h.posterKey).toMatch(
      /^creator-portfolio\/c1\/thumbnails\/[0-9a-f-]+\.jpg$/,
    );

    const poster = h.poster as unknown as Buffer;
    expect(poster).toBeInstanceOf(Buffer);
    // JPEG SOI marker.
    expect(poster.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    // Small in absolute terms — this is what a tile loads instead of a reel.
    // (Not compared against `sample`: a 2s synthetic test pattern compresses
    // far better as video than a busy still of it does as JPEG.)
    expect(poster.length).toBeLessThan(500 * 1024);

    const dir = await mkdtemp(join(tmpdir(), 'mn-poster-'));
    const posterPath = join(dir, 'poster.jpg');
    try {
      await writeFile(posterPath, poster);
      const { stderr } = await runFfmpeg(['-hide_banner', '-i', posterPath]);
      const res = /,\s(\d+)x(\d+)/.exec(stderr);
      expect(res).not.toBeNull();
      // Scaled to the 720 default, aspect preserved (1080x1920 -> 405x720).
      expect(Number(res![2])).toBe(720);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }

    expect(h.prismaMock.creatorPortfolioVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          thumbnailKey: h.posterKey,
          thumbnailUrl: `https://cdn.example/${h.posterKey}`,
        }),
      }),
    );
  });

  it('leaves an existing thumbnail alone', async () => {
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=30:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping poster-preserved test');
      return;
    }

    const h = build({
      videoKey: 'creator-portfolio/c1/videos/src.mp4',
      thumbnailKey: 'creator-portfolio/c1/thumbnails/uploader-supplied.jpg',
    });
    h.setSource(sample);

    await h.service.normalizePortfolioVideo('v1');

    expect(h.posterKey).toBeNull();
    expect(h.storageMock.uploadStream).not.toHaveBeenCalled();
  });

  it('does not fail the job when the poster pass fails', async () => {
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=30:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping poster-failure test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.setSource(sample);
    // A poster is a nice-to-have: losing the upload must not cost us the
    // normalize result, which is the part that is expensive to redo.
    h.storageMock.uploadStream.mockRejectedValueOnce(new Error('s3 down'));

    await expect(h.service.normalizePortfolioVideo('v1')).resolves.toBeUndefined();

    expect(h.prismaMock.creatorPortfolioVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ videoNormalizeStatus: 'ready' }),
      }),
    );
  });

  it('still makes a poster for a clip shorter than the seek offset', async () => {
    // THE crash from the first production backfill run. Seeking to 0.5s in a
    // 0.2s clip makes ffmpeg encode zero frames — and the image2 muxer then
    // never creates the output file at all, while ffmpeg still exits 0. The
    // old code trusted that exit code, handed a non-existent path to
    // createReadStream, and the unhandled 'error' event killed the run at
    // row 250 of 2546.
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=30:duration=0.2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping short-clip poster test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.setSource(sample);

    await expect(h.service.backfillPortfolioPoster('v1')).resolves.toBe(
      'created',
    );

    const poster = h.poster as unknown as Buffer;
    expect(poster).toBeInstanceOf(Buffer);
    expect(poster.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });

  it('falls back to the full object when a ranged head is too short to decode', async () => {
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=1080x1920:rate=30:duration=2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping poster fallback test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.setSource(sample);
    // 2 KiB is moov and little else: ffmpeg can exit 0 here and still write no
    // frame, which is what crashed the first backfill run — createReadStream
    // opened a file that was never created and the 'error' event went unheard.
    h.setPrefixBytes(2048);

    await expect(h.service.backfillPortfolioPoster('v1')).resolves.toBe(
      'created',
    );

    expect(h.storageMock.downloadPrefixToFile).toHaveBeenCalled();
    expect(h.storageMock.downloadToFile).toHaveBeenCalled();
    const poster = h.poster as unknown as Buffer;
    expect(poster.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(h.prismaMock.creatorPortfolioVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ thumbnailKey: h.posterKey }),
      }),
    );
  });

  it('backfills a poster from the ranged head alone when that is enough', async () => {
    const sample = await generate([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=30:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'src.mp4',
    ]);
    if (!sample) {
      console.warn('ffmpeg unavailable — skipping poster head test');
      return;
    }

    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    h.setSource(sample);

    await expect(h.service.backfillPortfolioPoster('v1')).resolves.toBe(
      'created',
    );

    // The whole point of the ranged read: a 200 MB reel must not be pulled
    // down in full just to grab one frame.
    expect(h.storageMock.downloadToFile).not.toHaveBeenCalled();
  });

  it('reports a failed backfill instead of taking the process down', async () => {
    const h = build({ videoKey: 'creator-portfolio/c1/videos/src.mp4' });
    // Not a video at all — neither the head nor the full object yields a frame.
    h.setSource(Buffer.from('not a video'));

    await expect(h.service.backfillPortfolioPoster('v1')).rejects.toThrow(
      /produced no frame/,
    );
    expect(h.prismaMock.creatorPortfolioVideo.update).not.toHaveBeenCalled();
  });

  it('skips a backfill for a row that already has a thumbnail', async () => {
    const h = build({
      videoKey: 'creator-portfolio/c1/videos/src.mp4',
      thumbnailKey: 'creator-portfolio/c1/thumbnails/existing.jpg',
    });
    await expect(h.service.backfillPortfolioPoster('v1')).resolves.toBe(
      'skipped',
    );
    expect(h.storageMock.downloadPrefixToFile).not.toHaveBeenCalled();
  });
});
