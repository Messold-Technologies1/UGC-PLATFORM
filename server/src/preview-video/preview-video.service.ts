import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PortfolioVisibilityStatus } from '@prisma/client';
import ffmpegStatic from 'ffmpeg-static';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';

// Prefer an explicit FFMPEG_PATH (set to the system ffmpeg in production —
// ffmpeg-static ships a glibc binary that can't run on Alpine/musl). Fall back
// to the bundled static binary for local dev, then to a PATH lookup. Mirrors
// WatermarkService so both encoders resolve ffmpeg the same way.
const ffmpegPath: string =
  process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string) || 'ffmpeg';

/**
 * Generates the small, faststart card-preview rendition used by the discovery
 * grid's hover-to-play. The source is the creator's "effective" preview video —
 * the intro video if present, else the newest PUBLIC, playable portfolio video
 * (matching what the card would otherwise fall back to; see the list query's
 * `orderBy: { createdAt: 'desc' }, take: 1`).
 *
 * Modeled on WatermarkService: download the source, run ffmpeg, upload the
 * result, and record the URL back on the row. Idempotent — a source that hasn't
 * changed since the last rendition is a no-op.
 */
@Injectable()
export class PreviewVideoService {
  private readonly logger = new Logger(PreviewVideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Resolve the S3 key of the video a creator's card preview should be built
   * from, or null when the creator has no eligible source video.
   */
  async resolveSourceKey(creatorId: string): Promise<string | null> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { introVideoKey: true },
    });
    if (!creator) return null;
    if (creator.introVideoKey) return creator.introVideoKey;

    // No intro → the newest public, playable portfolio video that actually has
    // an S3 object (Instagram link-only rows have no key and are skipped; the
    // card falls back to their raw URL until/if they mirror).
    const newest = await this.prisma.creatorPortfolioVideo.findFirst({
      where: {
        creatorId,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        videoKey: { not: null },
        ...playableAssetWhere(),
      },
      orderBy: { createdAt: 'desc' },
      select: { videoKey: true },
    });
    return newest?.videoKey ?? null;
  }

  /**
   * Build (or refresh) the card preview for one creator. Throws on encode/upload
   * failure so the queue can retry; the queue owns the status/attempt bookkeeping
   * on failure. On success this method flips the row to `ready`.
   */
  async generateForCreator(creatorId: string): Promise<void> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        previewVideoKey: true,
        previewVideoSourceKey: true,
      },
    });
    if (!creator) {
      this.logger.warn(`preview: creator ${creatorId} not found`);
      return;
    }

    const sourceKey = await this.resolveSourceKey(creatorId);

    // No eligible source — clear any stale rendition so the card doesn't keep
    // pointing at a preview whose source was removed.
    if (!sourceKey) {
      await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: {
          previewVideoKey: null,
          previewVideoUrl: null,
          previewVideoSourceKey: null,
          previewVideoStatus: 'ready',
          previewVideoUpdatedAt: new Date(),
        },
      });
      if (creator.previewVideoKey) {
        await this.storage
          .deleteObjectIfExists(creator.previewVideoKey)
          .catch(() => undefined);
      }
      return;
    }

    // Source unchanged and a rendition already exists — nothing to encode.
    if (
      sourceKey === creator.previewVideoSourceKey &&
      creator.previewVideoKey
    ) {
      await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: {
          previewVideoStatus: 'ready',
          previewVideoUpdatedAt: new Date(),
        },
      });
      return;
    }

    const source = await this.storage.getObjectBuffer(sourceKey);
    const out = await this.transcodePreview(source, sourceKey);

    const previewKey = `creator-profile/${creatorId}/preview/${randomUUID()}.mp4`;
    await this.storage.putObjectBuffer({
      key: previewKey,
      body: out,
      contentType: 'video/mp4',
    });
    const previewUrl = this.storage.buildCdnUrl(previewKey);

    await this.prisma.creatorProfile.update({
      where: { id: creatorId },
      data: {
        previewVideoKey: previewKey,
        previewVideoUrl: previewUrl,
        previewVideoSourceKey: sourceKey,
        previewVideoStatus: 'ready',
        previewVideoUpdatedAt: new Date(),
      },
    });

    // Best-effort cleanup of the superseded rendition.
    if (creator.previewVideoKey && creator.previewVideoKey !== previewKey) {
      await this.storage
        .deleteObjectIfExists(creator.previewVideoKey)
        .catch(() => undefined);
    }

    this.logger.log(
      `preview: creator ${creatorId} ready (${(out.length / 1024).toFixed(0)} KiB from ${sourceKey})`,
    );
  }

  /**
   * Downscale to <=720p (long edge preserved by scaling the height), drop audio
   * (card previews are muted), cap the clip length, and move the moov atom to
   * the front (`+faststart`) so the browser can begin playback after the first
   * few KB instead of buffering a whole raw upload.
   */
  private async transcodePreview(
    source: Buffer,
    sourceKey: string,
  ): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'preview-'));
    const srcExt = sourceKey.split('.').pop()?.toLowerCase() || 'mp4';
    const inPath = join(dir, `in.${srcExt}`);
    const outPath = join(dir, 'out.mp4');
    const maxDurationSec = Math.max(
      2,
      Number(process.env.PREVIEW_VIDEO_MAX_SECONDS) || 8,
    );
    try {
      await writeFile(inPath, source);
      await this.runFfmpeg([
        '-y',
        '-i',
        inPath,
        // Cap duration for a short hover clip — smaller object, faster start.
        '-t',
        String(maxDurationSec),
        // Cap the height at 720 (never upscale); -2 keeps width even for H.264.
        '-vf',
        "scale=-2:'min(720,ih)'",
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '28',
        '-pix_fmt',
        'yuv420p',
        // Muted previews — the audio track is dead weight.
        '-an',
        '-movflags',
        '+faststart',
        outPath,
      ]);
      return await readFile(outPath);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private runFfmpeg(args: string[]): Promise<void> {
    // Hard cap so a hung encode can't occupy a worker slot forever.
    const timeoutMs = Math.max(
      30_000,
      Number(process.env.PREVIEW_VIDEO_FFMPEG_TIMEOUT_MS) || 180_000,
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
        stderr = (stderr + d.toString()).slice(-4000);
      });
      proc.on('error', (err) => finish(() => reject(err)));
      proc.on('close', (code) => {
        finish(() => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
        });
      });
    });
  }
}
