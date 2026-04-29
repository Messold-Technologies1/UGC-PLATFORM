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
  duration?: string;
  id?: string;
};

export interface ThumbnailsCarouselProps {
  className?: string;
  assets?: CarouselAsset[];
  isEditable?: boolean;
  onRemove?: (index: number) => void;
}

export function ThumbnailsCarousel({ 
  className,
  assets = [],
  isEditable = false,
  onRemove
}: ThumbnailsCarouselProps) {
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
      className={cn("w-full transition-opacity duration-300", className)}
    >
      <Carousel.ItemGroup className="relative mb-4 aspect-video max-h-[70vh] overflow-hidden rounded-2xl border bg-black shadow-sm">
        {assets.map((asset, index) => (
          <Carousel.Item key={asset.id ?? index} index={index} className="relative h-full w-full">
            {asset.type === "video" ? (
              <>
                <video
                  ref={(node) => {
                    videoRefs.current[index] = node;
                  }}
                  src={asset.full}
                  className="absolute inset-0 z-10 h-full w-full object-contain"
                  playsInline
                  preload="metadata"
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

      <div className="flex items-center gap-3">
        {assets.length > 1 && (
          <Carousel.PrevTrigger className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
            <ChevronLeft className="w-5 h-5" />
          </Carousel.PrevTrigger>
        )}

        <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1">
          {assets.map((asset, index) => (
            <div key={asset.id ?? index} className="group/thumb relative aspect-video w-24 shrink-0">
              <Carousel.Indicator
                index={index}
                className="absolute inset-0 w-full h-full ring-2 ring-transparent data-current:ring-primary data-current:ring-offset-2 ring-offset-background rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-primary/50 bg-black block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {asset.type === "video" ? (
                  <video
                    src={asset.thumb}
                    className={cn(
                      "h-full w-full object-cover transition-opacity",
                      currentPage === index ? "opacity-100" : "opacity-65",
                    )}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <Image
                    src={asset.thumb}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    sizes="8rem"
                    className={cn(
                      "object-cover transition-opacity",
                      currentPage === index ? "opacity-100" : "opacity-65",
                    )}
                    unoptimized={asset.thumb.startsWith("blob:")}
                  />
                )}
                {asset.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Play className="w-6 h-6 text-white/80 drop-shadow-md" fill="currentColor" />
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

        {assets.length > 1 && (
          <Carousel.NextTrigger className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
            <ChevronRight className="w-5 h-5" />
          </Carousel.NextTrigger>
        )}
      </div>
    </Carousel.Root>
  );
}
