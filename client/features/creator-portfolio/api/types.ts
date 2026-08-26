export type PortfolioVideoApi = {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  visibilityStatus: "public" | "private";
  /** UPLOAD, or INSTAGRAM for an imported reel. */
  source?: "UPLOAD" | "INSTAGRAM";
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
