export type StorageUploadKind =
  | 'creator_profile_image'
  | 'creator_portfolio_video'
  | 'creator_portfolio_thumbnail';

export interface PresignedUploadResult {
  key: string;
  uploadUrl: string;
  /** Headers the client must send with the PUT/POST, if any. */
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
}

