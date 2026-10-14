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
import { cn } from "@/lib/utils";

export type CreatorProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  profileId?: string;
  adminMode?: boolean;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

const editBtnClass =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-white px-3.5 text-[12.5px] font-bold text-[#111]";

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
            className="mt-px size-[15px] shrink-0 animate-spin text-amber-600 motion-reduce:animate-none"
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
              className={cn(editBtnClass, "shrink-0")}
              onClick={() => onRetryFailed(failedIds)}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2
                  size={13}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
      {videos.map((video, idx) => (
        <div
          className="group overflow-hidden rounded-[14px] border-[1.4px] border-border bg-card transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-[3px] hover:shadow-[0_6px_18px_-8px_rgb(24_19_19/0.12)]"
          key={video.id}
        >
          <div className="relative grid aspect-[9/16] place-items-center">
            {video.assetState === "PROCESSING" ||
            video.assetState === "FAILED" ? null : video.videoUrl ? (
              <video
                src={video.videoUrl}
                poster={video.thumbnailUrl ?? undefined}
                controls
                preload="metadata"
                className="absolute inset-0 size-full object-cover"
              />
            ) : video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center"
                style={{
                  background: BG_GRADIENTS[idx % BG_GRADIENTS.length],
                }}
              >
                <span className="text-[30px] font-extrabold text-white/92">
                  V
                </span>
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent to-45%"
            />

            {video.assetState === "PROCESSING" ? (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-blue-800/85 px-[7px] py-[3px] text-[10px] font-bold text-white backdrop-blur-[4px]">
                <Loader2
                  size={10}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
                Processing
              </span>
            ) : video.assetState === "FAILED" ? (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-red-700/88 px-[7px] py-[3px] text-[10px] font-bold text-white backdrop-blur-[4px]">
                <AlertTriangle size={10} aria-hidden />
                Failed
              </span>
            ) : null}

            <span
              className={cn(
                "pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-[7px] py-[3px] text-[10px] font-bold text-white backdrop-blur-[4px]",
                video.visibilityStatus === "public"
                  ? "bg-green-700/85"
                  : "bg-black/60",
              )}
            >
              {video.visibilityStatus === "public" ? (
                <CheckCircle size={10} />
              ) : (
                <Bookmark size={10} />
              )}
              {video.visibilityStatus}
            </span>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/28 opacity-0 transition-opacity duration-[180ms] group-hover:opacity-100">
              <button
                type="button"
                className={cn(editBtnClass, "pointer-events-auto")}
                onClick={() => onReplace(video)}
              >
                <RefreshCw size={13} /> Replace
              </button>
              {onDelete && (
                <button
                  type="button"
                  className={cn(
                    editBtnClass,
                    "pointer-events-auto w-8 justify-center px-0",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video);
                  }}
                >
                  <Trash2 size={13} className="text-destructive" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="flex min-h-[230px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-[1.6px] border-dashed border-border bg-[color-mix(in_oklab,var(--muted)_50%,transparent)] text-[13px] font-bold text-muted-foreground hover:border-primary hover:bg-[color-mix(in_oklab,var(--primary)_5%,transparent)] hover:text-primary"
        onClick={onAdd}
      >
        <span className="grid size-10 place-items-center rounded-xl border-[1.4px] border-border bg-card">
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

  const filePickBtnClass =
    "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border-[1.4px] border-border bg-card px-3.5 text-[13.5px] font-bold text-foreground hover:bg-muted";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[70] bg-[rgba(18,14,14,0.45)] backdrop-blur-[2px] transition-opacity duration-[260ms]",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        data-open={open}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed top-0 right-0 z-[72] flex h-screen w-[min(480px,96vw)] flex-col bg-card shadow-[0_24px_50px_-22px_rgb(24_19_19/0.3)] transition-transform duration-[320ms] ease-[cubic-bezier(0.22,0.61,0.27,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        data-open={open}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="m-0 text-base">{isCreate ? "Add reel" : "Replace reel"}</h3>
          <button
            type="button"
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-5">
          <div className="flex items-start gap-3.5">
            <div
              className="relative grid aspect-[9/16] w-[92px] shrink-0 place-items-center overflow-hidden rounded-xl"
              style={{ background: BG_GRAD }}
            >
              {video?.videoUrl ? (
                <video
                  src={video.videoUrl}
                  poster={video.thumbnailUrl ?? undefined}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  preload="metadata"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : video?.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : localVideoUrl ? (
                <video
                  src={localVideoUrl}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  preload="metadata"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <Play size={28} className="text-white/92" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  className="absolute size-px overflow-hidden [clip:rect(0,0,0,0)]"
                  onChange={(e) =>
                    onSelectVideoFile(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  className={filePickBtnClass}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Film size={16} />
                  {videoFile
                    ? videoFile.name
                    : isCreate
                      ? "Upload video"
                      : "Replace video"}
                </button>
              </div>

              <div className="text-[13px] text-muted-foreground">
                MP4 / MOV / WebM &middot; up to 200MB &middot; 9:16 preferred
              </div>

              <div>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="absolute size-px overflow-hidden [clip:rect(0,0,0,0)]"
                  onChange={(e) =>
                    onSelectThumbFile(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  className={filePickBtnClass}
                  onClick={() => thumbInputRef.current?.click()}
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

        <div className="flex items-center gap-2.5 border-t border-border px-5 py-3.5">
          {!isCreate ? (
            <button
              type="button"
              className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-[color-mix(in_oklab,var(--destructive)_30%,var(--border))] bg-card px-[18px] text-[12.5px] font-bold text-destructive transition-[background,filter] duration-150 hover:bg-muted"
              onClick={() => video && onDelete(video)}
            >
              <X size={14} />
              Delete
            </button>
          ) : null}

          <div className="ml-auto flex gap-2.5">
            <button
              type="button"
              className="inline-flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-border bg-card px-[18px] text-[13.5px] font-bold text-foreground transition-[background,filter] duration-150 hover:bg-muted"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-transparent bg-primary px-[18px] text-[13.5px] font-bold text-white shadow-[0_1px_2px_0_rgb(24_19_19/0.05)] transition-[background,filter] duration-150 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
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
