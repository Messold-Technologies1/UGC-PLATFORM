import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchPublicPortfolioVideosByCreatorIdServer } from "@/features/creator-portfolio/api/fetch-public-portfolio-videos.server";
import { fetchCreatorProfileByPublicSlug } from "@/features/creators/api/fetch-creator-profile-by-slug";
import { PublicProfileTemplateHost } from "@/features/creators/components/public-creator-profile/templates/public-profile-template-host";

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

  // Creators are anonymous by default — the title never carries the opaque
  // slug, and carries the real name only for creators an admin has chosen to
  // reveal. Lead with the niche otherwise.
  const niche = result.profile.facetSelections?.find(
    (f) => f.dimension === "CONTENT_CATEGORY",
  )?.label;
  const revealedName = result.profile.publicDisplayName?.trim();
  const nicheTitle = niche
    ? `${niche} Creator · GoCollab`
    : "UGC Creator · GoCollab";
  const title = revealedName
    ? `${revealedName} · ${niche ? `${niche} Creator` : "UGC Creator"} · GoCollab`
    : nicheTitle;
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

  // Once a name is revealed the name slug is canonical. The opaque slug keeps
  // resolving so links already shared never break — it just lands here first
  // and is redirected, which also stops the same page being served from two
  // URLs.
  const canonicalSlug = result.profile.publicNameSlug?.trim();
  if (canonicalSlug && canonicalSlug !== displayName.toLowerCase()) {
    redirect(`/${encodeURIComponent(canonicalSlug)}`);
  }

  const portfolioVideos = await fetchPublicPortfolioVideosByCreatorIdServer(
    result.profile.id,
  );

  return (
    <PublicProfileTemplateHost
      profile={result.profile}
      initialPortfolioVideos={portfolioVideos}
    />
  );
}
