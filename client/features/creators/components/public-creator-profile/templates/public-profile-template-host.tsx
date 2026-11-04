"use client";

import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import type { CreatorProfileItemApi } from "../../../api/types";
import { resolvePublicPageTemplate } from "./registry";
import { usePublicProfileViewModel } from "./use-public-profile-view-model";

type PublicProfileTemplateHostProps = {
  profile: CreatorProfileItemApi;
  initialPortfolioVideos?: PortfolioVideoApi[];
  /**
   * Overrides the creator's saved template. Used by the settings preview so a
   * creator can try a design before applying it.
   */
  templateId?: string | null;
};

/**
 * Builds the view model once and renders whichever template the creator has
 * chosen. Keeps the public route free of template-selection logic.
 */
export function PublicProfileTemplateHost({
  profile,
  initialPortfolioVideos,
  templateId,
}: PublicProfileTemplateHostProps) {
  const model = usePublicProfileViewModel({ profile, initialPortfolioVideos });
  const template = resolvePublicPageTemplate(
    templateId ?? profile.publicPageTemplate,
  );
  const Template = template.Component;
  return <Template model={model} />;
}
