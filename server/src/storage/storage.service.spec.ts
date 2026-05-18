import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://signed.example.com/upload'),
}));

const sendMock = jest.fn(async () => ({}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn(() => ({ send: sendMock })),
  };
});

describe('StorageService', () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        S3_BUCKET_NAME: 'bucket',
        CDN_BASE_URL: 'https://cdn.example.com/',
      };
      const value = map[key];
      if (!value) throw new Error(`Missing ${key}`);
      return value;
    }),
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'S3_UPLOAD_URL_TTL_SECONDS') return 900;
      return fallback as any;
    }),
  };

  it('builds a CDN url for a key', () => {
    const storage = new StorageService(config as any);
    expect(storage.buildCdnUrl('creator-profile/u1/a.jpg')).toBe(
      'https://cdn.example.com/creator-profile/u1/a.jpg',
    );
  });

  it('buildObjectKey creates a creator intro video key (existing profile)', () => {
    const storage = new StorageService(config as any);
    const key = storage.buildObjectKey({
      kind: 'creator_intro_video',
      userId: 'u1',
      creatorProfileId: 'c1',
      contentType: 'video/mp4',
    });
    expect(key.startsWith('creator-profile/c1/intro/')).toBe(true);
    expect(key.endsWith('.mp4')).toBe(true);
  });

  it('buildObjectKey creates a temporary creator intro video key', () => {
    const storage = new StorageService(config as any);
    const key = storage.buildObjectKey({
      kind: 'creator_intro_video',
      userId: 'u1',
      contentType: 'video/mp4',
    });
    expect(key.startsWith('creator-profile-intro-temp/u1/')).toBe(true);
    expect(key.endsWith('.mp4')).toBe(true);
  });

  it('finalizes temporary creator intro video key', async () => {
    const storage = new StorageService(config as any);
    const finalKey = await storage.finalizeCreatorIntroVideoKey({
      tempKey: 'creator-profile-intro-temp/u1/a.mp4',
      creatorProfileId: 'c1',
    });
    expect(finalKey).toBe('creator-profile/c1/intro/a.mp4');
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('deletes an object when a key is provided', async () => {
    sendMock.mockClear();
    const storage = new StorageService(config as any);
    await storage.deleteObjectIfExists('brand-logo/b1/a.jpg');
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('buildObjectKey creates a temporary brand pronunciation audio key', () => {
    const storage = new StorageService(config as any);
    const key = storage.buildObjectKey({
      kind: 'brand_pronunciation_audio',
      userId: 'u1',
      contentType: 'audio/webm',
    });
    expect(key.startsWith('brand-pronunciation-temp/u1/')).toBe(true);
    expect(key.endsWith('.webm')).toBe(true);
  });

  it('buildObjectKey creates a temporary brief product image key', () => {
    const storage = new StorageService(config as any);
    const key = storage.buildObjectKey({
      kind: 'brief_product_image',
      userId: 'u1',
      contentType: 'image/png',
    });
    expect(key.startsWith('brief-product-temp/u1/')).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
  });

  it('finalizes temporary brief product image key', async () => {
    sendMock.mockClear();
    const storage = new StorageService(config as any);
    const finalKey = await storage.finalizeBriefProductImageKey({
      tempKey: 'brief-product-temp/u1/a.png',
      briefId: 'b1',
    });
    expect(finalKey).toBe('brief-product/b1/a.png');
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('creates a presigned PUT upload result', async () => {
    const storage = new StorageService(config as any);
    const res = await storage.createPresignedPutUpload({
      key: 'creator-profile/c1/intro/a.mp4',
      contentType: 'video/mp4',
      contentLength: 10,
    });
    expect(res.uploadUrl).toBe('https://signed.example.com/upload');
    expect(res.headers['Content-Type']).toBe('video/mp4');
    expect(res.cdnUrl).toBe('https://cdn.example.com/creator-profile/c1/intro/a.mp4');
  });
});
