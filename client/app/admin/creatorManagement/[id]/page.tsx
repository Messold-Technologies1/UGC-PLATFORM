"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { useCreatorProfileQuery } from "@/features/creators/hooks/use-creator-profile-query";

export default function AdminCreatorEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const {
    data: profile,
    isLoading,
    isError,
  } = useCreatorProfileQuery(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="space-y-6 p-8">
        <PageHeader
          title="Creator Profile"
          description="We could not load the creator profile. It may have been deleted or doesn't exist."
        />
        <Button asChild>
          <Link href="/admin/creatorManagement">Back to Creators</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`Edit Creator: ${profile.displayName || "Unknown"}`}
          description="Update creator details as an admin."
        />
        {/* <Button variant="outline" asChild>
          <Link href="/admin/creatorManagement">Back</Link>
        </Button> */}
      </div>

      <CreatorProfileSetupForm
        variant="settings"
        mode="update"
        profileId={profile.id}
        adminMode={true}
        initialProfile={profile}
        onSuccess={() => {
          router.push(`/admin/creatorManagement?highlightedCreatorId=${profile.id}`);
        }}
      />
    </div>
  );
}
