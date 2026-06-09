"use client";

import type { RefObject } from "react";
import { Film, Trash2, Upload, Video } from "lucide-react";
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
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: 116,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "9/16",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--muted)",
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
              style={{ color: "var(--muted-foreground)", opacity: 0.6 }}
              aria-hidden
            />
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: 4,
          }}
        >
          Intro reel
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--muted-foreground)",
            marginBottom: 12,
          }}
        >
          Upload an MP4, MOV, or WebM intro up to 200 MB. 9:16 vertical
          preferred.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
          }}
          aria-label="Upload intro video"
          onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
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
            onMouseEnter={(e) => {
              if (!disabled)
                (e.currentTarget as HTMLElement).style.background =
                  "var(--muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--card)";
            }}
          >
            {uploading ? (
              <Spinner className="size-4" aria-hidden />
            ) : (
              <Film size={14} />
            )}
            {uploading
              ? "Uploading…"
              : hasExistingVideo
                ? "Replace reel"
                : "Upload reel"}
          </button>

          {hasPendingVideo ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onDiscard}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1.4px solid var(--border)",
                background: "var(--card)",
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--muted-foreground)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {pendingActionLabel}
            </button>
          ) : hasExistingVideo ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1.4px solid var(--border)",
                background: "var(--card)",
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--muted-foreground)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <Trash2 size={14} />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
