"use client";

import type { RefObject } from "react";
import { Film, Trash2, Video } from "lucide-react";
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 160,
          position: "relative",
          aspectRatio: "9/16",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--brand-gradient)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            controls
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
            }}
          />
        ) : (
          <Video
            size={32}
            style={{ color: "white", opacity: 0.9 }}
            aria-hidden
          />
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
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
          disabled={disabled}
          onClick={() => {
            fileInputRef.current?.click();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 36,
            padding: "0 13px",
            borderRadius: 10,
            border: "1.4px solid var(--border)",
            background: "var(--card)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--foreground)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: "background 0.14s",
          }}
        >
          {uploading ? (
            <Spinner className="size-3.5" aria-hidden />
          ) : (
            <Film size={14} aria-hidden />
          )}
          {videoPreviewUrl ? "Replace reel" : "Upload reel"}
        </button>
      </div>
    </div>
  );
}
