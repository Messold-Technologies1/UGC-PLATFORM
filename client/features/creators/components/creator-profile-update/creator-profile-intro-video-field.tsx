"use client";

import type { RefObject } from "react";
import { Film, Video } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function CreatorProfileIntroVideoField({
  videoPreviewUrl,
  accept,
  disabled,
  uploading,
  fileInputRef,
  onSelectFile,
}: {
  videoPreviewUrl: string | null;
  accept: string;
  disabled: boolean;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
}) {
  return (
    <div className="flex w-full max-w-[200px] flex-col items-center gap-3">
      <div className="relative grid aspect-[9/16] w-40 place-items-center overflow-hidden rounded-[14px] bg-[var(--brand-gradient)]">
        {videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            controls
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Video
            size={32}
            className="text-white opacity-90"
            aria-hidden
          />
        )}
      </div>

      <div className="flex w-full flex-wrap justify-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onSelectFile(file ?? null);
          }}
        />

        <button
          type="button"
          className="inline-flex h-9 cursor-pointer items-center gap-[7px] rounded-[10px] border-[1.4px] border-border bg-card px-[13px] text-[12.5px] font-bold text-foreground transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {uploading ? (
            <Spinner className="size-3.5" aria-hidden />
          ) : (
            <Film size={14} aria-hidden />
          )}
          {videoPreviewUrl ? "Replace video" : "Upload video"}
        </button>
      </div>
    </div>
  );
}
