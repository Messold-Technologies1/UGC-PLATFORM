/** Matches Nest `PortfolioVideoResponseDto`. */
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
