"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Eye, Image as ImageIcon, Loader2, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import type { PortfolioVideoApi } from "../api/types";
import { deletePortfolioVideo } from "../api/delete-portfolio-video";
import {
  listMyPortfolioVideos,
  portfolioMyVideosQueryKey,
} from "../api/list-my-portfolio-videos";

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const cardTitle = v.description?.trim() || "Portfolio video";
            return (
            <div
              key={v.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-lg hover:shadow-primary/5"
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
                <a
                  href={v.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20"
                  aria-label="Open video"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Play className="ml-0.5 size-4 text-foreground" aria-hidden />
                  </span>
                </a>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">
                    {cardTitle}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingId !== null}
                    aria-label={`Delete ${cardTitle}`}
                    onClick={() => void handleDelete(v)}
                  >
                    {deletingId === v.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden />
                    )}
                  </Button>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="size-3" aria-hidden />
                  {v.visibilityStatus === "public" ? "Public" : "Private"}
                  {v.industryLabel ? ` · ${v.industryLabel}` : ""}
                </p>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
