export type PortfolioVideoApi = {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  visibilityStatus: "public" | "private";
  /** UPLOAD, INSTAGRAM for an imported reel, or ORDER for a Brand Collab. */
  source?: "UPLOAD" | "INSTAGRAM" | "ORDER";
  /**
   * True for a Brand Collab tile auto-published from a completed order. Render
   * the "Brand Collab" badge and hide the delete control (see `deletable`).
   */
  brandCollab?: boolean;
  /** Brand this collab was for, for the "Brand Collab · {brand}" badge. */
  brandName?: string | null;
  /**
   * False for Brand Collab videos, which cannot be deleted (only hidden via the
   * visibility toggle). Hide the delete control when this is false.
   */
  deletable?: boolean;
  /**
   * Whether the bytes are servable. PROCESSING means an import's mirror is
   * still running and there is no videoUrl yet; FAILED means it gave up and the
   * creator can retry.
   */
  assetState?: "READY" | "PROCESSING" | "FAILED" | "LINK_ONLY";
  igPermalink?: string | null;
  createdAt: string;
};

export type PortfolioApiRequestOptions = {
  adminCreatorId?: string;
};

export type PortfolioSectionVideoApi = {
  videoId: string;
  position: number;
  videoUrl: string;
  thumbnailUrl?: string | null;
  visibilityStatus: "public" | "private";
};

export type PortfolioSectionApi = {
  id: string;
  creatorId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  videos: PortfolioSectionVideoApi[];
};
