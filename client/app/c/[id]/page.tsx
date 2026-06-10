import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchCreatorProfileById,
  isCreatorProfileUuid,
} from "@/features/creators/api/fetch-creator-profile";
import { fetchPublicPortfolioVideosByCreatorIdServer } from "@/features/creator-portfolio/api/fetch-public-portfolio-videos.server";
import { PublicCreatorProfile } from "@/features/creators/components/public-creator-profile/public-creator-profile";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  if (!isCreatorProfileUuid(id)) {
    return { title: "Creator" };
  }

  const result = await fetchCreatorProfileById(id);
  if (!result.ok) return { title: "Creator" };

  const name = result.profile.displayName;
  return {
    title: `${name} · UGC Creator on GoCollab`,
    description:
      result.profile.bio?.slice(0, 160) ??
      `${name} — book this UGC creator on GoCollab. Portfolio, packages, and reviews.`,
  };
}

export default async function PublicCreatorProfilePage({ params }: PageProps) {
  const { id } = await params;

  if (!isCreatorProfileUuid(id)) {
    notFound();
  }

  const result = await fetchCreatorProfileById(id);

  if (!result.ok) {
    notFound();
  }

  const portfolioVideos = await fetchPublicPortfolioVideosByCreatorIdServer(id);

  return (
    <PublicCreatorProfile
      profile={result.profile}
      initialPortfolioVideos={portfolioVideos}
    />
  );
}
