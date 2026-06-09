import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
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
  if (ct === 'audio/webm') return 'webm';
  if (ct === 'audio/mp4') return 'm4a';
  if (ct === 'audio/mpeg') return 'mp3';
  if (ct === 'audio/ogg') return 'ogg';
  if (ct === 'audio/wav') return 'wav';
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function resolveMimeTypeFromObjectKey(key: string): string | null {
  const fileName = key.split('/').pop();
  const ext = fileName?.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null;
  if (!ext) return null;
  return MIME_BY_EXT[ext] ?? null;
}

function validateContentType(kind: StorageUploadKind, contentType: string): void {
  const ct = contentType.toLowerCase().split(';')[0]?.trim();
  const isImage =
    ct === 'image/jpeg' || ct === 'image/png' || ct === 'image/webp';
  const isVideo =
    ct === 'video/mp4' || ct === 'video/quicktime' || ct === 'video/webm';
  const isAudio =
    ct === 'audio/webm' ||
    ct === 'audio/mp4' ||
    ct === 'audio/mpeg' ||
    ct === 'audio/ogg' ||
    ct === 'audio/wav';

  if (
    kind === 'creator_intro_video' ||
    kind === 'creator_portfolio_video'
  ) {
    if (!isVideo) throw new Error('Unsupported video content type');
    return;
  }
  if (
    kind === 'creator_portfolio_thumbnail' ||
    kind === 'creator_profile_image' ||
    kind === 'brand_logo' ||
    kind === 'agency_logo' ||
    kind === 'brief_product_image'
  ) {
    if (!isImage) throw new Error('Unsupported image content type');
    return;
  }
  if (kind === 'order_delivery_asset') {
    if (!isImage && !isVideo) throw new Error('Unsupported delivery content type');
    return;
  }
  if (kind === 'brand_pronunciation_audio' || kind === 'order_chat_voice_message') {
    if (!isAudio) throw new Error('Unsupported audio content type');
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

  /** Lowercase trimmed email → stable folder segment for pre-account uploads. */
  signupEmailSegment(email: string): string {
    const normalized = email.trim().toLowerCase();
    return createHash('sha256').update(normalized).digest('hex');
  }

  buildTempCreatorPortfolioVideoKeyForSignup(
    email: string,
    contentType: string,
  ): string {
    validateContentType('creator_portfolio_video', contentType);
    const ext = extFromContentType(contentType);
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    const seg = this.signupEmailSegment(email);
    return `creator-portfolio-signup-temp/${seg}/${randomUUID()}.${ext}`;
  }

  isTempCreatorPortfolioVideoKeyForSignup(email: string, key: string): boolean {
    const seg = this.signupEmailSegment(email);
    return key.startsWith(`creator-portfolio-signup-temp/${seg}/`);
  }

  buildTempBrandLogoKeyForSignup(email: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brand-logo-signup-temp/${this.signupEmailSegment(email)}/${randomUUID()}.${ext}`;
  }

  isTempBrandLogoKeyForSignup(email: string, key: string): boolean {
    const seg = this.signupEmailSegment(email);
    return key.startsWith(`brand-logo-signup-temp/${seg}/`);
  }

  buildTempBrandPronunciationAudioKeyForSignup(
    email: string,
    extOrContentType: string,
  ): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brand-pronunciation-signup-temp/${this.signupEmailSegment(email)}/${randomUUID()}.${ext}`;
  }

  isTempBrandPronunciationAudioKeyForSignup(email: string, key: string): boolean {
    const seg = this.signupEmailSegment(email);
    return key.startsWith(`brand-pronunciation-signup-temp/${seg}/`);
  }

  buildTempAgencyLogoKeyForSignup(email: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `agency-logo-signup-temp/${this.signupEmailSegment(email)}/${randomUUID()}.${ext}`;
  }

  isTempAgencyLogoKeyForSignup(email: string, key: string): boolean {
    const seg = this.signupEmailSegment(email);
    return key.startsWith(`agency-logo-signup-temp/${seg}/`);
  }

  buildObjectKey(input: {
    kind: StorageUploadKind;
    userId: string;
    creatorProfileId?: string;
    brandProfileId?: string;
    agencyId?: string;
    briefId?: string;
    orderId?: string;
    revisionNumber?: number;
    contentType: string;
  }): string {
    validateContentType(input.kind, input.contentType);
    const ext = extFromContentType(input.contentType);
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    const id = randomUUID();

    if (input.kind === 'creator_intro_video') {
      const creatorId = input.creatorProfileId;
      if (!creatorId) {
        throw new Error('creatorProfileId is required');
      }
      return `creator-profile/${creatorId}/intro/${id}.${ext}`;
    }

    if (input.kind === 'creator_profile_image') {
      const creatorId = input.creatorProfileId;
      if (!creatorId) {
        throw new Error('creatorProfileId is required');
      }
      return `creator-profile/${creatorId}/profile-image/${id}.${ext}`;
    }

    if (input.kind === 'order_chat_voice_message') {
      const orderId = input.orderId;
      if (!orderId) throw new Error('orderId is required');
      return `order-chat-voice/${orderId}/${input.userId}/${id}.${ext}`;
    }

    if (input.kind === 'brand_logo') {
      const brandId = input.brandProfileId;
      if (brandId) {
        return `brand-logo/${brandId}/${id}.${ext}`;
      }
      return this.buildTempBrandLogoKey(input.userId, ext);
    }

    if (input.kind === 'agency_logo') {
      const agencyId = input.agencyId;
      if (agencyId) {
        return `agency-logo/${agencyId}/${id}.${ext}`;
      }
      return this.buildTempAgencyLogoKey(input.userId, ext);
    }

    if (input.kind === 'brand_pronunciation_audio') {
      const brandId = input.brandProfileId;
      if (brandId) {
        return `brand-pronunciation/${brandId}/${id}.${ext}`;
      }
      return this.buildTempBrandPronunciationAudioKey(input.userId, ext);
    }

    if (input.kind === 'brief_product_image') {
      const briefId = input.briefId;
      if (briefId) {
        return `brief-product/${briefId}/${id}.${ext}`;
      }
      return this.buildTempBriefProductImageKey(input.userId, ext);
    }

    if (input.kind === 'order_delivery_asset') {
      const orderId = input.orderId;
      if (!orderId) throw new Error('orderId is required');
      const rev =
        typeof input.revisionNumber === 'number' && Number.isFinite(input.revisionNumber)
          ? Math.max(0, Math.floor(input.revisionNumber))
          : 0;
      return `order-deliveries/${orderId}/r${rev}/${id}.${ext}`;
    }

    const creatorId = input.creatorProfileId;
    if (!creatorId) throw new Error('creatorProfileId is required');

    if (input.kind === 'creator_portfolio_video') {
      return `creator-portfolio/${creatorId}/videos/${id}.${ext}`;
    }
    return `creator-portfolio/${creatorId}/thumbnails/${id}.${ext}`;
  }

  buildTempBrandLogoKey(userId: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brand-logo-temp/${userId}/${randomUUID()}.${ext}`;
  }

  isTempBrandLogoKeyForUser(userId: string, key: string): boolean {
    return key.startsWith(`brand-logo-temp/${userId}/`);
  }

  buildTempAgencyLogoKey(userId: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `agency-logo-temp/${userId}/${randomUUID()}.${ext}`;
  }

  isTempAgencyLogoKeyForUser(userId: string, key: string): boolean {
    return key.startsWith(`agency-logo-temp/${userId}/`);
  }

  buildTempBrandPronunciationAudioKey(userId: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brand-pronunciation-temp/${userId}/${randomUUID()}.${ext}`;
  }

  isTempBrandPronunciationAudioKeyForUser(userId: string, key: string): boolean {
    return key.startsWith(`brand-pronunciation-temp/${userId}/`);
  }

  isOrderChatVoiceKeyForUser(orderId: string, userId: string, key: string): boolean {
    return key.startsWith(`order-chat-voice/${orderId}/${userId}/`);
  }

  mimeTypeFromObjectKey(key: string): string | null {
    return resolveMimeTypeFromObjectKey(key);
  }

  buildTempBriefProductImageKey(userId: string, extOrContentType: string): string {
    const ext =
      extOrContentType.includes('/')
        ? extFromContentType(extOrContentType)
        : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brief-product-temp/${userId}/${randomUUID()}.${ext}`;
  }

  isTempBriefProductImageKeyForUser(userId: string, key: string): boolean {
    return key.startsWith(`brief-product-temp/${userId}/`);
  }

  async finalizeCreatorPortfolioVideoFromTempKey(input: {
    tempKey: string;
    creatorProfileId: string;
    deleteTemp?: boolean;
  }): Promise<string> {
    const fileName = input.tempKey.split('/').pop();
    if (!fileName?.includes('.')) {
      throw new Error('Invalid temporary creator portfolio video key');
    }
    const finalKey = `creator-portfolio/${input.creatorProfileId}/videos/${fileName}`;

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

  async finalizeBrandLogoKey(input: {
    tempKey: string;
    brandProfileId: string;
    deleteTemp?: boolean;
  }): Promise<string> {
    const fileName = input.tempKey.split('/').pop();
    if (!fileName?.includes('.')) {
      throw new Error('Invalid temporary brand logo key');
    }
    const finalKey = `brand-logo/${input.brandProfileId}/${fileName}`;

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

  async finalizeAgencyLogoKey(input: {
    tempKey: string;
    agencyId: string;
    deleteTemp?: boolean;
  }): Promise<string> {
    const fileName = input.tempKey.split('/').pop();
    if (!fileName?.includes('.')) {
      throw new Error('Invalid temporary agency logo key');
    }
    const finalKey = `agency-logo/${input.agencyId}/${fileName}`;

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

  async finalizeBriefProductImageKey(input: {
    tempKey: string;
    briefId: string;
    deleteTemp?: boolean;
  }): Promise<string> {
    const fileName = input.tempKey.split('/').pop();
    if (!fileName?.includes('.')) {
      throw new Error('Invalid temporary brief product image key');
    }
    const finalKey = `brief-product/${input.briefId}/${fileName}`;

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

  async finalizeBrandPronunciationAudioKey(input: {
    tempKey: string;
    brandProfileId: string;
    deleteTemp?: boolean;
  }): Promise<string> {
    const fileName = input.tempKey.split('/').pop();
    if (!fileName?.includes('.')) {
      throw new Error('Invalid temporary brand pronunciation audio key');
    }
    const finalKey = `brand-pronunciation/${input.brandProfileId}/${fileName}`;

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

  async deleteObjectIfExists(key: string | null | undefined): Promise<void> {
    if (!key) return;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
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

