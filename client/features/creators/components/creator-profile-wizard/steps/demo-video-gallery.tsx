"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDemoIntroVideosQuery } from "@/features/demo-videos/hooks/use-demo-intro-videos-query";
import type { DemoVideoApi } from "@/features/demo-videos/types";
import { cn } from "@/lib/utils";

/** "Watch a few examples" gallery for the Intro Video wizard step. */
export function DemoVideoGallery() {
  const { data, isLoading } = useDemoIntroVideosQuery();
  const [activeVideo, setActiveVideo] = useState<DemoVideoApi | null>(null);

  const videos = data ?? [];

  if (!isLoading && videos.length === 0) {
    return null;
  }

  return (
    <>
      <div>
        <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
          Watch a few examples
        </div>
        <p className="mb-3.5 mt-1 text-[13px] text-muted-foreground">
          Copy the style before you record your own — vertical, eye level, natural
          light.
        </p>

        <div className="grid auto-cols-[112px] grid-flow-col gap-3 overflow-x-auto pb-1 max-sm:auto-cols-[96px]">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[9/16] w-full animate-pulse rounded-xl bg-muted"
              />
            ))}

          {!isLoading &&
            videos.map((video) => (
              <button
                key={video.id}
                type="button"
                className="group flex flex-col gap-2 border-0 bg-transparent p-0 text-left font-inherit text-inherit"
                onClick={() => setActiveVideo(video)}
                aria-label="Play example intro video"
              >
                <span
                  className={cn(
                    "relative block aspect-[9/16] w-full overflow-hidden rounded-xl border border-border bg-muted",
                    "group-hover:border-primary",
                  )}
                >
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="block size-full object-cover"
                    />
                  ) : (
                    <video
                      src={video.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="block size-full object-cover"
                    />
                  )}
                  <span
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/45 to-transparent text-white"
                    aria-hidden
                  >
                    <Play
                      size={16}
                      strokeWidth={0}
                      fill="currentColor"
                      className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                    />
                  </span>
                </span>
              </button>
            ))}
        </div>
      </div>

      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-xs gap-0 overflow-hidden rounded-2xl bg-black p-0 sm:max-w-xs">
          <DialogTitle className="sr-only">Example intro video</DialogTitle>
          {activeVideo && (
            <video
              key={activeVideo.id}
              src={activeVideo.videoUrl}
              poster={activeVideo.thumbnailUrl ?? undefined}
              controls
              playsInline
              autoPlay
              muted
              className="block aspect-9/16 w-full bg-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
