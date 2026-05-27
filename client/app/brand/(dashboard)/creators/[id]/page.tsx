import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/features/creators/components/creator-profile";
import {
  fetchCreatorProfileById,
  isCreatorProfileUuid,
} from "@/features/creators/api/fetch-creator-profile";
import { mapProfileItemToCreatorProfile } from "@/features/creators/api/map-profile-to-creator";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function mapFirstPortfolioVideoToInitialVideos(
  profile: CreatorProfileItemApi,
): PortfolioVideoApi[] | undefined {
  const video = profile.firstPortfolioVideo;
  if (!video) return undefined;

  return [
    {
      ...video,
      language: null,
      description: null,
      visibilityStatus: "public",
    },
  ];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  if (!isCreatorProfileUuid(id)) {
    return { title: "Creator" };
  }

  const result = await fetchCreatorProfileById(id);
  if (result.ok) {
    const name = result.profile.displayName;
    return {
      title: name,
      description: `View ${name}'s profile, portfolio, and packages on Collabry.`,
    };
  }
  return { title: "Creator" };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;

  if (!isCreatorProfileUuid(id)) {
    notFound();
  }

  const result = await fetchCreatorProfileById(id);
  
  if (result.ok) {
    const creator = mapProfileItemToCreatorProfile(result.profile);
    return (
      <CreatorProfile
        key={id}
        creator={creator}
        initialPortfolioVideos={mapFirstPortfolioVideoToInitialVideos(
          result.profile,
        )}
      />
    );
  }

  if (result.status === 401) {
    const callbackUrl = `/brand/creators/${id}`;
    return (
      <div className="mx-auto max-w-site px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Sign in to view this creator
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to load creator profiles from your account.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            Log in
          </Link>
        </Button>
      </div>
    );
  }

  notFound();
}
