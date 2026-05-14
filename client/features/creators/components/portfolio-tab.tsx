"use client";

import { memo } from "react";
import { isAxiosError } from "axios";
import { motion, type Variants } from "framer-motion";
// import { Play } from "lucide-react";
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
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      variants={gridVariants}
      initial="hidden"
      animate="show"
    >
      {videos.map((v) => {
        const title = v.description?.trim() || "Portfolio video";
        const badge = v.industryLabel?.trim() || v.tags?.[0] || "Portfolio";

        return (
          <motion.div
            key={v.id}
            variants={cardVariants}
            className="group relative rounded-2xl overflow-hidden bg-black aspect-9/16 shadow-sm ring-1 ring-border/50"
          >
            <video
              className="w-full h-full object-cover"
              src={v.videoUrl}
              poster={v.thumbnailUrl ?? undefined}
              preload="metadata"
              controls
              playsInline
            />
            <div className="absolute top-0 left-0 right-0 bg-linear-to-b from-black/60 to-transparent p-3 pointer-events-none flex flex-col gap-1.5">
              <span className="w-fit px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-tighter backdrop-blur-md">
                {badge}
              </span>
              <p className="font-semibold text-white drop-shadow-md line-clamp-2 text-xs">
                {title}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});
