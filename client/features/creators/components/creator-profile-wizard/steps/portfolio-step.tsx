"use client";

import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import { PortfolioGrid } from "@/features/creators/components/creator-profile-update/portfolio-components";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

const IDEAS = [
  {
    title: "A 30-second honest review",
    body: "Most requested format by brands this month.",
  },
  {
    title: "A hands-on product demo",
    body: "Show the product being used, not just held.",
  },
  {
    title: "One video in each language",
    body: "Proves the languages on your profile.",
  },
];

export type PortfolioStepProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  videos: PortfolioVideoApi[];
  onAdd: () => void;
  onEdit: (video: PortfolioVideoApi) => void;
  onDelete: (video: PortfolioVideoApi) => void;
};

export function PortfolioStep({
  loading,
  error,
  onRetry,
  videos,
  onAdd,
  onEdit,
  onDelete,
}: PortfolioStepProps) {
  const publicCount = videos.filter((v) => v.visibilityStatus === "public").length;
  return (
    <div className="cw-card">
      {publicCount < 3 ? (
        <div className="cw-portfolio-note">
          Upload at least 3 approved videos to go live. {publicCount} of 10
          uploaded so far — creators with 10+ pieces get 3× more orders.
        </div>
      ) : null}

      {loading ? (
        <CatalogStatus loading error={false} label="portfolio videos" onRetry={onRetry} />
      ) : error ? (
        <CatalogStatus loading={false} error label="portfolio videos" onRetry={onRetry} />
      ) : (
        <PortfolioGrid
          videos={videos}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      )}

      <div className="cw-hr" />

      <div className="cw-facet">
        <div className="cw-facet-label">
          <span>Need ideas for your next upload?</span>
        </div>
        <div className="cw-ideas">
          {IDEAS.map((idea) => (
            <div key={idea.title} className="cw-idea">
              <div className="cw-idea-title">{idea.title}</div>
              <div className="cw-idea-body">{idea.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
