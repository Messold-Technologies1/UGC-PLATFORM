import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { PassThrough } from 'node:stream';
import type { Readable } from 'node:stream';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  CompletedUploadPart,
  MultipartUploadInit,
  PresignedUploadResult,
  StorageUploadKind,
} from './storage.types';

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
  const ext = fileName?.includes('.')
    ? fileName.split('.').pop()?.toLowerCase()
    : null;
  if (!ext) return null;
  return MIME_BY_EXT[ext] ?? null;
}

function validateContentType(
  kind: StorageUploadKind,
  contentType: string,
): void {
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
    kind === 'creator_portfolio_video' ||
    kind === 'creator_demo_video'
  ) {
    if (!isVideo) throw new Error('Unsupported video content type');
    return;
  }
  if (
    kind === 'creator_portfolio_thumbnail' ||
    kind === 'creator_demo_video_thumbnail' ||
    kind === 'creator_profile_image' ||
    kind === 'brand_logo' ||
    kind === 'agency_logo' ||
    kind === 'brief_product_image'
  ) {
    if (!isImage) throw new Error('Unsupported image content type');
    return;
  }
  if (kind === 'order_delivery_asset') {
    if (!isImage && !isVideo)
      throw new Error('Unsupported delivery content type');
    return;
  }
  if (
    kind === 'brand_pronunciation_audio' ||
    kind === 'order_chat_voice_message'
  ) {
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
  /** Part size used for multipart uploads. S3 requires >= 5 MiB per part (last part exempt). */
  readonly multipartPartSizeBytes: number;

  constructor(private readonly config: ConfigService) {
    // Browser PUTs cannot satisfy SDK-default CRC32 checksums baked into presigned URLs.
    // WHEN_REQUIRED avoids signing x-amz-checksum-* into the URL for PutObject.
    this.s3 = new S3Client({
      region: config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_S3_SECRET_ACCESS_KEY'),
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    this.bucket = config.getOrThrow<string>('S3_BUCKET_NAME');
    this.ttlSeconds = Number(
      config.get<number>('S3_UPLOAD_URL_TTL_SECONDS', 900),
    );
    // Default 10 MiB parts. S3's floor is 5 MiB; clamp to stay valid even if
    // misconfigured. Each part gets its own presigned URL with its own TTL, so
    // large files are never bound by a single-PUT expiry window.
    const configuredPartSize = Number(
      config.get<number>('S3_MULTIPART_PART_SIZE_BYTES', 10 * 1024 * 1024),
    );
    this.multipartPartSizeBytes =
      Number.isFinite(configuredPartSize) &&
      configuredPartSize >= 5 * 1024 * 1024
        ? Math.floor(configuredPartSize)
        : 10 * 1024 * 1024;
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

  buildTempBrandLogoKeyForSignup(
    email: string,
    extOrContentType: string,
  ): string {
    const ext = extOrContentType.includes('/')
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
    const ext = extOrContentType.includes('/')
      ? extFromContentType(extOrContentType)
      : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brand-pronunciation-signup-temp/${this.signupEmailSegment(email)}/${randomUUID()}.${ext}`;
  }

  isTempBrandPronunciationAudioKeyForSignup(
    email: string,
    key: string,
  ): boolean {
    const seg = this.signupEmailSegment(email);
    return key.startsWith(`brand-pronunciation-signup-temp/${seg}/`);
  }

  buildTempAgencyLogoKeyForSignup(
    email: string,
    extOrContentType: string,
  ): string {
    const ext = extOrContentType.includes('/')
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

    if (input.kind === 'creator_demo_video') {
      return `creator-demo-videos/${id}.${ext}`;
    }

    if (input.kind === 'creator_demo_video_thumbnail') {
      return `creator-demo-videos/thumbnails/${id}.${ext}`;
    }

    if (input.kind === 'order_delivery_asset') {
      const orderId = input.orderId;
      if (!orderId) throw new Error('orderId is required');
      const rev =
        typeof input.revisionNumber === 'number' &&
        Number.isFinite(input.revisionNumber)
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
    const ext = extOrContentType.includes('/')
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
    const ext = extOrContentType.includes('/')
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

  buildTempBrandPronunciationAudioKey(
    userId: string,
    extOrContentType: string,
  ): string {
    const ext = extOrContentType.includes('/')
      ? extFromContentType(extOrContentType)
      : extOrContentType.toLowerCase();
    if (!ext) {
      throw new Error('Unsupported content type');
    }
    return `brand-pronunciation-temp/${userId}/${randomUUID()}.${ext}`;
  }

  isTempBrandPronunciationAudioKeyForUser(
    userId: string,
    key: string,
  ): boolean {
    return key.startsWith(`brand-pronunciation-temp/${userId}/`);
  }

  isOrderChatVoiceKeyForUser(
    orderId: string,
    userId: string,
    key: string,
  ): boolean {
    return key.startsWith(`order-chat-voice/${orderId}/${userId}/`);
  }

  mimeTypeFromObjectKey(key: string): string | null {
    return resolveMimeTypeFromObjectKey(key);
  }

  buildTempBriefProductImageKey(
    userId: string,
    extOrContentType: string,
  ): string {
    const ext = extOrContentType.includes('/')
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

  /**
   * Begin a multipart upload. The browser then uploads the file in parts, each
   * against its own presigned URL (see {@link signUploadPart}), and finally
   * calls {@link completeMultipartUpload}. This is how large videos upload
   * without hitting the single-PUT presigned-URL expiry.
   */
  async createMultipartUpload(input: {
    key: string;
    contentType: string;
  }): Promise<MultipartUploadInit> {
    const res = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
      }),
    );
    if (!res.UploadId) {
      throw new Error('Failed to initiate multipart upload');
    }
    return {
      key: input.key,
      uploadId: res.UploadId,
      cdnUrl: this.buildCdnUrl(input.key),
      partSizeBytes: this.multipartPartSizeBytes,
      expiresInSeconds: this.ttlSeconds,
    };
  }

  /** Presign a single UploadPart request. Part numbers are 1-based (1..10000). */
  async signUploadPart(input: {
    key: string;
    uploadId: string;
    partNumber: number;
  }): Promise<string> {
    return getSignedUrl(
      this.s3,
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: input.key,
        UploadId: input.uploadId,
        PartNumber: input.partNumber,
      }),
      { expiresIn: this.ttlSeconds },
    );
  }

  /** Finalize a multipart upload once every part has been uploaded. */
  async completeMultipartUpload(input: {
    key: string;
    uploadId: string;
    parts: CompletedUploadPart[];
  }): Promise<string> {
    if (input.parts.length === 0) {
      throw new Error('Cannot complete a multipart upload with no parts');
    }
    const orderedParts = [...input.parts]
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((part) => ({ ETag: part.etag, PartNumber: part.partNumber }));

    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: input.key,
        UploadId: input.uploadId,
        MultipartUpload: { Parts: orderedParts },
      }),
    );
    return input.key;
  }

  /** Cancel a multipart upload and discard any uploaded parts. */
  async abortMultipartUpload(input: {
    key: string;
    uploadId: string;
  }): Promise<void> {
    await this.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: input.key,
        UploadId: input.uploadId,
      }),
    );
  }

  /**
   * Build the S3 key for a brand-facing watermarked preview of a delivery
   * asset. The preview uses a fresh UUID (NOT derived from the source key) so a
   * brand cannot guess the original, un-watermarked object key from the preview
   * URL before accepting the order.
   */
  buildDeliveryPreviewKey(sourceKey: string, extOverride?: string): string {
    const fileName = sourceKey.split('/').pop() ?? '';
    const srcExt = fileName.includes('.') ? fileName.split('.').pop()! : 'bin';
    const ext = (extOverride ?? srcExt).toLowerCase();
    const dir = sourceKey.slice(0, sourceKey.length - fileName.length);
    // e.g. order-deliveries/<orderId>/r0/preview/<uuid>.<ext>
    return `${dir}preview/${randomUUID()}.${ext}`;
  }

  /** Download an object from S3 into an in-memory buffer. */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = res.Body as Readable | undefined;
    if (!body) {
      throw new Error(`Empty object body for key: ${key}`);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(
        typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk),
      );
    }
    return Buffer.concat(chunks);
  }

  /**
   * Stream a body straight into S3 via multipart, so memory stays flat at
   * roughly one part regardless of how large the source is. Used by the
   * Instagram mirror, where the source is a CDN response of unknown size.
   *
   * Returns the number of bytes written, since a streamed upload is the one
   * case where the caller cannot know the size up front.
   */
  async uploadStream(input: {
    key: string;
    body: Readable;
    contentType: string;
    /** Abort past this many bytes, in case a declared length was a lie. */
    maxBytes?: number;
  }): Promise<{ key: string; bytes: number }> {
    let bytes = 0;
    const counted = new PassThrough();
    let aborted: Error | null = null;

    input.body.on('data', (chunk: Buffer | string) => {
      bytes += Buffer.byteLength(chunk);
      if (input.maxBytes != null && bytes > input.maxBytes) {
        aborted = new Error(
          `Stream exceeded ${input.maxBytes} bytes — aborting upload`,
        );
        input.body.destroy(aborted);
      }
    });
    input.body.pipe(counted);

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: input.key,
        Body: counted,
        ContentType: input.contentType,
      },
      queueSize: 4,
      partSize: this.multipartPartSizeBytes,
    });

    try {
      await upload.done();
    } catch (err) {
      // Clean up the partial object: a failed multipart otherwise leaves an
      // incomplete upload the orphan sweeper cannot see.
      await this.deleteObjectIfExists(input.key).catch(() => undefined);
      throw aborted ?? err;
    }
    if (aborted) {
      await this.deleteObjectIfExists(input.key).catch(() => undefined);
      throw aborted;
    }
    return { key: input.key, bytes };
  }

  /** Raw S3 client, for callers that need a command this service does not wrap. */
  rawClient(): S3Client {
    return this.s3;
  }

  /** Bucket this service writes to. */
  bucketName(): string {
    return this.bucket;
  }

  /** Upload a buffer to S3 under the given key. */
  async putObjectBuffer(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return input.key;
  }
}
