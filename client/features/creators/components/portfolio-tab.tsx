"use client";

import { memo } from "react";
import { isAxiosError } from "axios";
import { motion, type Variants } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { usePublicPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-public-portfolio-videos-query";

const gridVariants: Variants = {
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

interface PortfolioTabProps {
  creatorId: string;
  initialVideos?: PortfolioVideoApi[];
}

export const PortfolioTab = memo(function PortfolioTab({
  creatorId,
  initialVideos,
}: PortfolioTabProps) {
  const query = usePublicPortfolioVideosQuery(creatorId, {
    placeholderData: initialVideos,
    staleTime: 5 * 60_000,
  });

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

  const videos = query.data ?? [];

  if (videos.length === 0) {
    return (
      <div className="flex min-h-50 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <p className="text-sm text-muted-foreground">No portfolio items yet</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-12 gap-6"
      variants={gridVariants}
      initial="hidden"
      animate="show"
    >
      {videos.map((v, index) => {
        const isFirst = index === 0;
        const title = v.description?.trim() || "Portfolio video";
        const createdLabel = new Date(v.createdAt).toLocaleDateString(
          undefined,
          {
            year: "numeric",
            month: "short",
          },
        );
        const badge = v.industryLabel?.trim() || v.tags?.[0] || "Portfolio";

        const tags = [
          ...(v.language?.trim() ? [v.language.trim()] : []),
          ...(v.industryLabel?.trim() ? [v.industryLabel.trim()] : []),
          ...(v.tags?.[0]?.trim() ? [v.tags[0].trim()] : []),
          createdLabel,
        ].slice(0, 4);

        if (isFirst) {
          return (
            <motion.a
              key={v.id}
              href={v.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              variants={cardVariants}
              className="md:col-span-7 group relative rounded-3xl overflow-hidden bg-muted h-[320px] sm:h-[360px] md:h-[380px]"
            >
              <video
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70"
                src={v.videoUrl}
                poster={v.thumbnailUrl ?? undefined}
                preload="metadata"
                muted
                playsInline
                loop
                onMouseOver={(e) =>
                  (e.target as HTMLVideoElement).play().catch(() => {})
                }
                onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
              
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-[10px] font-black uppercase tracking-tighter backdrop-blur-md">
                  {badge}
                </span>
              </div>

              <div className="absolute bottom-8 left-8 space-y-4 pr-8">
                <h3 className="text-3xl font-extrabold text-white tracking-tighter drop-shadow-md">
                  {title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold text-white/70 uppercase bg-white/10 backdrop-blur-sm px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-20 h-20 bg-primary/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-primary/30">
                  <Play className="size-8 text-white ml-1 fill-white" />
                </div>
              </div>
            </motion.a>
          );
        }

        const isSecond = index === 1;

        return (
          <motion.a
            key={v.id}
            href={v.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            variants={cardVariants}
            className={`group relative rounded-3xl overflow-hidden bg-muted ${isSecond ? "md:col-span-5 h-[320px] sm:h-[360px] md:h-[380px]" : "md:col-span-6 xl:col-span-4 aspect-3/4"}`}
          >
            <video
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
              src={v.videoUrl}
              poster={v.thumbnailUrl ?? undefined}
              preload="metadata"
              muted
              playsInline
              loop
              onMouseOver={(e) =>
                (e.target as HTMLVideoElement).play().catch(() => {})
              }
              onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 pointer-events-none">
              <p className="font-bold text-white drop-shadow-md line-clamp-2">
                {title}
              </p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                <Play className="size-6 text-white ml-1 fill-white" />
              </div>
            </div>
          </motion.a>
        );
      })}
    </motion.div>
  );
});
