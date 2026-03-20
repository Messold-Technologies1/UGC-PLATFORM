import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorProfile } from "@/features/creators/components/creator-profile";
import { getCreatorProfile, MOCK_CREATORS } from "@/features/creators/data";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return MOCK_CREATORS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const creator = getCreatorProfile(id);
  if (!creator) return {};
  return {
    title: creator.name,
    description: `View ${creator.name}'s profile, portfolio, and packages on UGC Platform.`,
  };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const creator = getCreatorProfile(id);

  if (!creator) {
    notFound();
  }

  return <CreatorProfile creator={creator} />;
}
