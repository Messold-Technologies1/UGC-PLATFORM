import { spawn } from 'node:child_process';
import { mkdtemp, open, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import ffmpegStatic from 'ffmpeg-static';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PreviewVideoQueueService } from '../preview-video/preview-video-queue.service';

// Same ffmpeg resolution as the watermark/preview services: an explicit
// FFMPEG_PATH (system ffmpeg in prod) → bundled static binary → PATH lookup.
const ffmpegPath: string =
  process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string) || 'ffmpeg';

/**
 * Optional height cap for the normalized "full" video, or null to keep the
 * source resolution (the default).
 *
 * This used to default to 720, which visibly softened the 1080p reels creators
 * upload — the drawer and public profile play them full-bleed, not as small
 * tiles. Portfolio quality is the product, so the cap is now opt-in: set
 * PORTFOLIO_MAX_HEIGHT to re-enable downscaling (e.g. to claw back bandwidth).
 */
function maxHeight(): number | null {
  const raw = process.env.PORTFOLIO_MAX_HEIGHT?.trim();
  if (!raw) return null;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 240 ? Math.floor(v) : null;
}

/**
 * Longest edge of the generated poster image. Portfolio reels are vertical, so
 * this is the height; 720 keeps the file around 40-80 KB while still looking
 * sharp in the full-bleed player it stands in for.
 */
function posterProbeBytes(): number {
  const v = Number(process.env.PORTFOLIO_POSTER_PROBE_BYTES);
  return Number.isFinite(v) && v >= 1_000_000
    ? Math.floor(v)
    : 12 * 1024 * 1024;
}

function posterHeight(): number {
  const v = Number(process.env.PORTFOLIO_POSTER_HEIGHT);
  return Number.isFinite(v) && v >= 120 ? Math.floor(v) : 720;
}

/**
 * x264 quality for the compatibility transcode. Lower = better, ~18-23 is the
 * visually-transparent range. The old value of 26 was tuned when output was
 * always downscaled to 720p, where softness was partly masked by the downscale;
 * at full resolution it is not.
 */
function videoCrf(): number {
  const v = Number(process.env.PORTFOLIO_VIDEO_CRF);
  return Number.isFinite(v) && v >= 0 && v <= 51 ? Math.floor(v) : 20;
}

/**
 * x264 preset. Affects compression *efficiency*, not quality — at a fixed CRF a
 * slower preset yields a smaller file for the same picture. Left at `veryfast`
 * because the BullMQ workers currently share a container with the API; once the
 * worker is split out, `medium` cuts roughly 20-30% off the file size.
 */
function videoPreset(): string {
  return process.env.PORTFOLIO_VIDEO_PRESET?.trim() || 'veryfast';
}

/**
 * Top-level MP4/MOV atom types, in file order. Used to tell whether `moov`
 * precedes `mdat` (i.e. the file is already "faststart"). Bounded so a
 * malformed or non-ISOBMFF file can't spin here.
 */
async function topLevelAtoms(path: string): Promise<string[]> {
  const out: string[] = [];
  // Reads 16-byte headers at sparse offsets rather than taking a Buffer of the
  // whole file: the walk only ever needs each atom's header, because it then
  // SKIPS the payload by `size`. On a 1 GiB upload that is a few dozen bytes
  // read instead of a gigabyte held in memory.
  const fd = await open(path, 'r');
  try {
    const { size: fileSize } = await fd.stat();
    const header = Buffer.alloc(16);
    let off = 0;
    while (off + 8 <= fileSize && out.length < 32) {
      const { bytesRead } = await fd.read(header, 0, 16, off);
      if (bytesRead < 8) break;
      let size = header.readUInt32BE(0);
      const type = header.toString('latin1', 4, 8);
      // Anything that isn't four printable ASCII chars means we've lost sync.
      if (!/^[\x20-\x7e]{4}$/.test(type)) break;
      out.push(type);
      if (size === 1) {
        // 64-bit extended size follows the type.
        if (bytesRead < 16) break;
        size = header.readUInt32BE(8) * 2 ** 32 + header.readUInt32BE(12);
      } else if (size === 0) {
        break; // runs to EOF — nothing after it
      }
      if (size < 8) break;
      off += size;
    }
  } finally {
    await fd.close();
  }
  return out;
}

/**
 * True when playback can begin before the whole file is downloaded, i.e. `moov`
 * comes before `mdat`. A recorder that writes `moov` last (most phone cameras,
 * and anything not muxed with `+faststart`) forces the browser to fetch to the
 * end of the file before it can show frame one — on a multi-hundred-MB upload
 * that reads as "the video never loads".
 */
async function hasFaststart(path: string): Promise<boolean> {
  const atoms = await topLevelAtoms(path);
  const moov = atoms.indexOf('moov');
  const mdat = atoms.indexOf('mdat');
  if (moov === -1 || mdat === -1) return false;
  return moov < mdat;
}

interface ProbeResult {
  videoCodec: string | null;
  audioCodec: string | null;
  height: number | null;
}

/**
 * Normalizes creator videos (portfolio + intro) to a web-safe, web-optimized MP4
 * so every browser can play them in the drawer / public profile. Raw uploads are
 * often HEVC/.mov (iPhone), which some browsers render black-with-audio.
 *
 * For each video: probe → if not already a web-safe H.264/AAC MP4, transcode
 * (**audio kept**, source resolution preserved unless PORTFOLIO_MAX_HEIGHT is
 * set) → write to a new S3 key → repoint the DB row → delete the original. A new
 * key (not an in-place overwrite) is used so the CDN/browser cache serves the
 * fixed file immediately. After a swap the card preview is re-triggered, since
 * its source key changed.
 *
 * A source that is already web-safe is left at its original bytes, with one
 * exception: if its `moov` atom sits after `mdat` it is remuxed (`-c copy`, so
 * the picture is bit-identical) to move `moov` to the front. Without that, a
 * large pass-through upload can only start playing once it has downloaded
 * almost completely.
 */
@Injectable()
export class MediaNormalizeService {
  private readonly logger = new Logger(MediaNormalizeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly previewQueue: PreviewVideoQueueService,
  ) {}

  /** Normalize one portfolio video (by row id). Throws on failure for retry. */
  async normalizePortfolioVideo(videoId: string): Promise<void> {
    const row = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        creatorId: true,
        videoKey: true,
        thumbnailKey: true,
      },
    });
    if (!row) {
      this.logger.warn(`normalize: portfolio video ${videoId} not found`);
      return;
    }

    // Nothing to transcode (e.g. an Instagram LINK_ONLY row with no S3 object).
    if (!row.videoKey) {
      await this.markPortfolioReady(videoId);
      return;
    }

    // Only mint a poster when the row has none. Uploads that shipped their own
    // thumbnail (the web uploader grabs a frame client-side) keep it.
    const { video: swapped, poster } = await this.normalizeObject(
      row.videoKey,
      {
        keepAudio: true,
        destPrefix: `creator-portfolio/${row.creatorId}/videos`,
        posterPrefix: row.thumbnailKey
          ? undefined
          : `creator-portfolio/${row.creatorId}/thumbnails`,
      },
    );

    if (swapped) {
      await this.prisma.creatorPortfolioVideo.update({
        where: { id: videoId },
        data: {
          videoKey: swapped.key,
          videoUrl: swapped.url,
          ...(poster
            ? { thumbnailKey: poster.key, thumbnailUrl: poster.url }
            : {}),
          videoNormalizeStatus: 'ready',
          videoNormalizeUpdatedAt: new Date(),
        },
      });
      await this.storage
        .deleteObjectIfExists(row.videoKey)
        .catch(() => undefined);
      this.logger.log(
        `normalize: portfolio ${videoId} → ${swapped.key} (${(swapped.bytes / 1024).toFixed(0)} KiB)`,
      );
    } else if (poster) {
      await this.prisma.creatorPortfolioVideo.update({
        where: { id: videoId },
        data: {
          thumbnailKey: poster.key,
          thumbnailUrl: poster.url,
          videoNormalizeStatus: 'ready',
          videoNormalizeUpdatedAt: new Date(),
        },
      });
    } else {
      await this.markPortfolioReady(videoId);
    }

    if (poster) {
      this.logger.log(`normalize: portfolio ${videoId} poster → ${poster.key}`);
    }

    // The card-preview source may be this video — rebuild it (no-op if not).
    void this.previewQueue.enqueueDirty(row.creatorId);
  }

  /** Normalize a creator's intro video. Throws on failure for retry. */
  async normalizeIntroVideo(creatorId: string): Promise<void> {
    const row = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { id: true, introVideoKey: true },
    });
    if (!row) {
      this.logger.warn(`normalize: creator ${creatorId} not found`);
      return;
    }

    // Intro removed / never set — nothing to normalize, but the preview's source
    // may now be a portfolio video, so still nudge it.
    if (!row.introVideoKey) {
      await this.markIntroReady(creatorId);
      void this.previewQueue.enqueueDirty(creatorId);
      return;
    }

    const { video: swapped } = await this.normalizeObject(row.introVideoKey, {
      keepAudio: true,
      destPrefix: `creator-profile/${creatorId}/intro`,
    });

    if (swapped) {
      await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: {
          introVideoKey: swapped.key,
          introVideoUrl: swapped.url,
          introVideoNormalizeStatus: 'ready',
          introVideoNormalizeUpdatedAt: new Date(),
        },
      });
      await this.storage
        .deleteObjectIfExists(row.introVideoKey)
        .catch(() => undefined);
      this.logger.log(
        `normalize: intro ${creatorId} → ${swapped.key} (${(swapped.bytes / 1024).toFixed(0)} KiB)`,
      );
    } else {
      await this.markIntroReady(creatorId);
    }

    void this.previewQueue.enqueueDirty(creatorId);
  }

  /**
   * Give an existing portfolio video a poster, without touching its bytes.
   *
   * The normalize pipeline mints one for every video it handles from now on;
   * this is for the rows that predate it — at the time of writing the large
   * majority of the library, which is why portfolio carousels were falling
   * back to loading whole reels to render a thumbnail.
   *
   * Reads only the head of the object where it can: a faststart MP4 carries
   * `moov` up front, so a few MB is enough to decode one frame out of a 200 MB
   * reel. Falls back to the full object when that is not enough.
   */
  async backfillPortfolioPoster(
    videoId: string,
  ): Promise<'created' | 'skipped'> {
    const row = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        creatorId: true,
        videoKey: true,
        thumbnailKey: true,
      },
    });
    if (!row?.videoKey || row.thumbnailKey) return 'skipped';

    const dir = await mkdtemp(join(tmpdir(), 'poster-'));
    const ext = row.videoKey.split('.').pop()?.toLowerCase() || 'mp4';
    const inPath = join(dir, `in.${ext}`);
    const framePath = join(dir, 'poster.jpg');
    const prefix = `creator-portfolio/${row.creatorId}/thumbnails`;
    try {
      let poster: { key: string; url: string } | null = null;
      try {
        await this.storage.downloadPrefixToFile(
          row.videoKey,
          inPath,
          posterProbeBytes(),
        );
        poster = await this.uploadPoster(inPath, framePath, prefix);
      } catch {
        // Truncated head was not enough (moov at the end, or the seek offset
        // lands past it) — pay for the whole object.
        await this.storage.downloadToFile(row.videoKey, inPath);
        poster = await this.uploadPoster(inPath, framePath, prefix);
      }
      if (!poster) return 'skipped';

      await this.prisma.creatorPortfolioVideo.update({
        where: { id: videoId },
        data: { thumbnailKey: poster.key, thumbnailUrl: poster.url },
      });
      return 'created';
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async markPortfolioReady(videoId: string): Promise<void> {
    await this.prisma.creatorPortfolioVideo.update({
      where: { id: videoId },
      data: {
        videoNormalizeStatus: 'ready',
        videoNormalizeUpdatedAt: new Date(),
      },
    });
  }

  private async markIntroReady(creatorId: string): Promise<void> {
    await this.prisma.creatorProfile.update({
      where: { id: creatorId },
      data: {
        introVideoNormalizeStatus: 'ready',
        introVideoNormalizeUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Download an object, and if it isn't already a web-safe MP4 within the height
   * cap, transcode + upload to a new key. `video` is the new object on a swap,
   * or null when the source was already fine (no swap needed).
   *
   * When `posterPrefix` is given, a JPEG of the first frame is also uploaded and
   * returned as `poster`. The frame is taken from whichever file the browser
   * will actually play, and the source is on local disk either way, so this
   * costs one extra ffmpeg pass over a single frame — no second download.
   * Poster failure is never fatal: a missing poster degrades to the old
   * behaviour, while failing the job here would also undo a good transcode.
   */
  private async normalizeObject(
    sourceKey: string,
    opts: { keepAudio: boolean; destPrefix: string; posterPrefix?: string },
  ): Promise<{
    video: { key: string; url: string; bytes: number } | null;
    poster: { key: string; url: string } | null;
  }> {
    const ext = sourceKey.split('.').pop()?.toLowerCase() || 'mp4';

    const dir = await mkdtemp(join(tmpdir(), 'normalize-'));
    const inPath = join(dir, `in.${ext}`);
    const outPath = join(dir, 'out.mp4');
    try {
      await this.storage.downloadToFile(sourceKey, inPath);
      const probe = await this.probe(inPath);

      let swapped = true;
      if (!this.needsNormalize(ext, probe)) {
        // Already web-safe. Leave the bytes alone unless the moov atom is at the
        // end, in which case remux (stream copy — no re-encode, so no quality
        // change) purely to move it to the front.
        if (await hasFaststart(inPath)) {
          swapped = false;
        } else {
          this.logger.log(
            `normalize: ${sourceKey} is web-safe but not faststart — remuxing (stream copy)`,
          );
          await this.remuxFaststart(inPath, outPath);
        }
      } else {
        await this.transcode(inPath, outPath, {
          keepAudio: opts.keepAudio && probe.audioCodec !== null,
        });
      }

      let video: { key: string; url: string; bytes: number } | null = null;
      if (swapped) {
        const key = `${opts.destPrefix}/${randomUUID()}.mp4`;
        // Streamed, and inside the `try` so the temp dir outlives the multipart.
        // `bytes` comes back from the uploader because nothing here ever holds
        // the whole file to measure it.
        const { bytes } = await this.storage.uploadStream({
          key,
          body: createReadStream(outPath),
          contentType: 'video/mp4',
        });
        video = { key, url: this.storage.buildCdnUrl(key), bytes };
      }

      let poster: { key: string; url: string } | null = null;
      if (opts.posterPrefix) {
        poster = await this.uploadPoster(
          swapped ? outPath : inPath,
          join(dir, 'poster.jpg'),
          opts.posterPrefix,
        ).catch((err: unknown) => {
          this.logger.warn(
            `normalize: poster for ${sourceKey} failed — ${String(err)}`,
          );
          return null;
        });
      }

      return { video, poster };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Grab one frame and upload it as a JPEG.
   *
   * Without a poster, every surface that lists reels has to mount a `<video>`
   * per tile just to show a still — and Safari ignores `preload="metadata"`,
   * so each of those tiles pulls tens of seconds of a multi-hundred-MB file
   * before it paints anything. A ~50 KB image removes the reason to do that.
   */
  private async uploadPoster(
    videoPath: string,
    framePath: string,
    prefix: string,
  ): Promise<{ key: string; url: string } | null> {
    const height = posterHeight();
    const args = (seek: string[]) => [
      '-y',
      ...seek,
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      `scale=-2:'min(${height},ih)'`,
      '-q:v',
      '4',
      framePath,
    ];

    // ffmpeg can exit 0 having written nothing — a truncated source (the
    // ranged read the backfill uses) or a seek past the last decodable frame
    // both do it — so the exit code alone is not proof that a poster exists.
    // Checking stops a non-existent file reaching `createReadStream` below.
    const wroteFrame = async (): Promise<boolean> => {
      try {
        return (await stat(framePath)).size > 0;
      } catch {
        return false;
      }
    };

    // Half a second in: the very first frame of a phone recording is often a
    // black or half-exposed sensor warm-up frame.
    const first = await this.runFfmpegCapture(args(['-ss', '0.5']));
    if (first.code !== 0 || !(await wroteFrame())) {
      // A clip shorter than the seek offset, or a head too short to decode at
      // that offset — try again from the very start.
      await rm(framePath, { force: true }).catch(() => undefined);
      const retry = await this.runFfmpegCapture(args([]));
      if (retry.code !== 0 || !(await wroteFrame())) {
        throw new Error(
          `ffmpeg poster produced no frame (codes ${first.code}/${retry.code}): ${(
            retry.stderr || first.stderr
          ).slice(-1000)}`,
        );
      }
    }

    const key = `${prefix}/${randomUUID()}.jpg`;
    await this.storage.uploadStream({
      key,
      body: createReadStream(framePath),
      contentType: 'image/jpeg',
    });
    return { key, url: this.storage.buildCdnUrl(key) };
  }

  /** Already web-safe if it's an .mp4 whose video is H.264 and whose audio (if
   *  any) is AAC. Height only disqualifies a file when a cap is configured —
   *  by default the source resolution is kept. Anything else gets transcoded. */
  private needsNormalize(ext: string, probe: ProbeResult): boolean {
    if (ext !== 'mp4') return true;
    if (probe.videoCodec !== 'h264') return true;
    const cap = maxHeight();
    if (cap != null && probe.height != null && probe.height > cap) return true;
    if (probe.audioCodec != null && probe.audioCodec !== 'aac') return true;
    return false;
  }

  private async probe(inPath: string): Promise<ProbeResult> {
    // No ffprobe in ffmpeg-static; parse `ffmpeg -i` stderr instead.
    const { stderr } = await this.runFfmpegCapture(['-i', inPath]);
    const videoMatch = /Video:\s*([a-z0-9]+)/i.exec(stderr);
    const audioMatch = /Audio:\s*([a-z0-9]+)/i.exec(stderr);
    const resMatch = /,\s(\d{2,5})x(\d{2,5})/.exec(stderr);
    return {
      videoCodec: videoMatch ? videoMatch[1].toLowerCase() : null,
      audioCodec: audioMatch ? audioMatch[1].toLowerCase() : null,
      height: resMatch ? Number(resMatch[2]) : null,
    };
  }

  private async transcode(
    inPath: string,
    outPath: string,
    opts: { keepAudio: boolean },
  ): Promise<void> {
    const cap = maxHeight();
    const args = [
      '-y',
      '-i',
      inPath,
      // Only scale when a cap is configured; `min(cap,ih)` never upscales.
      ...(cap != null ? ['-vf', `scale=-2:'min(${cap},ih)'`] : []),
      '-c:v',
      'libx264',
      '-preset',
      videoPreset(),
      '-crf',
      String(videoCrf()),
      '-pix_fmt',
      'yuv420p',
      ...(opts.keepAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
      '-movflags',
      '+faststart',
      outPath,
    ];
    const { code, stderr } = await this.runFfmpegCapture(args);
    if (code !== 0) {
      throw new Error(
        `ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`,
      );
    }
  }

  /**
   * Rewrite the container with `moov` in front, copying both streams verbatim.
   * No decode/encode happens, so the result is bit-identical in picture and
   * sound to the source — this only changes where the index lives.
   */
  private async remuxFaststart(inPath: string, outPath: string): Promise<void> {
    const { code, stderr } = await this.runFfmpegCapture([
      '-y',
      '-i',
      inPath,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outPath,
    ]);
    if (code !== 0) {
      throw new Error(
        `ffmpeg faststart remux exited with code ${code}: ${stderr.slice(-2000)}`,
      );
    }
  }

  private runFfmpegCapture(
    args: string[],
  ): Promise<{ code: number | null; stderr: string }> {
    const timeoutMs = Math.max(
      30_000,
      Number(process.env.MEDIA_NORMALIZE_FFMPEG_TIMEOUT_MS) || 300_000,
    );
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let stderr = '';
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        finish(() =>
          reject(new Error(`ffmpeg timed out after ${timeoutMs}ms`)),
        );
      }, timeoutMs);
      proc.stderr?.on('data', (d: Buffer) => {
        stderr = (stderr + d.toString()).slice(-8000);
      });
      proc.on('error', (err) => finish(() => reject(err)));
      proc.on('close', (code) => finish(() => resolve({ code, stderr })));
    });
  }
}
