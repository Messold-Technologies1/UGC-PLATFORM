import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicPortfolioVideosByCreatorIdServer } from "@/features/creator-portfolio/api/fetch-public-portfolio-videos.server";
import { fetchCreatorProfileByPublicSlug } from "@/features/creators/api/fetch-creator-profile-by-slug";
import { PublicCreatorProfile } from "@/features/creators/components/public-creator-profile/public-creator-profile";

// Auth-aware (owner can view pending profile); never statically cache this route.
export const dynamic = "force-dynamic";

const RESERVED_PUBLIC_SLUGS = new Set([
  "brands",
  "creators",
  "about",
  "contact",
  "legal",
  "login",
  "register",
  "admin",
  "brand",
  "creator",
  "wishlists",
  "api",
]);

interface PageProps {
  params: Promise<{ displayName: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { displayName } = await params;
  if (RESERVED_PUBLIC_SLUGS.has(displayName.toLowerCase())) {
    return { title: "Page not found" };
  }
  const result = await fetchCreatorProfileByPublicSlug(displayName);
  if (!result.ok) return { title: "Creator" };

  // Creators are anonymous to brands — the title/description never carry the
  // real name or the opaque slug. Lead with the niche when available.
  const niche = result.profile.facetSelections?.find(
    (f) => f.dimension === "CONTENT_CATEGORY",
  )?.label;
  const title = niche
    ? `${niche} Creator · GoCollab`
    : "UGC Creator · GoCollab";
  return {
    title,
    description:
      result.profile.bio?.slice(0, 160) ??
      `Book this UGC creator on GoCollab. Portfolio, packages, and reviews.`,
  };
}

export default async function PublicCreatorProfileByDisplayNamePage({
  params,
}: PageProps) {
  const { displayName } = await params;
  if (RESERVED_PUBLIC_SLUGS.has(displayName.toLowerCase())) {
    notFound();
  }

  const result = await fetchCreatorProfileByPublicSlug(displayName);

  if (!result.ok) {
    if (result.status === 503) {
      throw new Error("Unable to load creator profile. Please try again.");
    }
    notFound();
  }

  const portfolioVideos = await fetchPublicPortfolioVideosByCreatorIdServer(
    result.profile.id,
  );

  return (
    <PublicCreatorProfile
      profile={result.profile}
      initialPortfolioVideos={portfolioVideos}
    />
  );
}
