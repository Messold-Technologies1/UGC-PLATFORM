"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDemoIntroVideosQuery } from "@/features/demo-videos/hooks/use-demo-intro-videos-query";
import type { DemoVideoApi } from "@/features/demo-videos/types";

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
      <div className="cw-examples">
        <div className="cw-examples-title">Watch a few examples</div>
        <p className="cw-examples-help">
          Copy the style before you record your own — vertical, eye level, natural
          light.
        </p>

        <div className="cw-examples-row">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="cw-example-card cw-example-skeleton" />
            ))}

          {!isLoading &&
            videos.map((video) => (
              <button
                key={video.id}
                type="button"
                className="cw-example-card"
                onClick={() => setActiveVideo(video)}
              >
                <span className="cw-example-thumb">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
                  ) : (
                    <video src={video.videoUrl} muted playsInline preload="metadata" />
                  )}
                  <span className="cw-example-play" aria-hidden>
                    <Play size={16} strokeWidth={0} fill="currentColor" />
                  </span>
                </span>
                {video.caption && (
                  <span className="cw-example-caption">{video.caption}</span>
                )}
              </button>
            ))}
        </div>
      </div>

      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-xs gap-0 overflow-hidden rounded-2xl bg-black p-0 sm:max-w-xs">
          <DialogTitle className="sr-only">
            {activeVideo?.title ?? "Example intro video"}
          </DialogTitle>
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
          {activeVideo?.caption && (
            <p className="bg-black px-4 py-3 text-center text-xs text-white/80">
              {activeVideo.caption}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
