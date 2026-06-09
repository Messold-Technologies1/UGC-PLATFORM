export type StorageUploadKind =
  | 'creator_intro_video'
  | 'creator_profile_image'
  | 'creator_portfolio_video'
  | 'creator_portfolio_thumbnail'
  | 'brand_logo'
  | 'agency_logo'
  | 'brand_pronunciation_audio'
  | 'brief_product_image'
  | 'order_delivery_asset'
  | 'order_chat_voice_message';

export interface PresignedUploadResult {
  key: string;
  uploadUrl: string;
  /** Headers the client must send with the PUT/POST, if any. */
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
}

