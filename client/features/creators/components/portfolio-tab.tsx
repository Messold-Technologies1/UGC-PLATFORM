"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchPublicPortfolioVideosByCreatorId,
  publicPortfolioVideosByCreatorQueryKey,
} from "@/features/creator-portfolio/api/list-public-portfolio-videos";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

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
  const query = useQuery({
    queryKey: publicPortfolioVideosByCreatorQueryKey(creatorId),
    queryFn: () => fetchPublicPortfolioVideosByCreatorId(creatorId),
    initialData: initialVideos,
    staleTime: 5 * 60_000,
  });

  if (query.isPending) {
    return (
      <div className="flex min-h-50 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden
        />
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
    <div className="grid justify-items-center gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((v) => {
        const title = v.description?.trim() || "Portfolio video";
        const createdLabel = new Date(v.createdAt).toLocaleDateString(
          undefined,
          {
            year: "numeric",
            month: "short",
          },
        );
        const badge = v.industryLabel?.trim() || v.tags[0] || "Portfolio";
        return (
          <a
            key={v.id}
            href={v.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full max-w-75 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="relative h-105 overflow-hidden bg-muted sm:h-115">
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={v.videoUrl}
                poster={v.thumbnailUrl ?? undefined}
                preload="metadata"
                muted
                playsInline
              />

              <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/10 via-black/0 to-black/55 opacity-90 transition-opacity group-hover:opacity-100" />

              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                <span className="flex size-12 items-center justify-center rounded-full bg-background/85 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Play className="ml-0.5 size-4 text-foreground" aria-hidden />
                </span>
              </span>
              <span className="absolute left-2.5 top-2.5 rounded-full border border-border/70 bg-background/85 px-2.5 py-1 text-[11px] font-medium leading-none backdrop-blur-sm">
                {badge}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">
                  {title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/85">
                  {v.language?.trim() ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                      {v.language.trim()}
                    </span>
                  ) : null}
                  {v.industryLabel?.trim() ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                      {v.industryLabel.trim()}
                    </span>
                  ) : null}
                  {v.tags?.[0]?.trim() ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                      {v.tags[0].trim()}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                    {createdLabel}
                  </span>
                </div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
});
