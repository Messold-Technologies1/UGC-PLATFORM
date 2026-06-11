import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicPortfolioVideosByCreatorIdServer } from "@/features/creator-portfolio/api/fetch-public-portfolio-videos.server";
import { fetchCreatorProfileByPublicSlug } from "@/features/creators/api/fetch-creator-profile-by-slug";
import { PublicCreatorProfile } from "@/features/creators/components/public-creator-profile/public-creator-profile";

// Auth-aware (owner can view pending profile); never statically cache this route.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ displayName: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { displayName } = await params;
  const result = await fetchCreatorProfileByPublicSlug(displayName);
  if (!result.ok) return { title: "Creator" };

  const name = result.profile.displayName;
  return {
    title: `${name} · UGC Creator on GoCollab`,
    description:
      result.profile.bio?.slice(0, 160) ??
      `${name} — book this UGC creator on GoCollab. Portfolio, packages, and reviews.`,
  };
}

export default async function PublicCreatorProfileByDisplayNamePage({
  params,
}: PageProps) {
  const { displayName } = await params;
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
