"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useCreatePortfolioVideoFlowMutation } from "../hooks/use-create-portfolio-video-flow-mutation";
import {
  PORTFOLIO_VIDEO_MAX_BYTES,
  formatBytes,
} from "../lib/upload-portfolio-video";
import { convertHeicIfNeeded } from "@/lib/heic-to-web-image";
export function CreatorPortfolioUploadForm({
  isOverlay = false,
  adminMode = false,
  adminCreatorId,
  onSuccess,
}: {
  isOverlay?: boolean;
  adminMode?: boolean;
  adminCreatorId?: string;
  onSuccess?: () => void;
} = {}) {
  const createPortfolioVideoFlowMutation =
    useCreatePortfolioVideoFlowMutation();
  const submitting = createPortfolioVideoFlowMutation.isPending;

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Admin uploads on a creator's behalf don't require the creator's consent box.
  const [guidelinesAccepted, setGuidelinesAccepted] = useState<boolean>(
    () => adminMode,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoFile) {
      toast.error("Choose a video file");
      return;
    }

    if (!guidelinesAccepted) {
      toast.error(
        "Please confirm your content follows the Creator Quality Guidelines.",
      );
      return;
    }

    if (adminMode && !adminCreatorId) {
      toast.error("Missing creator id for admin upload");
      return;
    }

    setUploadProgress(0);
    createPortfolioVideoFlowMutation.mutate(
      {
        videoFile,
        thumbnailFile,
        adminCreatorId: adminMode ? adminCreatorId : undefined,
        onProgress: (fraction) => setUploadProgress(fraction),
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onSettled: () => {
          setUploadProgress(null);
        },
      },
    );
  }

  return (
    <div className={isOverlay ? "space-y-4" : "space-y-8"}>
      {!isOverlay && (
        <>
          <div>
            <Link
              href="/creator/portfolio"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to portfolio
            </Link>
          </div>

          <PageHeader
            title="Add portfolio video"
            description="Upload a video and optional thumbnail."
          />
        </>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portfolio-video">Video</Label>
                <Input
                  id="portfolio-video"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  disabled={submitting}
                  onChange={(ev) => {
                    const f = ev.target.files?.[0] ?? null;
                    if (f && f.size > PORTFOLIO_VIDEO_MAX_BYTES) {
                      toast.error(
                        `Video is too large. Max ${formatBytes(
                          PORTFOLIO_VIDEO_MAX_BYTES,
                        )}.`,
                      );
                      ev.target.value = "";
                      setVideoFile(null);
                      return;
                    }
                    setVideoFile(f);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  MP4, MOV, or WEBM · up to{" "}
                  {formatBytes(PORTFOLIO_VIDEO_MAX_BYTES)}
                </p>
                {videoFile ? (
                  <p className="text-xs text-muted-foreground">
                    {videoFile.name} · {formatBytes(videoFile.size)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-thumb">Thumbnail (optional)</Label>
                <Input
                  id="portfolio-thumb"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  disabled={submitting}
                  onChange={(ev) => {
                    const f = ev.target.files?.[0] ?? null;
                    if (!f) {
                      setThumbnailFile(null);
                      return;
                    }
                    void convertHeicIfNeeded(f)
                      .then((converted) => setThumbnailFile(converted))
                      .catch(() => {
                        toast.error(
                          "Couldn't process this HEIC image. Try a JPG or PNG.",
                        );
                        ev.target.value = "";
                        setThumbnailFile(null);
                      });
                  }}
                />
              </div>
            </div>

            {submitting && uploadProgress !== null ? (
              <div className="space-y-1.5" aria-live="polite">
                <Progress value={Math.round(uploadProgress * 100)} />
                <p className="text-xs text-muted-foreground">
                  Uploading… {Math.round(uploadProgress * 100)}%
                </p>
              </div>
            ) : null}

            {!adminMode ? (
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
                <Checkbox
                  id="portfolio-guidelines"
                  checked={guidelinesAccepted}
                  disabled={submitting}
                  onCheckedChange={(checked) =>
                    setGuidelinesAccepted(checked === true)
                  }
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor="portfolio-guidelines"
                  className="text-sm font-normal leading-snug text-muted-foreground"
                >
                  I confirm this content follows the{" "}
                  <Link
                    href="/legal/guidelines"
                    target="_blank"
                    className="font-semibold text-foreground underline underline-offset-2"
                  >
                    Creator Quality Guidelines
                  </Link>
                  .
                </Label>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={submitting || !videoFile || !guidelinesAccepted}
              className="gap-2 bg-foreground text-background hover:opacity-90"
            >
              {submitting ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  {uploadProgress !== null && uploadProgress < 1
                    ? `Uploading… ${Math.round(uploadProgress * 100)}%`
                    : "Finishing…"}
                </>
              ) : (
                "Upload and publish"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
