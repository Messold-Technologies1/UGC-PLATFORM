"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function CreatorProfileImageField({
  imagePreviewUrl,
  initials,
  accept,
  disabled,
  uploading,
  hasPendingImage,
  fileInputRef,
  onSelectFile,
  onDiscard,
}: {
  imagePreviewUrl: string | null;
  initials: string;
  accept: string;
  disabled: boolean;
  uploading: boolean;
  hasPendingImage: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 mb-2 border-b border-border pb-6 sm:flex-row sm:items-start">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {imagePreviewUrl ? (
          <Image
            src={imagePreviewUrl}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
            unoptimized
          />
        ) : (
          <div
            className="flex size-full items-center justify-center bg-primary/15 text-lg font-semibold text-primary"
            aria-hidden
          >
            {initials}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Label className="text-base">Profile photo</Label>
        <p className="text-xs text-muted-foreground">
          Shown in search and on your public profile.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label="Upload profile photo"
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
            {uploading ? "Uploading…" : "Upload photo"}
          </Button>
          {hasPendingImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={disabled}
              onClick={onDiscard}
            >
              Discard new photo
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
