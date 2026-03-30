import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PresignedUploadResult, StorageUploadKind } from './storage.types';

function normalizeCdnBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function extFromContentType(contentType: string): string | null {
  const ct = contentType.toLowerCase().split(';')[0]?.trim();
  if (!ct) return null;
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'video/mp4') return 'mp4';
  if (ct === 'video/quicktime') return 'mov';
  if (ct === 'video/webm') return 'webm';
  return null;
}

function validateContentType(kind: StorageUploadKind, contentType: string): void {
  const ct = contentType.toLowerCase().split(';')[0]?.trim();
  const isImage =
    ct === 'image/jpeg' || ct === 'image/png' || ct === 'image/webp';
  const isVideo =
    ct === 'video/mp4' || ct === 'video/quicktime' || ct === 'video/webm';

  if (kind === 'creator_profile_image' || kind === 'creator_portfolio_thumbnail') {
    if (!isImage) throw new Error('Unsupported image content type');
    return;
  }
  if (kind === 'creator_portfolio_video') {
    if (!isVideo) throw new Error('Unsupported video content type');
    return;
  }
  throw new Error('Unsupported upload kind');
}

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly ttlSeconds: number;
  private readonly cdnBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    // Browser PUTs cannot satisfy SDK-default CRC32 checksums baked into presigned URLs.
    // WHEN_REQUIRED avoids signing x-amz-checksum-* into the URL for PutObject.
    this.s3 = new S3Client({
      region: config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    this.bucket = config.getOrThrow<string>('S3_BUCKET_NAME');
    this.ttlSeconds = Number(
      config.get<number>('S3_UPLOAD_URL_TTL_SECONDS', 900),
    );
    this.cdnBaseUrl = normalizeCdnBaseUrl(
      config.getOrThrow<string>('CDN_BASE_URL'),
    );
  }

  buildCdnUrl(key: string): string {
    const safeKey = key.startsWith('/') ? key.slice(1) : key;
    return `${this.cdnBaseUrl}/${safeKey}`;
  }

  buildObjectKey(input: {
    kind: StorageUploadKind;
    userId: string;
    creatorProfileId?: string;
    contentType: string;
  }): string {
    validateContentType(input.kind, input.contentType);
    const ext = extFromContentType(input.contentType);
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    const id = randomUUID();

    if (input.kind === 'creator_profile_image') {
      const creatorId = input.creatorProfileId;
      if (creatorId) {
        return `creator-profile/${creatorId}/${id}.${ext}`;
      }
      return this.buildTempCreatorProfileImageKey(input.userId, ext);
    }

    const creatorId = input.creatorProfileId;
    if (!creatorId) throw new Error('creatorProfileId is required');

    if (input.kind === 'creator_portfolio_video') {
      return `creator-portfolio/${creatorId}/videos/${id}.${ext}`;
    }
    return `creator-portfolio/${creatorId}/thumbnails/${id}.${ext}`;
  }

  buildTempCreatorProfileImageKey(userId: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `creator-profile-temp/${userId}/${randomUUID()}.${ext}`;
  }

  isTempCreatorProfileImageKeyForUser(userId: string, key: string): boolean {
    return key.startsWith(`creator-profile-temp/${userId}/`);
  }

  async finalizeCreatorProfileImageKey(input: {
    tempKey: string;
    creatorProfileId: string;
    deleteTemp?: boolean;
  }): Promise<string> {
    const fileName = input.tempKey.split('/').pop();
    if (!fileName?.includes('.')) {
      throw new Error('Invalid temporary profile image key');
    }
    const finalKey = `creator-profile/${input.creatorProfileId}/${fileName}`;

    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: finalKey,
        CopySource: `${this.bucket}/${input.tempKey}`,
      }),
    );

    if (input.deleteTemp ?? true) {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: input.tempKey,
        }),
      );
    }

    return finalKey;
  }

  async createPresignedPutUpload(input: {
    key: string;
    contentType: string;
    contentLength?: number;
  }): Promise<PresignedUploadResult> {
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
      { expiresIn: this.ttlSeconds },
    );

    return {
      key: input.key,
      uploadUrl,
      headers: {
        'Content-Type': input.contentType,
      },
      expiresInSeconds: this.ttlSeconds,
      cdnUrl: this.buildCdnUrl(input.key),
    };
  }
}

