"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { CreatorPortfolioUploadForm } from "@/features/creator-portfolio/components/creator-portfolio-upload-form.lazy";
import { useCreatorProfileQuery } from "@/features/creators/hooks/use-creator-profile-query";

export default function AdminCreatorEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [isUploadOverlayOpen, setIsUploadOverlayOpen] = useState(false);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={`Creator: ${profile.displayName || "Unknown"}`}
        />
        <Dialog open={isUploadOverlayOpen} onOpenChange={setIsUploadOverlayOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="size-4" />
              Add Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[70vw] max-w-[70vw] sm:max-w-[70vw] max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Add Portfolio Video</DialogTitle>
            <CreatorPortfolioUploadForm
              isOverlay
              adminMode
              adminCreatorId={profile.id}
              onSuccess={() => setIsUploadOverlayOpen(false)}
            />
          </DialogContent>
        </Dialog>
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
