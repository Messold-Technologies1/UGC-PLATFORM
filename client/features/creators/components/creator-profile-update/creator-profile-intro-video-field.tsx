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
    <div className="pe-media-field">
      <div className="pe-media-field-preview pe-media-field-preview--video">
        {videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            controls
            preload="metadata"
            className="pe-media-field-video"
          />
        ) : (
          <Video
            size={32}
            style={{ color: "white", opacity: 0.9 }}
            aria-hidden
          />
        )}
      </div>

      <div className="pe-media-field-actions">
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            onSelectFile(file ?? null);
          }}
        />

        <button
          type="button"
          className="pe-media-field-btn"
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
      <p className="pe-media-field-hint">
        Your best work — brand collab, UGC, or any clip you&apos;re proud of
      </p>
    </div>
  );
}
