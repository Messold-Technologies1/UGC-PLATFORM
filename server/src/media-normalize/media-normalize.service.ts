import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
function topLevelAtoms(buf: Buffer): string[] {
  const out: string[] = [];
  let off = 0;
  while (off + 8 <= buf.length && out.length < 32) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    // Anything that isn't four printable ASCII chars means we've lost sync.
    if (!/^[\x20-\x7e]{4}$/.test(type)) break;
    out.push(type);
    if (size === 1) {
      // 64-bit extended size follows the type.
      if (off + 16 > buf.length) break;
      size = buf.readUInt32BE(off + 8) * 2 ** 32 + buf.readUInt32BE(off + 12);
    } else if (size === 0) {
      break; // runs to EOF — nothing after it
    }
    if (size < 8) break;
    off += size;
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
function hasFaststart(buf: Buffer): boolean {
  const atoms = topLevelAtoms(buf);
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
      select: { id: true, creatorId: true, videoKey: true },
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

    const swapped = await this.normalizeObject(row.videoKey, {
      keepAudio: true,
      destPrefix: `creator-portfolio/${row.creatorId}/videos`,
    });

    if (swapped) {
      await this.prisma.creatorPortfolioVideo.update({
        where: { id: videoId },
        data: {
          videoKey: swapped.key,
          videoUrl: swapped.url,
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
    } else {
      await this.markPortfolioReady(videoId);
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

    const swapped = await this.normalizeObject(row.introVideoKey, {
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
   * cap, transcode + upload to a new key. Returns the new object on a swap, or
   * null when the source was already fine (no swap needed).
   */
  private async normalizeObject(
    sourceKey: string,
    opts: { keepAudio: boolean; destPrefix: string },
  ): Promise<{ key: string; url: string; bytes: number } | null> {
    const source = await this.storage.getObjectBuffer(sourceKey);
    const ext = sourceKey.split('.').pop()?.toLowerCase() || 'mp4';

    const dir = await mkdtemp(join(tmpdir(), 'normalize-'));
    const inPath = join(dir, `in.${ext}`);
    const outPath = join(dir, 'out.mp4');
    try {
      await writeFile(inPath, source);
      const probe = await this.probe(inPath);

      if (!this.needsNormalize(ext, probe)) {
        // Already web-safe. Leave the bytes alone unless the moov atom is at the
        // end, in which case remux (stream copy — no re-encode, so no quality
        // change) purely to move it to the front.
        if (hasFaststart(source)) return null;
        this.logger.log(
          `normalize: ${sourceKey} is web-safe but not faststart — remuxing (stream copy)`,
        );
        await this.remuxFaststart(inPath, outPath);
      } else {
        await this.transcode(inPath, outPath, {
          keepAudio: opts.keepAudio && probe.audioCodec !== null,
        });
      }
      const out = await readFile(outPath);
      const key = `${opts.destPrefix}/${randomUUID()}.mp4`;
      await this.storage.putObjectBuffer({
        key,
        body: out,
        contentType: 'video/mp4',
      });
      return { key, url: this.storage.buildCdnUrl(key), bytes: out.length };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
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
