import type { Metadata } from "next";
import { PublicPageDesignStudio } from "@/features/creators/components/public-page-settings/public-page-design-studio";

// Owner-only, and reflects unsaved selections; never cache it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your public page",
  robots: { index: false, follow: false },
};

/**
 * Lives outside the `(dashboard)` group so the preview fills the tab without
 * dashboard chrome around it. Still gated by the creator auth middleware.
 */
export default function CreatorPublicPageDesignPage() {
  return <PublicPageDesignStudio />;
}
