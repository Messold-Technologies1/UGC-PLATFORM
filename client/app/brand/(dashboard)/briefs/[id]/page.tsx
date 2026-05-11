import { SavedBriefDetails } from "@/features/briefs/components/saved-brief-details";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BriefDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <SavedBriefDetails briefId={id} />;
}
