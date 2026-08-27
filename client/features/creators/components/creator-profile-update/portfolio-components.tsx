"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle,
  Loader2,
  RefreshCw,
  Play,
  Plus,
  X,
  Film,
  Camera,
  Trash2,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { countByAssetState } from "@/features/creator-portfolio/lib/asset-state";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";

export type CreatorProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  profileId?: string;
  adminMode?: boolean;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

/**
 * Status strip above the grid, while any Instagram import is still being copied
 * into our storage or has failed to copy.
 *
 * The reels are already saved by the time this shows — only the video file is
 * still in transit — so the message says so plainly. Without it the "Processing"
 * tile badges look like something went wrong, or like the creator still has a
 * step left to do before they can move on.
 *
 * Renders nothing when everything is ready, which is the normal case.
 */
export function PortfolioProcessingBanner({
  videos,
  onRetryFailed,
  retrying,
}: {
  videos: PortfolioVideoApi[];
  /** Re-queue every failed copy. Omit to show the failures without an action. */
  onRetryFailed?: (videoIds: string[]) => void;
  retrying?: boolean;
}) {
  const { processing, failed } = countByAssetState(videos);
  if (processing === 0 && failed === 0) return null;

  const failedIds = videos
    .filter((video) => video.assetState === "FAILED")
    .map((video) => video.id);

  return (
    <div className="flex flex-col gap-2">
      {processing > 0 ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3">
          <Loader2
            size={15}
            className="pe-pf-spin mt-px shrink-0 text-amber-600"
            aria-hidden
          />
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <strong className="font-semibold">
              {processing === 1
                ? "1 video is still being saved from Instagram"
                : `${processing} videos are still being saved from Instagram`}
            </strong>
            <p className="text-muted-foreground">
              They are already in your portfolio — we are just copying the files
              across. Save your changes and carry on; they will start playing
              here on their own, usually within a minute.
            </p>
          </div>
        </div>
      ) : null}

      {failed > 0 ? (
        <div className="flex flex-wrap items-start gap-2.5 rounded-xl border border-destructive/35 bg-destructive/5 px-3.5 py-3">
          <AlertTriangle
            size={15}
            className="mt-px shrink-0 text-destructive"
            aria-hidden
          />
          <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
            <strong className="font-semibold text-destructive">
              {failed === 1
                ? "1 video could not be copied from Instagram"
                : `${failed} videos could not be copied from Instagram`}
            </strong>
            <p className="text-muted-foreground">
              This usually clears on a second attempt. If it keeps failing,
              replace the video with a file from your device.
            </p>
          </div>
          {onRetryFailed ? (
            <button
              type="button"
              className="pe-pf-edit-btn shrink-0"
              onClick={() => onRetryFailed(failedIds)}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 size={13} className="pe-pf-spin" aria-hidden />
              ) : (
                <RefreshCw size={13} aria-hidden />
              )}
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PortfolioGrid({
  videos,
  onReplace,
  onDelete,
  onAdd,
}: {
  videos: PortfolioVideoApi[];
  /** Swap this entry's file. The only way to change a video at the floor. */
  onReplace: (video: PortfolioVideoApi) => void;
  onDelete?: (video: PortfolioVideoApi) => void;
  onAdd: () => void;
}) {
  const BG_GRADIENTS = [
    "linear-gradient(135deg,#6366f1,#a78bfa)",
    "linear-gradient(135deg,#f472b6,#fb923c)",
    "linear-gradient(135deg,#34d399,#22d3ee)",
    "linear-gradient(135deg,#f43f5e,#e879f9)",
    "linear-gradient(135deg,#fbbf24,#f97316)",
    "linear-gradient(135deg,#60a5fa,#818cf8)",
  ];

  return (
    <div className="pe-pf-grid">
      {videos.map((video, idx) => (
        <div className="pe-pf-card" key={video.id}>
          <div className="pe-pf-reel">
            {video.assetState === "PROCESSING" ||
            video.assetState === "FAILED" ? null : video.videoUrl ? (
              <video
                src={video.videoUrl}
                poster={video.thumbnailUrl ?? undefined}
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
            ) : video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                  inset: 0,
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: BG_GRADIENTS[idx % BG_GRADIENTS.length],
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span className="pe-pf-mono">V</span>
              </div>
            )}
            <div className="pe-pf-scrim" style={{ pointerEvents: "none" }} />

            {video.assetState === "PROCESSING" ? (
              <span className="pe-pf-state" data-state="processing">
                <Loader2 size={10} className="pe-pf-spin" aria-hidden />
                Processing
              </span>
            ) : video.assetState === "FAILED" ? (
              <span className="pe-pf-state" data-state="failed">
                <AlertTriangle size={10} aria-hidden />
                Failed
              </span>
            ) : null}

            <span
              className="pe-pf-vis"
              data-visibility={video.visibilityStatus}
              style={{ pointerEvents: "none" }}
            >
              {video.visibilityStatus === "public" ? (
                <CheckCircle size={10} />
              ) : (
                <Bookmark size={10} />
              )}
              {video.visibilityStatus}
            </span>

            <div
              className="pe-pf-edit-overlay"
              style={{
                pointerEvents: "none",
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                className="pe-pf-edit-btn"
                onClick={() => onReplace(video)}
                style={{ pointerEvents: "auto" }}
              >
                <RefreshCw size={13} /> Replace
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="pe-pf-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video);
                  }}
                  style={{
                    pointerEvents: "auto",
                    width: "32px",
                    padding: 0,
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={13} className="text-destructive" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="pe-pf-add" onClick={onAdd}>
        <span className="pe-pf-plusbox">
          <Plus size={18} />
        </span>
        Add reel
      </button>
    </div>
  );
}

export function PortfolioFileDrawer({
  video,
  open,
  onClose,
  videoFile,
  thumbFile,
  videoInputRef,
  thumbInputRef,
  onSelectVideoFile,
  onSelectThumbFile,
  onSave,
  onDelete,
  isSaving,
}: {
  video: PortfolioVideoApi | null;
  open: boolean;
  onClose: () => void;
  videoFile: File | null;
  thumbFile: File | null;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  thumbInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectVideoFile: (file: File | null) => void;
  onSelectThumbFile: (file: File | null) => void;
  /** Called with the picked files. Create when video == null, else replace. */
  onSave: () => void;
  onDelete: (video: PortfolioVideoApi) => void;
  isSaving: boolean;
}) {
  const isCreate = video == null;
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setLocalVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLocalVideoUrl(null);
    }
  }, [videoFile]);

  const BG_GRAD = "linear-gradient(135deg,#6366f1,#a78bfa)";

  return (
    <>
      <div className="pe-dr-scrim" data-open={open} onClick={onClose} />

      <div className="pe-dr" data-open={open}>
        <div className="pe-dr-head">
          <h3>{isCreate ? "Add reel" : "Replace reel"}</h3>
          <button
            type="button"
            className="pe-dr-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="pe-dr-body">
          <div className="pe-dr-preview">
            <div className="pe-dr-thumb" style={{ background: BG_GRAD }}>
              {video?.videoUrl ? (
                <video
                  src={video.videoUrl}
                  poster={video.thumbnailUrl ?? undefined}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    inset: 0,
                  }}
                />
              ) : video?.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    inset: 0,
                  }}
                />
              ) : localVideoUrl ? (
                <video
                  src={localVideoUrl}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
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
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Play size={28} style={{ color: "rgba(255,255,255,.92)" }} />
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                  }}
                  onChange={(e) =>
                    onSelectVideoFile(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 10,
                    border: "1.4px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                  onClick={() => videoInputRef.current?.click()}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--muted)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--card)")
                  }
                >
                  <Film size={16} />
                  {videoFile
                    ? videoFile.name
                    : isCreate
                      ? "Upload video"
                      : "Replace video"}
                </button>
              </div>

              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                MP4 / MOV / WebM &middot; up to 200MB &middot; 9:16 preferred
              </div>

              <div>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                  }}
                  onChange={(e) =>
                    onSelectThumbFile(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 10,
                    border: "1.4px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                  onClick={() => thumbInputRef.current?.click()}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--muted)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--card)")
                  }
                >
                  <Camera size={16} />
                  {thumbFile
                    ? thumbFile.name
                    : isCreate
                      ? "Upload thumbnail"
                      : "Change thumbnail"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pe-dr-foot">
          {!isCreate ? (
            <button
              type="button"
              className="pe-btn pe-btn-ghost"
              style={{
                color: "var(--destructive)",
                borderColor:
                  "color-mix(in oklab, var(--destructive) 30%, var(--border))",
                fontSize: 12.5,
                height: 38,
              }}
              onClick={() => video && onDelete(video)}
            >
              <X size={14} />
              Delete
            </button>
          ) : null}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              type="button"
              className="pe-btn pe-btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pe-btn pe-btn-primary"
              onClick={onSave}
              disabled={isSaving || !videoFile}
            >
              {isSaving ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Check size={16} />
                  {isCreate ? "Upload & Save" : "Replace video"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
