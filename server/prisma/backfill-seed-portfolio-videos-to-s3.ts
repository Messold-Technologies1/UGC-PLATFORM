import { PrismaClient } from '@prisma/client';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import {
  resolveSampleVideoDownloadUrl,
  SAMPLE_VIDEOS,
} from './seed-sample-media';

const prisma = new PrismaClient();

const TEST_EMAIL_DOMAIN = 'test.gocollab.local';
const LOG_PREFIX = '[backfill-seed-media-s3]';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function readDryRun(): boolean {
  return (
    process.env.BACKFILL_SEED_MEDIA_S3_DRY_RUN === 'true' ||
    process.env.BACKFILL_PORTFOLIO_S3_DRY_RUN === 'true'
  );
}

function readScope(): string {
  return (
    process.env.BACKFILL_SEED_MEDIA_S3_SCOPE ??
    process.env.BACKFILL_PORTFOLIO_S3_SCOPE ??
    'test'
  );
}

function readLimit(): number {
  const raw =
    process.env.BACKFILL_SEED_MEDIA_S3_LIMIT ??
    process.env.BACKFILL_PORTFOLIO_S3_LIMIT ??
    '0';
  return Number.parseInt(raw, 10);
}

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    return `host=${u.host} db=${u.pathname.replace(/^\//, '') || '<no-db>'}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

function buildCdnUrl(cdnBaseUrl: string, key: string): string {
  const base = cdnBaseUrl.endsWith('/') ? cdnBaseUrl.slice(0, -1) : cdnBaseUrl;
  const safeKey = key.startsWith('/') ? key.slice(1) : key;
  return `${base}/${safeKey}`;
}

function extFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase().split(';')[0]?.trim();
  if (ct === 'video/mp4') return 'mp4';
  if (ct === 'video/quicktime') return 'mov';
  if (ct === 'video/webm') return 'webm';
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  return 'bin';
}

function isSeedKey(key: string | null | undefined): boolean {
  return Boolean(key?.startsWith('seed/'));
}

function needsPortfolioVideoBackfill(video: {
  videoKey: string;
  videoUrl: string;
}): boolean {
  if (isSeedKey(video.videoKey)) return true;
  if (!video.videoKey.startsWith('creator-portfolio/')) return true;
  if (video.videoUrl.includes('commondatastorage.googleapis.com')) return true;
  return false;
}

function needsPortfolioThumbnailBackfill(video: {
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
}): boolean {
  if (!video.thumbnailUrl) return false;
  if (isSeedKey(video.thumbnailKey)) return true;
  if (
    video.thumbnailKey &&
    !video.thumbnailKey.startsWith('creator-portfolio/')
  ) {
    return true;
  }
  if (video.thumbnailUrl.includes('i.pravatar.cc')) return true;
  return false;
}

function needsIntroVideoBackfill(profile: {
  introVideoKey: string | null;
  introVideoUrl: string | null;
}): boolean {
  if (!profile.introVideoUrl) return false;
  if (isSeedKey(profile.introVideoKey)) return true;
  if (
    profile.introVideoKey &&
    !profile.introVideoKey.startsWith('creator-profile/')
  ) {
    return true;
  }
  if (profile.introVideoUrl.includes('commondatastorage.googleapis.com')) {
    return true;
  }
  return false;
}

function needsProfileImageBackfill(profile: {
  profileImageKey: string | null;
  profileImageUrl: string | null;
}): boolean {
  if (!profile.profileImageUrl) return false;
  if (isSeedKey(profile.profileImageKey)) return true;
  if (
    profile.profileImageKey &&
    !profile.profileImageKey.startsWith('creator-profile/')
  ) {
    return true;
  }
  if (profile.profileImageUrl.includes('i.pravatar.cc')) return true;
  return false;
}

const downloadCache = new Map<string, Buffer>();

async function downloadUrl(url: string): Promise<{
  body: Buffer;
  contentType: string;
}> {
  const candidates = [
    resolveSampleVideoDownloadUrl(url),
    ...SAMPLE_VIDEOS.filter((sample) => sample !== resolveSampleVideoDownloadUrl(url)),
  ];

  let lastError: Error | undefined;
  for (const candidate of candidates) {
    const cached = downloadCache.get(candidate);
    if (cached) {
      return {
        body: cached,
        contentType: candidate.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
      };
    }

    try {
      const response = await fetch(candidate, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UGC-Platform-Seed/1.0)',
        },
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get('content-type')?.split(';')[0]?.trim() ??
        (candidate.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');

      downloadCache.set(candidate, body);
      if (candidate !== url) {
        console.log(
          `${LOG_PREFIX} resolved download ${url} -> ${candidate}`,
        );
      }
      return { body, contentType };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Failed to download ${candidate}`);
    }
  }

  throw new Error(
    `Failed to download ${url}${lastError ? `: ${lastError.message}` : ''}`,
  );
}

type S3Context = {
  s3: S3Client;
  bucket: string;
  cdnBaseUrl: string;
  dryRun: boolean;
};

async function uploadObject(
  ctx: S3Context,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (ctx.dryRun) return;
  await ctx.s3.send(
    new PutObjectCommand({
      Bucket: ctx.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

function testCreatorWhere(scope: string) {
  return scope === 'all'
    ? undefined
    : { user: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } };
}

async function backfillPortfolioVideos(
  ctx: S3Context,
  scope: string,
  limit: number,
): Promise<{
  uploadedVideos: number;
  uploadedThumbnails: number;
  skipped: number;
}> {
  const videos = await prisma.creatorPortfolioVideo.findMany({
    where: { creator: testCreatorWhere(scope) },
    select: {
      id: true,
      creatorId: true,
      videoKey: true,
      videoUrl: true,
      thumbnailKey: true,
      thumbnailUrl: true,
      creator: {
        select: {
          displayName: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    ...(limit > 0 ? { take: limit } : {}),
  });

  const pending = videos.filter(
    (video) =>
      needsPortfolioVideoBackfill(video) ||
      needsPortfolioThumbnailBackfill(video),
  );

  console.log(
    `${LOG_PREFIX} portfolio scope=${scope} candidates=${videos.length} pending=${pending.length}`,
  );

  let uploadedVideos = 0;
  let uploadedThumbnails = 0;
  let skipped = 0;

  for (const video of pending) {
    const label =
      `${video.creator.user.email} / ${video.creator.displayName} / ${video.id}`;

    if (
      !needsPortfolioVideoBackfill(video) &&
      !needsPortfolioThumbnailBackfill(video)
    ) {
      skipped += 1;
      continue;
    }

    const updates: {
      videoKey?: string;
      videoUrl?: string;
      thumbnailKey?: string | null;
      thumbnailUrl?: string | null;
    } = {};

    if (needsPortfolioVideoBackfill(video)) {
      const { body, contentType } = await downloadUrl(video.videoUrl);
      const ext = extFromContentType(contentType);
      const videoKey = `creator-portfolio/${video.creatorId}/videos/${randomUUID()}.${ext}`;
      await uploadObject(ctx, videoKey, body, contentType);
      updates.videoKey = videoKey;
      updates.videoUrl = buildCdnUrl(ctx.cdnBaseUrl, videoKey);
      uploadedVideos += 1;
      console.log(
        `${LOG_PREFIX} portfolio video ${ctx.dryRun ? '(dry-run) ' : ''}${label} -> ${videoKey}`,
      );
    }

    if (needsPortfolioThumbnailBackfill(video) && video.thumbnailUrl) {
      const { body, contentType } = await downloadUrl(video.thumbnailUrl);
      const ext = extFromContentType(contentType);
      const thumbnailKey = `creator-portfolio/${video.creatorId}/thumbnails/${randomUUID()}.${ext}`;
      await uploadObject(ctx, thumbnailKey, body, contentType);
      updates.thumbnailKey = thumbnailKey;
      updates.thumbnailUrl = buildCdnUrl(ctx.cdnBaseUrl, thumbnailKey);
      uploadedThumbnails += 1;
      console.log(
        `${LOG_PREFIX} portfolio thumb ${ctx.dryRun ? '(dry-run) ' : ''}${label} -> ${thumbnailKey}`,
      );
    }

    if (!ctx.dryRun && Object.keys(updates).length > 0) {
      await prisma.creatorPortfolioVideo.update({
        where: { id: video.id },
        data: updates,
      });
    }
  }

  return { uploadedVideos, uploadedThumbnails, skipped };
}

async function backfillCreatorProfiles(
  ctx: S3Context,
  scope: string,
  limit: number,
): Promise<{
  uploadedIntroVideos: number;
  uploadedProfileImages: number;
  skipped: number;
}> {
  const profiles = await prisma.creatorProfile.findMany({
    where: testCreatorWhere(scope),
    select: {
      id: true,
      displayName: true,
      introVideoKey: true,
      introVideoUrl: true,
      profileImageKey: true,
      profileImageUrl: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'asc' },
    ...(limit > 0 ? { take: limit } : {}),
  });

  const pending = profiles.filter(
    (profile) =>
      needsIntroVideoBackfill(profile) || needsProfileImageBackfill(profile),
  );

  console.log(
    `${LOG_PREFIX} profiles scope=${scope} candidates=${profiles.length} pending=${pending.length}`,
  );

  let uploadedIntroVideos = 0;
  let uploadedProfileImages = 0;
  let skipped = 0;

  for (const profile of pending) {
    const label = `${profile.user.email} / ${profile.displayName} / ${profile.id}`;

    if (
      !needsIntroVideoBackfill(profile) &&
      !needsProfileImageBackfill(profile)
    ) {
      skipped += 1;
      continue;
    }

    const updates: {
      introVideoKey?: string | null;
      introVideoUrl?: string | null;
      profileImageKey?: string | null;
      profileImageUrl?: string | null;
    } = {};

    if (needsIntroVideoBackfill(profile) && profile.introVideoUrl) {
      const { body, contentType } = await downloadUrl(profile.introVideoUrl);
      const ext = extFromContentType(contentType);
      const introVideoKey = `creator-profile/${profile.id}/intro/${randomUUID()}.${ext}`;
      await uploadObject(ctx, introVideoKey, body, contentType);
      updates.introVideoKey = introVideoKey;
      updates.introVideoUrl = buildCdnUrl(ctx.cdnBaseUrl, introVideoKey);
      uploadedIntroVideos += 1;
      console.log(
        `${LOG_PREFIX} intro video ${ctx.dryRun ? '(dry-run) ' : ''}${label} -> ${introVideoKey}`,
      );
    }

    if (needsProfileImageBackfill(profile) && profile.profileImageUrl) {
      const { body, contentType } = await downloadUrl(profile.profileImageUrl);
      const ext = extFromContentType(contentType);
      const profileImageKey = `creator-profile/${profile.id}/profile-image/${randomUUID()}.${ext}`;
      await uploadObject(ctx, profileImageKey, body, contentType);
      updates.profileImageKey = profileImageKey;
      updates.profileImageUrl = buildCdnUrl(ctx.cdnBaseUrl, profileImageKey);
      uploadedProfileImages += 1;
      console.log(
        `${LOG_PREFIX} profile image ${ctx.dryRun ? '(dry-run) ' : ''}${label} -> ${profileImageKey}`,
      );
    }

    if (!ctx.dryRun && Object.keys(updates).length > 0) {
      await prisma.creatorProfile.update({
        where: { id: profile.id },
        data: updates,
      });
    }
  }

  return { uploadedIntroVideos, uploadedProfileImages, skipped };
}

async function main(): Promise<void> {
  const dryRun = readDryRun();
  const scope = readScope();
  const limit = readLimit();

  const ctx: S3Context = {
    bucket: requireEnv('S3_BUCKET_NAME'),
    cdnBaseUrl: requireEnv('CDN_BASE_URL'),
    s3: new S3Client({
      region: requireEnv('AWS_REGION'),
      credentials: {
        accessKeyId: requireEnv('AWS_S3_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('AWS_S3_SECRET_ACCESS_KEY'),
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
    dryRun,
  };

  console.log(
    `${LOG_PREFIX} Starting scope=${scope} dryRun=${dryRun} limit=${limit || 'none'} (${dbFingerprint()})`,
  );

  const portfolio = await backfillPortfolioVideos(ctx, scope, limit);
  const profiles = await backfillCreatorProfiles(ctx, scope, limit);

  console.log(
    `${LOG_PREFIX} Done. ` +
      `portfolioVideos=${portfolio.uploadedVideos} portfolioThumbs=${portfolio.uploadedThumbnails} ` +
      `introVideos=${profiles.uploadedIntroVideos} profileImages=${profiles.uploadedProfileImages} ` +
      `skipped=${portfolio.skipped + profiles.skipped}`,
  );
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
