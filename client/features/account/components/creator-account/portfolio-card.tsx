import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

export function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PortfolioCard({ video }: { video: PortfolioVideoApi }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTogglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      if (isPlaying) {
        el.pause();
      } else {
        el.play().catch(() => {});
      }
    },
    [isPlaying],
  );

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const el = videoRef.current;
      if (!el || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      el.currentTime = ratio * duration;
    },
    [duration],
  );

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (el && isFinite(el.duration)) {
      setDuration(el.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (el) setCurrentTime(el.currentTime);
  }, []);

  return (
    <div className="group cursor-pointer" role="button" tabIndex={0}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted transition-shadow group-hover:shadow-lg">
        {video.videoUrl ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.thumbnailUrl || undefined}
            className="size-full object-cover"
            preload="metadata"
            playsInline
            muted={isMuted}
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onClick={handleTogglePlay}
          />
        ) : video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt="Thumbnail"
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {video.tags?.includes("Intro") && (
          <div className="absolute left-3 top-3 z-20 rounded-lg bg-black px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            Intro
          </div>
        )}

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center z-10 transition-opacity",
            isPlaying ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          onClick={handleTogglePlay}
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-black/50 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
            <Play className="ml-0.5 size-5 fill-white text-white" />
          </div>
        </div>

        {video.videoUrl && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 px-3 pb-3 pt-10 transition-opacity duration-200 bg-gradient-to-t from-black/70 via-black/30 to-transparent",
              isPlaying
                ? "opacity-0 group-hover:opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/30"
              onClick={handleSeek}
              role="slider"
              aria-label="Video progress"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
            >
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex items-center justify-center text-white hover:text-white/80 transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="size-3.5 fill-white" />
                  ) : (
                    <Play className="ml-px size-3.5 fill-white" />
                  )}
                </button>
                <span className="text-[10px] font-medium text-white/90 tabular-nums">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className="flex items-center justify-center text-white hover:text-white/80 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="size-3.5" />
                ) : (
                  <Volume2 className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">
          {video.description || video.industryLabel || "Portfolio Item"}
        </p>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
          {video.industryLabel
            ? video.industryLabel.charAt(0).toUpperCase()
            : "V"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {video.tags?.[0] || "UGC Video"}
        </span>
      </div>
    </div>
  );
}
