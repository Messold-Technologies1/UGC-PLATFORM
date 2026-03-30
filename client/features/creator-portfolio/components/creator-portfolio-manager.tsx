"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Eye, Image as ImageIcon, Loader2, Play, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import type { PortfolioVideoApi } from "../api/types";
import { listMyPortfolioVideos } from "../api/list-my-portfolio-videos";

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
  const [videos, setVideos] = useState<PortfolioVideoApi[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    try {
      const list = await listMyPortfolioVideos();
      setVideos(list);
    } catch (e) {
      toast.error("Could not load portfolio", { description: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

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
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
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
          {videos.map((v) => (
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
                <p className="line-clamp-2 text-sm font-medium">
                  {v.description?.trim() || "Portfolio video"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="size-3" aria-hidden />
                  {v.visibilityStatus === "public" ? "Public" : "Private"}
                  {v.industryLabel ? ` · ${v.industryLabel}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
