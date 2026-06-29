import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import ffmpegStatic from 'ffmpeg-static';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OrderRealtimeNotifier } from '../realtime/order-realtime.notifier';

// Prefer an explicit FFMPEG_PATH (set to the system ffmpeg in production —
// ffmpeg-static ships a glibc binary that can't run on Alpine/musl). Fall back
// to the bundled static binary for local dev, then to a PATH lookup.
const ffmpegPath: string =
  process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string) || 'ffmpeg';

/** Shape of a delivery asset as persisted in OrderDelivery.assets JSON. */
export interface StoredDeliveryAsset {
  key: string;
  kind: 'video' | 'image';
  url: string;
  sha256?: string | null;
  previewKey?: string | null;
  previewUrl?: string | null;
}

function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    case 'mp4':
    default:
      return 'video/mp4';
  }
}

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);
  private readonly text: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly realtime: OrderRealtimeNotifier,
    config: ConfigService,
  ) {
    this.text = config.get<string>('WATERMARK_TEXT', 'Go Collab');
  }

  /**
   * Generate watermarked preview copies for every asset of a delivery and
   * record their URLs back onto the delivery. Idempotent: assets that already
   * have a preview are skipped, so retries/reconciles are safe.
   */
  async watermarkDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.orderDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        orderId: true,
        revisionNumber: true,
        assets: true,
        order: { select: { acceptedAt: true } },
      },
    });

    if (!delivery) {
      this.logger.warn(`watermark: delivery ${deliveryId} not found`);
      return;
    }

    // Once accepted the brand is entitled to the raw files — nothing to do.
    if (delivery.order?.acceptedAt) {
      await this.markStatus(deliveryId, 'ready');
      return;
    }

    const assets = this.parseAssets(delivery.assets);
    if (assets.length === 0) {
      await this.markStatus(deliveryId, 'ready');
      return;
    }

    try {
      let changed = false;
      for (const asset of assets) {
        if (asset.previewUrl && asset.previewKey) continue; // already done
        const { previewKey, previewUrl } = await this.buildPreviewForAsset(asset);
        asset.previewKey = previewKey;
        asset.previewUrl = previewUrl;
        changed = true;
      }

      if (changed) {
        await this.prisma.orderDelivery.update({
          where: { id: deliveryId },
          data: { assets: assets as unknown as object, previewStatus: 'ready' },
        });
      } else {
        await this.markStatus(deliveryId, 'ready');
      }
      this.logger.log(`watermark: delivery ${deliveryId} ready (${assets.length} assets)`);

      // Real-time nudge so the brand UI refetches without a manual reload.
      await this.realtime
        .emitDeliveryWatermarkReady({
          orderId: delivery.orderId,
          revisionNumber: delivery.revisionNumber,
        })
        .catch((err) =>
          this.logger.warn(
            `watermark: realtime notify failed for ${deliveryId}: ${(err as Error)?.message}`,
          ),
        );
    } catch (err) {
      await this.markStatus(deliveryId, 'failed').catch(() => undefined);
      this.logger.error(
        `watermark: delivery ${deliveryId} failed: ${(err as Error)?.message}`,
      );
      throw err; // let the queue retry
    }
  }

  private async markStatus(
    deliveryId: string,
    status: 'pending' | 'ready' | 'failed',
  ): Promise<void> {
    await this.prisma.orderDelivery.update({
      where: { id: deliveryId },
      data: { previewStatus: status },
    });
  }

  private parseAssets(value: unknown): StoredDeliveryAsset[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
      .map((a): StoredDeliveryAsset => ({
        key: String(a.key ?? ''),
        kind: a.kind === 'image' ? 'image' : 'video',
        url: String(a.url ?? ''),
        sha256: typeof a.sha256 === 'string' ? a.sha256 : null,
        previewKey: typeof a.previewKey === 'string' ? a.previewKey : null,
        previewUrl: typeof a.previewUrl === 'string' ? a.previewUrl : null,
      }))
      .filter((a) => a.key);
  }

  private async buildPreviewForAsset(
    asset: StoredDeliveryAsset,
  ): Promise<{ previewKey: string; previewUrl: string }> {
    const source = await this.storage.getObjectBuffer(asset.key);

    if (asset.kind === 'image') {
      const out = await this.watermarkImage(source);
      const previewKey = this.storage.buildDeliveryPreviewKey(asset.key);
      await this.storage.putObjectBuffer({
        key: previewKey,
        body: out,
        contentType: contentTypeForKey(previewKey),
      });
      return { previewKey, previewUrl: this.storage.buildCdnUrl(previewKey) };
    }

    // video — normalize the preview container to mp4/H.264 for broad playback.
    const out = await this.watermarkVideo(source, asset.key);
    const previewKey = this.storage.buildDeliveryPreviewKey(asset.key, 'mp4');
    await this.storage.putObjectBuffer({
      key: previewKey,
      body: out,
      contentType: 'video/mp4',
    });
    return { previewKey, previewUrl: this.storage.buildCdnUrl(previewKey) };
  }

  /** A transparent SVG that tiles the watermark text diagonally. */
  private watermarkSvg(width: number, height: number): Buffer {
    const fontSize = Math.max(20, Math.round(Math.min(width, height) / 16));
    const tileW = fontSize * 9;
    const tileH = fontSize * 6;
    const safe = this.text.replace(/[&<>]/g, '');
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs>
          <pattern id="wm" width="${tileW}" height="${tileH}" patternTransform="rotate(-30)" patternUnits="userSpaceOnUse">
            <text x="0" y="${Math.round(tileH / 2)}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}" fill="rgba(255,255,255,0.32)" stroke="rgba(0,0,0,0.18)" stroke-width="1">${safe}</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wm)"/>
      </svg>`,
    );
  }

  private async watermarkImage(source: Buffer): Promise<Buffer> {
    const img = sharp(source, { failOn: 'none' });
    const meta = await img.metadata();
    const width = meta.width ?? 1080;
    const height = meta.height ?? 1080;
    const overlay = await sharp(this.watermarkSvg(width, height)).png().toBuffer();
    return img
      .composite([{ input: overlay, top: 0, left: 0 }])
      .jpeg({ quality: 82 })
      .toBuffer();
  }

  private async watermarkVideo(source: Buffer, sourceKey: string): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'wm-'));
    const srcExt = sourceKey.split('.').pop()?.toLowerCase() || 'mp4';
    const inPath = join(dir, `in.${srcExt}`);
    const wmPath = join(dir, 'wm.png');
    const outPath = join(dir, 'out.mp4');
    try {
      await writeFile(inPath, source);
      // Square watermark canvas; scale2ref (no w/h args) stretches it to the
      // video's actual dimensions so the tiled text covers the whole frame,
      // whether the video is landscape or a vertical reel.
      const wmPng = await sharp(this.watermarkSvg(1080, 1080)).png().toBuffer();
      await writeFile(wmPath, wmPng);

      await this.runFfmpeg([
        '-y',
        '-i',
        inPath,
        '-i',
        wmPath,
        '-filter_complex',
        // [1:v]=watermark scaled to match [0:v]=video, then overlaid full-frame.
        '[1:v][0:v]scale2ref[wm][base];[base][wm]overlay=0:0:format=auto',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '26',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'copy',
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
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr?.on('data', (d) => {
        // keep only the tail to avoid unbounded memory on long encodes
        stderr = (stderr + d.toString()).slice(-4000);
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      });
    });
  }
}
