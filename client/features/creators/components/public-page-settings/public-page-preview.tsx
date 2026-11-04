"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useCreatorProfileMeQuery } from "../../hooks/use-creator-profile-me-query";
import { PublicProfileTemplateHost } from "../public-creator-profile/templates/public-profile-template-host";

function PreviewBody() {
  const params = useSearchParams();
  const templateId = params.get("template");
  const { data: profile, isPending, isError } = useCreatorProfileMeQuery();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        We couldn&apos;t load your profile to preview. Please refresh and try
        again.
      </div>
    );
  }

  return (
    <PublicProfileTemplateHost profile={profile} templateId={templateId} />
  );
}

/**
 * The creator's own public profile, rendered with a template override.
 *
 * This is the same component the live public route uses, so the preview is the
 * real page rather than a mock-up — what a creator approves here is what a
 * brand will see.
 */
export function PublicPagePreview() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <PreviewBody />
    </Suspense>
  );
}
