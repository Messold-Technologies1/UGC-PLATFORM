"use client";

import type { RefObject } from "react";
import { Trash2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function CreatorProfileIntroVideoField({
  videoPreviewUrl,
  accept,
  disabled,
  uploading,
  hasPendingVideo,
  hasExistingVideo,
  pendingActionLabel = "Discard new video",
  fileInputRef,
  onSelectFile,
  onDiscard,
  onRemove,
}: {
  videoPreviewUrl: string | null;
  accept: string;
  disabled: boolean;
  uploading: boolean;
  hasPendingVideo: boolean;
  hasExistingVideo: boolean;
  pendingActionLabel?: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
  onDiscard: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start">
      <div className="flex aspect-video w-full max-w-64 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:w-64">
        {videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            controls
            preload="metadata"
            className="size-full object-cover"
          />
        ) : (
          <Video className="size-8 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Label className="text-base">Intro video</Label>
        <p className="text-xs text-muted-foreground">
          Upload an MP4, MOV, or WebM intro up to 200 MB.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label="Upload intro video"
          onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Spinner className="size-4" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            {uploading ? "Uploading..." : hasExistingVideo ? "Replace video" : "Upload video"}
          </Button>
          {hasPendingVideo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={disabled}
              onClick={onDiscard}
            >
              {pendingActionLabel}
            </Button>
          ) : hasExistingVideo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
              Remove video
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
