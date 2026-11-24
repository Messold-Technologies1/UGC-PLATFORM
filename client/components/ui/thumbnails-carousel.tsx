"use client";

import { Carousel } from "@ark-ui/react/carousel";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type CarouselPageChangeDetails = {
  page: number;
};

export type CarouselAsset = {
  type: "video" | "image";
  full: string;
  thumb: string;
  /**
   * Still image for a video asset: the `<video poster>` and the strip tile.
   *
   * Without one, a video tile can only show a frame by loading the video
   * itself. Safari ignores `preload="metadata"` and keeps buffering, so a
   * six-reel carousel pulled hundreds of MB and the larger files never
   * decoded a first frame at all — blank player, black thumbnails — while
   * Chrome, which honours the hint, looked fine. Supply this wherever the
   * backend has a thumbnail.
   */
  poster?: string;
  duration?: string;
  id?: string;
};

/** A local object URL costs nothing to load — it is already in memory. */
function isLocal(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

export interface ThumbnailsCarouselProps {
  className?: string;
  itemGroupClassName?: string;
  assets?: CarouselAsset[];
  isEditable?: boolean;
  onRemove?: (index: number) => void;
  /** Portfolio reels are 9:16. Default stays landscape for order-delivery cards. */
  orientation?: "landscape" | "portrait";
}

export function ThumbnailsCarousel({ 
  className,
  itemGroupClassName,
  assets = [],
  isEditable = false,
  onRemove,
  orientation = "landscape",
}: ThumbnailsCarouselProps) {
  const isPortrait = orientation === "portrait";
  const [currentPage, setCurrentPage] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const pauseVideo = useCallback((index: number, reset = false) => {
    const video = videoRefs.current[index];

    if (!video) {
      return;
    }

    video.pause();
    if (reset) {
      video.currentTime = 0;
    }
  }, []);

  const pauseOtherVideos = useCallback(
    (activeIndex: number) => {
      videoRefs.current.forEach((video, index) => {
        if (video && index !== activeIndex) {
          pauseVideo(index);
        }
      });
    },
    [pauseVideo],
  );

  const handlePageChange = useCallback(
    (details: CarouselPageChangeDetails) => {
      setCurrentPage(details.page);
      videoRefs.current.forEach((video, index) => {
        if (video && index !== details.page) {
          pauseVideo(index);
        }
      });
      // Flipping `preload` from "none" to "metadata" does not reliably start a
      // fetch for an element that has already mounted, so ask explicitly.
      const next = videoRefs.current[details.page];
      if (next && next.readyState === 0) {
        next.load();
      }
      setPlayingIndex((index) => (index === details.page ? index : null));
    },
    [pauseVideo],
  );

  const toggleVideo = useCallback(
    (index: number) => {
      const video = videoRefs.current[index];

      if (!video) {
        return;
      }

      if (!video.paused) {
        pauseVideo(index);
        setPlayingIndex(null);
        return;
      }

      pauseOtherVideos(index);
      video.play()
        .then(() => {
          setPlayingIndex(index);
        })
        .catch(() => {
          setPlayingIndex(null);
        });
    },
    [pauseOtherVideos, pauseVideo],
  );

  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, assets.length);
  }, [assets.length]);

  useEffect(() => {
    return () => {
      videoRefs.current.forEach((video) => video?.pause());
    };
  }, []);

  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <Carousel.Root
      defaultPage={0}
      slideCount={assets.length}
      onPageChange={handlePageChange}
      // `min-w-0`: DialogContent lays its children out in a grid, and a grid
      // item defaults to `min-width: auto` — without this the thumbnail row's
      // min-content width wins and the whole carousel, next-trigger included,
      // renders wider than the dialog it sits in.
      className={cn(
        "w-full min-w-0 transition-opacity duration-300",
        className,
      )}
    >
      <Carousel.ItemGroup className={cn(
        "relative overflow-hidden rounded-2xl border bg-black shadow-sm",
        isPortrait
          ? "mx-auto aspect-9/16 w-full max-h-[min(68vh,560px)] max-w-[320px]"
          : "aspect-video max-h-[70vh]",
        assets.length > 1 && "mb-4",
        itemGroupClassName,
      )}>
        {assets.map((asset, index) => (
          <Carousel.Item key={asset.id ?? index} index={index} className="relative h-full w-full">
            {asset.type === "video" ? (
              <>
                <video
                  ref={(node) => {
                    videoRefs.current[index] = node;
                  }}
                  src={asset.full}
                  poster={asset.poster}
                  className="absolute inset-0 z-10 h-full w-full object-contain"
                  playsInline
                  // Off-screen slides stay unloaded: they sit behind
                  // `overflow-hidden` and only become visible on navigation,
                  // where handlePageChange loads them.
                  preload={
                    currentPage === index || isLocal(asset.full)
                      ? "metadata"
                      : "none"
                  }
                  controls={playingIndex === index}
                  onPlay={() => {
                    pauseOtherVideos(index);
                    setPlayingIndex(index);
                  }}
                  onPause={() => {
                    setPlayingIndex((current) => (current === index ? null : current));
                  }}
                  onEnded={() => {
                    setPlayingIndex((current) => (current === index ? null : current));
                  }}
                />
              </>
            ) : (
              <>
                <Image
                  src={asset.full}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 80vw, 100vw"
                  className="scale-105 object-cover opacity-25 blur-xl"
                  aria-hidden="true"
                  unoptimized={asset.full.startsWith("blob:")}
                />
                <Image
                  src={asset.full}
                  alt={`Delivery asset ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 80vw, 100vw"
                  className="object-contain"
                  unoptimized={asset.full.startsWith("blob:")}
                />
              </>
            )}
            {asset.type === "video" && (
              <>
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleVideo(index);
                    }}
                    className={cn(
                      "pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-md transition-all hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                      playingIndex === index && "opacity-0 hover:opacity-100 focus-visible:opacity-100",
                    )}
                    aria-label={playingIndex === index ? "Pause video" : "Play video"}
                  >
                    {playingIndex === index ? (
                      <Pause className="h-8 w-8 transition-transform" fill="currentColor" />
                    ) : (
                      <Play className="ml-1 h-8 w-8 transition-transform" fill="currentColor" />
                    )}
                  </button>
                </div>
                {asset.duration && (
                  <div className="absolute bottom-4 right-4 z-20 rounded-lg bg-black/60 px-3 py-1 font-mono text-xs text-white/90 backdrop-blur-md">
                    {asset.duration}
                  </div>
                )}
              </>
            )}
          </Carousel.Item>
        ))}
      </Carousel.ItemGroup>

      {assets.length > 1 ? (
        <div className="flex items-center gap-3">
          <Carousel.PrevTrigger className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
            <ChevronLeft className="w-5 h-5" />
          </Carousel.PrevTrigger>

          {/* `justify-center` on the scroller itself overflows in both
              directions, which puts the leading tiles out of reach and pushes
              the next-trigger off the edge once there are ~6 of them. Centring
              an inner track instead keeps the scroll range correct. */}
          <div className="scrollbar-hide flex min-w-0 flex-1 overflow-x-auto px-0.5 py-1">
            <div className="mx-auto flex gap-2">
              {assets.map((asset, index) => (
                <div
                  key={asset.id ?? index}
                  className={cn(
                    "group/thumb relative shrink-0",
                    isPortrait ? "aspect-9/16 w-12" : "aspect-video w-24",
                  )}
                >
                  <Carousel.Indicator
                    index={index}
                    className="absolute inset-0 block h-full w-full cursor-pointer overflow-hidden rounded-lg bg-black ring-2 ring-transparent ring-offset-background transition-all hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-current:ring-primary data-current:ring-offset-2"
                  >
                    {asset.type === "video" && !asset.poster ? (
                      <video
                        src={asset.thumb}
                        className={cn(
                          "h-full w-full object-cover transition-opacity",
                          currentPage === index ? "opacity-100" : "opacity-65",
                        )}
                        muted
                        playsInline
                        // With no poster, the only way to paint a frame in a
                        // 48px tile is to download the reel behind it. Load at
                        // most the tile the carousel is already on; the rest
                        // stay as the black-and-play-icon placeholder.
                        preload={
                          currentPage === index || isLocal(asset.thumb)
                            ? "metadata"
                            : "none"
                        }
                      />
                    ) : (
                      <Image
                        src={asset.poster ?? asset.thumb}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        sizes="8rem"
                        className={cn(
                          "object-cover transition-opacity",
                          currentPage === index ? "opacity-100" : "opacity-65",
                        )}
                        unoptimized={isLocal(asset.poster ?? asset.thumb)}
                      />
                    )}
                    {asset.type === "video" && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <Play
                          className={cn(
                            "text-white/80 drop-shadow-md",
                            isPortrait ? "h-3.5 w-3.5" : "h-6 w-6",
                          )}
                          fill="currentColor"
                        />
                      </div>
                    )}
                  </Carousel.Indicator>
                  {isEditable && onRemove && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemove(index);
                      }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-destructive/80 transition-colors z-10"
                      aria-label="Remove asset"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Carousel.NextTrigger className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
            <ChevronRight className="w-5 h-5" />
          </Carousel.NextTrigger>
        </div>
      ) : null}
    </Carousel.Root>
  );
}
