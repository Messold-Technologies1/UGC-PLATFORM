"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Eye, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchPublicPortfolioVideosByCreatorId,
  publicPortfolioVideosByCreatorQueryKey,
} from "@/features/creator-portfolio/api/list-public-portfolio-videos";

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
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
}

export const PortfolioTab = memo(function PortfolioTab({
  creatorId,
}: PortfolioTabProps) {
  const query = useQuery({
    queryKey: publicPortfolioVideosByCreatorQueryKey(creatorId),
    queryFn: () => fetchPublicPortfolioVideosByCreatorId(creatorId),
    staleTime: 5 * 60_000,
  });

  if (query.isPending) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
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
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <p className="text-sm text-muted-foreground">No portfolio items yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => {
        const title = v.description?.trim() || "Portfolio video";
        const badge =
          v.industryLabel?.trim() ||
          v.tags[0] ||
          "Portfolio";
        return (
          <a
            key={v.id}
            href={v.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="relative aspect-9/16 max-h-72 overflow-hidden bg-muted">
              <video
                className="size-full object-cover"
                src={v.videoUrl}
                poster={v.thumbnailUrl ?? undefined}
                preload="metadata"
                muted
                playsInline
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <span className="flex size-11 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Play className="ml-0.5 size-4 text-foreground" aria-hidden />
                </span>
              </span>
              <span className="absolute left-2.5 top-2.5 rounded-md border border-border/80 bg-background/85 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                {badge}
              </span>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium">{title}</p>
              {v.language?.trim() ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="size-3 shrink-0" aria-hidden />
                  {v.language.trim()}
                </p>
              ) : null}
            </div>
          </a>
        );
      })}
    </div>
  );
});
