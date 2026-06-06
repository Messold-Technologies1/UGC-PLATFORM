"use client";

import { memo, useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { usePublicPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-public-portfolio-videos-query";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string | string[] }
      | undefined;
    const m = data?.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTagColor(tag: string, index: number): string {
  const lower = tag.toLowerCase();
  if (lower.includes("beauty")) return "bg-[#fce7f3] text-[#be185d]";
  if (lower.includes("skincare") || lower.includes("ad ready"))
    return "bg-[#dcfce7] text-[#15803d]";
  if (lower.includes("product demo") || lower.includes("unboxing"))
    return "bg-[#ede9fe] text-[#5b21b6]";
  if (lower.includes("casual") || lower.includes("talk to camera"))
    return "bg-[#e0f2fe] text-[#0369a1]";
  if (lower.includes("ugc")) return "bg-[#dcfce7] text-[#15803d]";
  if (lower.includes("testimonial")) return "bg-[#ccfbf1] text-[#0f766e]";
  if (lower.includes("lifestyle")) return "bg-[#e0f2fe] text-[#0369a1]";
  if (lower.includes("fitness")) return "bg-[#ffedd5] text-[#c2410c]";
  if (lower.includes("aesthetic")) return "bg-[#ccfbf1] text-[#0f766e]";
  if (lower.includes("tech")) return "bg-[#f3e8ff] text-[#7e22ce]";

  const fallback = [
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
    "bg-emerald-100 text-emerald-700",
    "bg-teal-100 text-teal-700",
    "bg-purple-100 text-purple-700",
  ];
  return fallback[index % fallback.length]!;
}

interface VideoCardProps {
  video: PortfolioVideoApi;
  index: number;
  onError?: () => void;
}

const VideoCard = memo(function VideoCard({ video, index, onError }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const tags = video.tags?.length
    ? video.tags.slice(0, 2)
    : [video.industryLabel ?? "Portfolio"];
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
    <motion.div
      variants={cardVariants}
      className="group relative shrink-0 w-[200px] sm:w-[210px]"
    >
      <div className="relative aspect-9/16 w-full overflow-hidden rounded-md bg-muted cursor-pointer">
        <video
          ref={videoRef}
          className="size-full object-cover"
          src={video.videoUrl}
          poster={video.thumbnailUrl ?? undefined}
          preload="metadata"
          playsInline
          muted
          loop
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onClick={handleTogglePlay}
          onError={onError}
        />

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center z-10 transition-opacity",
            isPlaying ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          onClick={handleTogglePlay}
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm">
            <Play className="ml-0.5 size-5 fill-gray-700 text-gray-700" />
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 px-2.5 pb-2.5 pt-10 transition-opacity duration-200",
            "bg-linear-to-t from-black/70 via-black/30 to-transparent",
            isPlaying
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
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

        <div
          className={cn(
            "absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5 z-10 transition-opacity",
            "group-hover:opacity-0",
          )}
        >
          {tags.map((tag, tagIndex) => (
            <Badge
              key={`${tag}-${tagIndex}`}
              variant="secondary"
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold border-none shadow-sm",
                getTagColor(tag, index * 2 + tagIndex),
              )}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

interface PortfolioTabProps {
  creatorId: string;
  initialVideos?: PortfolioVideoApi[];
}

export const PortfolioTab = memo(function PortfolioTab({
  creatorId,
  initialVideos,
}: PortfolioTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [failedVideos, setFailedVideos] = useState<Set<string>>(new Set());

  const query = usePublicPortfolioVideosQuery(creatorId, {
    placeholderData: initialVideos,
    staleTime: 5 * 60_000,
  });

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  if (query.isPending) {
    return (
      <div className="flex min-h-50 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <Spinner className="size-8 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-destructive">
          Could not load portfolio
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {errorMessage(query.error)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const videos = (query.data?.filter((v) => {
    if (!v.videoUrl || v.videoUrl.length < 5 || v.videoUrl === "null" || v.videoUrl === "undefined") return false;
    return true;
  }) ?? []).filter(v => !failedVideos.has(v.id));

  if (videos.length === 0) {
    return (
      <div className="flex min-h-50 items-center justify-center rounded-2xl  border-dashed border-border/80 bg-card">
        <p className="text-sm font-semibold text-muted-foreground">No portfolio items yet</p>
      </div>
    );
  }

  return (
    <section className="mt-1">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-foreground">Portfolio</h2>
        <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
          {videos.length} Videos
        </span>
        <button
          type="button"
          className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
        >
          View all
        </button>
      </div>

      <div className="relative mt-4">
        <motion.div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {videos.map((v, index) => (
            <VideoCard 
              key={v.id} 
              video={v} 
              index={index} 
              onError={() => {
                setFailedVideos(prev => {
                  const next = new Set(prev);
                  next.add(v.id);
                  return next;
                });
              }}
            />
          ))}
        </motion.div>

        {videos.length > 4 && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-[40%] -translate-y-1/2 flex size-10 items-center justify-center rounded-full border border-border bg-card shadow-lg hover:bg-muted transition-colors z-20"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
});
