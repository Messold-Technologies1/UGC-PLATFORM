"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileWizard } from "@/features/creators/components/creator-profile-wizard/creator-profile-wizard";
import { CreatorPortfolioUploadForm } from "@/features/creator-portfolio/components/creator-portfolio-upload-form.lazy";
import { useCreatorProfileQuery } from "@/features/creators/hooks/use-creator-profile-query";
import { AddReelSourceSheet } from "@/features/instagram-import/components/add-reel-source-sheet";
import { InstagramReelGallery } from "@/features/instagram-import/components/instagram-reel-gallery";
import { useQuery } from "@tanstack/react-query";
import {
  fetchInstagramReelsStatus,
  instagramReelsStatusQueryKeyFor,
} from "@/features/instagram-import/api/instagram-media";

export default function AdminCreatorEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [isUploadOverlayOpen, setIsUploadOverlayOpen] = useState(false);
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);
  const [isReelGalleryOpen, setIsReelGalleryOpen] = useState(false);

  const { data: profile, isLoading, isError } = useCreatorProfileQuery(id);

  // Whether *this creator* has Instagram linked — not the admin. The
  // connections endpoint only reports the signed-in user's own accounts, and
  // `instagramUrl` on the profile is a self-declared handle rather than an
  // OAuth link, so neither answers this. The reel-cache status route does: it
  // returns `not_connected` when the creator has no connection.
  const reelStatusQuery = useQuery({
    queryKey: instagramReelsStatusQueryKeyFor(id),
    queryFn: () => fetchInstagramReelsStatus(id),
    enabled: Boolean(profile),
    staleTime: 60_000,
  });
  const instagramConnected =
    reelStatusQuery.data != null &&
    reelStatusQuery.data.status !== "not_connected";

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
          <Link href="/admin/creators">Back to Creators</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader title={`Creator: ${profile.displayName || "Unknown"}`} />
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setIsSourceSheetOpen(true)}
        >
          <Plus className="size-4" />
          Add Portfolio
        </Button>
        <Dialog
          open={isUploadOverlayOpen}
          onOpenChange={setIsUploadOverlayOpen}
        >
          <DialogContent className="max-h-[90vh] w-[70vw] max-w-[70vw] overflow-y-auto sm:max-w-[70vw]">
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

      <AddReelSourceSheet
        open={isSourceSheetOpen}
        onOpenChange={setIsSourceSheetOpen}
        // An admin cannot connect on a creator's behalf, so the only two states
        // that matter here are "browsable" and "not linked".
        instagramState={instagramConnected ? "connected" : "not_connected"}
        onBehalfOfCreator
        onUploadFromDevice={() => {
          setIsSourceSheetOpen(false);
          setIsUploadOverlayOpen(true);
        }}
        onChooseFromInstagram={() => {
          setIsSourceSheetOpen(false);
          setIsReelGalleryOpen(true);
        }}
        onConnectInstagram={() => {
          // Deliberately inert: linking requires the creator's own Instagram
          // login, which an admin cannot complete for them.
          setIsSourceSheetOpen(false);
        }}
      />

      <InstagramReelGallery
        open={isReelGalleryOpen}
        onOpenChange={setIsReelGalleryOpen}
        adminCreatorId={profile.id}
      />

      <CreatorProfileWizard
        profileId={profile.id}
        adminMode
        initialProfile={profile}
        onExit={() => {
          router.push(`/admin/creators?highlightedCreatorId=${profile.id}`);
        }}
      />
    </div>
  );
}
