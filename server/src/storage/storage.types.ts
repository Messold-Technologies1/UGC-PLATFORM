export type StorageUploadKind =
  | 'creator_intro_video'
  | 'creator_portfolio_video'
  | 'creator_portfolio_thumbnail'
  | 'brand_logo'
  | 'brand_pronunciation_audio'
  | 'brief_product_image'
  | 'order_delivery_asset';

export interface PresignedUploadResult {
  key: string;
  uploadUrl: string;
  /** Headers the client must send with the PUT/POST, if any. */
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
}

