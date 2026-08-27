import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { PortfolioVideoAssetState, PortfolioVideoSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { InstagramMediaService } from '../social-connections/instagram-media.service';
import { PortfolioRealtimeNotifier } from '../realtime/portfolio-realtime.notifier';
import { PORTFOLIO_VIDEO_MAX_BYTES } from './dto/multipart-portfolio-upload.dto';

/**
 * Hosts Meta serves media from. The mirror fetches a URL from inside our
 * network, so the host is pinned rather than trusted: this is the one genuine
 * SSRF surface in the feature, even though the URL itself comes from Graph.
 */
const ALLOWED_CDN_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net'];

/** Content types we are willing to store as a portfolio video. */
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export class MirrorRejectedError extends Error {}

/**
 * Require an https URL on a Meta CDN host. Rejects anything else, so a
 * redirect or a malformed value cannot point the fetch at an internal address.
 */
export function assertMetaCdnUrl(raw: string | null | undefined): URL {
  if (!raw) throw new MirrorRejectedError('No media URL to mirror');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MirrorRejectedError('Media URL is not a valid URL');
  }
  if (url.protocol !== 'https:') {
    throw new MirrorRejectedError(
      `Refusing non-https media URL (${url.protocol})`,
    );
  }
  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_CDN_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  );
  if (!allowed) {
    throw new MirrorRejectedError(
      `Refusing media URL on unexpected host ${host}`,
    );
  }
  return url;
}

/**
 * Copies an imported reel's bytes from Instagram's CDN into our S3.
 *
 * Entirely server-side: unlike the browser upload path, where the API only
 * signs a URL and the bytes go device → S3, here the worker pulls from the CDN
 * and pushes to S3. The creator's device has no part in it, which is why an
 * import can return instantly and the row flips to READY later.
 */
@Injectable()
export class InstagramMirrorService {
  private readonly logger = new Logger(InstagramMirrorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly media: InstagramMediaService,
    private readonly realtime: PortfolioRealtimeNotifier,
  ) {}

  private timeoutMs(): number {
    return Math.max(
      1000,
      Number(this.config.get('IG_MIRROR_TIMEOUT_MS', 120_000)),
    );
  }

  /**
   * Mirror one imported video. Idempotent: the S3 key was generated when the
   * row was created, so a retry after a half-finished upload overwrites the
   * same object instead of orphaning it.
   */
  async mirrorVideo(videoId: string): Promise<void> {
    const video = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        creatorId: true,
        videoKey: true,
        thumbnailKey: true,
        igMediaId: true,
        assetState: true,
        source: true,
      },
    });
    if (!video) {
      this.logger.warn(`ig-mirror: video ${videoId} vanished before mirroring`);
      return;
    }
    if (video.source !== PortfolioVideoSource.INSTAGRAM) {
      this.logger.warn(
        `ig-mirror: video ${videoId} is not an import — skipping`,
      );
      return;
    }
    if (video.assetState === PortfolioVideoAssetState.READY) {
      return; // already mirrored; a duplicate job
    }
    if (!video.videoKey || !video.igMediaId) {
      await this.fail(videoId, 'Import row is missing its key or media id');
      return;
    }

    const item = await this.resolveFreshItem(video.creatorId, video.igMediaId);
    if (!item) {
      await this.fail(videoId, 'Reel is no longer in the Instagram cache');
      return;
    }

    const startedAt = Date.now();
    try {
      const { contentHash, bytes, contentType } = await this.streamToS3(
        assertMetaCdnUrl(item.mediaUrl),
        video.videoKey,
      );

      const thumbnailKey = await this.mirrorThumbnail(
        video.creatorId,
        item.thumbnailUrl,
        video.thumbnailKey,
      );

      // One write flips the row live. Nothing is READY until both objects are
      // actually in the bucket.
      await this.prisma.creatorPortfolioVideo.update({
        where: { id: videoId },
        data: {
          videoUrl: this.storage.buildCdnUrl(video.videoKey),
          thumbnailKey,
          thumbnailUrl: thumbnailKey
            ? this.storage.buildCdnUrl(thumbnailKey)
            : null,
          contentHash,
          assetState: PortfolioVideoAssetState.READY,
        },
      });

      this.logger.log(
        `ig-mirror: mirrored ${videoId} — ${Math.round(bytes / 1024)}KB ${contentType} in ${Date.now() - startedAt}ms`,
      );

      // Tell whoever is watching the grid that this tile can play now, rather
      // than leaving them to poll for it.
      await this.realtime.emitVideoAssetUpdated({
        videoId,
        creatorProfileId: video.creatorId,
        assetState: 'READY',
      });
    } catch (err) {
      const message = (err as Error)?.message ?? 'unknown error';
      // A rejected URL or content type will never succeed, so fail terminally
      // rather than burning three attempts on it.
      if (err instanceof MirrorRejectedError) {
        await this.fail(videoId, message);
        return;
      }
      this.logger.warn(
        `ig-mirror: ${videoId} failed after ${Date.now() - startedAt}ms — ${message}`,
      );
      throw err;
    }
  }

  /**
   * The cached signed URL may have aged out since the gallery was loaded. Refresh
   * the first page once and re-read before giving up.
   */
  private async resolveFreshItem(creatorId: string, igMediaId: string) {
    const find = () =>
      this.prisma.instagramMediaItem.findFirst({
        where: {
          igMediaId,
          connection: { creator: { id: creatorId } },
        },
        select: {
          mediaUrl: true,
          thumbnailUrl: true,
          urlsExpireAt: true,
          connectionId: true,
        },
      });

    let item = await find();
    if (!item) return null;

    const expired =
      !item.mediaUrl ||
      (item.urlsExpireAt != null && item.urlsExpireAt.getTime() < Date.now());
    if (expired) {
      this.logger.log(
        `ig-mirror: signed URL stale for ${igMediaId} — re-syncing first page`,
      );
      await this.media
        .refreshFirstPage(item.connectionId)
        .catch((err) =>
          this.logger.warn(
            `ig-mirror: URL refresh failed for ${igMediaId}: ${(err as Error)?.message}`,
          ),
        );
      item = await find();
    }
    return item;
  }

  /**
   * Fetch and stream into S3, hashing on the way through. The hash costs
   * nothing on a stream we are already reading, and it catches the mixed case
   * of a creator importing a reel and also uploading the same file by hand.
   */
  private async streamToS3(
    url: URL,
    key: string,
  ): Promise<{ contentHash: string; bytes: number; contentType: string }> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(this.timeoutMs()),
      // A redirect could walk us off the pinned host, so none are followed.
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) {
      throw new MirrorRejectedError(
        `Media URL redirected (${res.status}); refusing to follow it off the CDN`,
      );
    }
    if (!res.ok || !res.body) {
      throw new Error(`Instagram CDN returned ${res.status}`);
    }

    const contentType = (res.headers.get('content-type') ?? '')
      .split(';')[0]!
      .trim()
      .toLowerCase();
    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      throw new MirrorRejectedError(
        `Unexpected content type from the CDN: ${contentType || '(none)'}`,
      );
    }

    // Cheap guard before spending the bandwidth. The stream is capped as well,
    // in case the declared length was a lie.
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > PORTFOLIO_VIDEO_MAX_BYTES) {
      throw new MirrorRejectedError(
        `Reel is larger than the ${PORTFOLIO_VIDEO_MAX_BYTES} byte cap`,
      );
    }

    const hash = createHash('sha256');
    const source = Readable.fromWeb(res.body as never);
    source.on('data', (chunk: Buffer) => hash.update(chunk));

    const { bytes } = await this.storage.uploadStream({
      key,
      body: source,
      contentType,
      maxBytes: PORTFOLIO_VIDEO_MAX_BYTES,
    });

    return { contentHash: hash.digest('hex'), bytes, contentType };
  }

  /**
   * Thumbnails are ~50KB JPEGs, so they go through the buffer helper — there is
   * nothing to gain from streaming one. A missing thumbnail is not fatal: the
   * grid falls back to the video's own first frame.
   */
  private async mirrorThumbnail(
    creatorId: string,
    thumbnailUrl: string | null,
    key: string | null,
  ): Promise<string | null> {
    if (!thumbnailUrl || !key) return null;
    try {
      const url = assertMetaCdnUrl(thumbnailUrl);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs()),
        redirect: 'manual',
      });
      if (!res.ok) throw new Error(`CDN returned ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = (res.headers.get('content-type') ?? 'image/jpeg')
        .split(';')[0]!
        .trim();
      await this.storage.putObjectBuffer({ key, body: buffer, contentType });
      return key;
    } catch (err) {
      this.logger.warn(
        `ig-mirror: thumbnail mirror failed for creator ${creatorId}: ${(err as Error)?.message}`,
      );
      return null;
    }
  }

  /** Park the row as FAILED so the UI can offer a retry. */
  private async fail(videoId: string, reason: string): Promise<void> {
    this.logger.warn(`ig-mirror: ${videoId} failed terminally — ${reason}`);
    const updated = await this.prisma.creatorPortfolioVideo
      .update({
        where: { id: videoId },
        data: { assetState: PortfolioVideoAssetState.FAILED },
        select: { creatorId: true },
      })
      .catch(() => null);
    if (!updated) return;
    // A silent failure is worse than a loud one: without this the grid shows
    // "Processing" forever, because nothing else is going to change the row.
    await this.realtime.emitVideoAssetUpdated({
      videoId,
      creatorProfileId: updated.creatorId,
      assetState: 'FAILED',
    });
  }
}
