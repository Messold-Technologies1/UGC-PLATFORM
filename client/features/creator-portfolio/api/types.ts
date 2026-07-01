
export type PortfolioVideoApi = {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  industryLabel?: string | null;
  tags: string[];
  language?: string | null;
  description?: string | null;
  visibilityStatus: "public" | "private";
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
  industryLabel?: string | null;
  tags: string[];
  language?: string | null;
  description?: string | null;
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
