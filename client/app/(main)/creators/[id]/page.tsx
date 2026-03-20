import { notFound } from "next/navigation";
import { CreatorProfile } from "@/features/creators/components/creator-profile";
import { getCreatorProfile } from "@/features/creators/data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const creator = getCreatorProfile(id);

  if (!creator) {
    notFound();
  }

  return <CreatorProfile creator={creator} />;
}
