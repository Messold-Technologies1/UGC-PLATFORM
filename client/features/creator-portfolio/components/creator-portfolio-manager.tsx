"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Image as ImageIcon, Loader2, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PortfolioVideoApi } from "../api/types";
import { deletePortfolioVideo } from "../api/delete-portfolio-video";
import {
  listMyPortfolioVideos,
  portfolioMyVideosQueryKey,
} from "../api/list-my-portfolio-videos";

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

export function CreatorPortfolioManager() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const videosQuery = useQuery({
    queryKey: portfolioMyVideosQueryKey,
    queryFn: listMyPortfolioVideos,
    staleTime: 5 * 60_000,
  });

  const videos = videosQuery.data ?? [];
  const loading = videosQuery.isPending;

  const handleDelete = useCallback(
    async (video: PortfolioVideoApi) => {
      const label = video.description?.trim() || "this video";
      if (
        !window.confirm(
          `Remove "${label}" from your portfolio? This cannot be undone.`,
        )
      ) {
        return;
      }
      setDeletingId(video.id);
      try {
        await deletePortfolioVideo(video.id);
        queryClient.setQueryData<PortfolioVideoApi[]>(
          portfolioMyVideosQueryKey,
          (prev) => (prev ?? []).filter((x) => x.id !== video.id),
        );
        toast.success("Video removed from portfolio");
      } catch (e) {
        toast.error("Could not delete video", { description: errorMessage(e) });
      } finally {
        setDeletingId(null);
      }
    },
    [queryClient],
  );

  if (videosQuery.isError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Portfolio"
          description="Showcase your best work to attract brands"
        />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">
            Could not load portfolio
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {errorMessage(videosQuery.error)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void videosQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio"
        description="Showcase your best work to attract brands"
      />

      {!loading && videos.length > 0 && (
        <div>
          <Button
            size="sm"
            className="gap-1.5 bg-foreground border-0 text-background hover:opacity-90"
            asChild
          >
            <Link href="/creator/portfolio/upload">
              <Plus className="size-3.5" />
              Add work
            </Link>
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <ImageIcon className="size-6 text-primary" />
          </div>
          <p className="text-sm font-medium">Your portfolio is empty</p>
          <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
            Upload videos to your best UGC content to attract brand deals.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5 bg-foreground border-0 text-background hover:opacity-90"
            asChild
          >
            <Link href="/creator/portfolio/upload">
              <Plus className="size-3.5" />
              Upload your first piece
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid justify-items-center gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => {
            const cardTitle = v.description?.trim() || "Portfolio video";
            const createdLabel = new Date(v.createdAt).toLocaleDateString(
              undefined,
              {
                year: "numeric",
                month: "short",
              },
            );
            return (
              <div
                key={v.id}
                className="group relative w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="relative h-[420px] overflow-hidden bg-muted sm:h-[460px]">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={v.videoUrl}
                    poster={v.thumbnailUrl ?? undefined}
                    preload="metadata"
                    muted
                    playsInline
                  />

                  <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/10 via-black/0 to-black/55 opacity-90 transition-opacity group-hover:opacity-100" />

                  <a
                    href={v.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10"
                    aria-label={`Open ${cardTitle}`}
                  >
                    <span className="flex size-12 items-center justify-center rounded-full bg-background/85 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                      <Play
                        className="ml-0.5 size-4 text-foreground"
                        aria-hidden
                      />
                    </span>
                  </a>

                  <span className="absolute left-2.5 top-2.5 rounded-full border border-border/70 bg-background/85 px-2.5 py-1 text-[11px] font-medium leading-none backdrop-blur-sm">
                    {v.visibilityStatus === "public" ? "Public" : "Private"}
                  </span>

                  <div className="absolute right-2.5 top-2.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="h-8 w-8 rounded-full bg-background/75 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-background hover:text-destructive group-hover:opacity-100"
                          disabled={deletingId !== null}
                          aria-label={`Delete ${cardTitle}`}
                          onClick={() => void handleDelete(v)}
                        >
                          {deletingId === v.id ? (
                            <Loader2
                              className="size-3.5 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Trash2 className="size-3.5" aria-hidden />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete video</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">
                      {cardTitle}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/85">
                      {v.industryLabel?.trim() ? (
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                          {v.industryLabel.trim()}
                        </span>
                      ) : null}
                      {v.language?.trim() ? (
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                          {v.language.trim()}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
