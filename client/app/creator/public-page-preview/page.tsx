import type { Metadata } from "next";
import { PublicPagePreview } from "@/features/creators/components/public-page-settings/public-page-preview";

// Owner-only preview of an unsaved template choice; never cache it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public page preview",
  robots: { index: false, follow: false },
};

/**
 * Renders the signed-in creator's own public profile with a template override.
 *
 * Lives outside the `(dashboard)` route group so it carries no dashboard
 * chrome — the picker embeds it in an iframe, and what a creator sees here is
 * exactly what a brand sees on the live page.
 */
export default function PublicPagePreviewPage() {
  return <PublicPagePreview />;
}
