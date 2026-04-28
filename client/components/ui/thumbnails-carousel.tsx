"use client";

import { Carousel } from "@ark-ui/react/carousel";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <Carousel.Root
      defaultPage={0}
      slideCount={assets.length}
      className={cn("w-full transition-opacity duration-300", className)}
    >
      <Carousel.ItemGroup className="relative aspect-video rounded-2xl overflow-hidden bg-black group border shadow-sm mb-4">
        {assets.map((asset, index) => (
          <Carousel.Item key={index} index={index} className="w-full h-full relative">
            <Image
              src={asset.full}
              alt={`Slide ${index + 1}`}
              fill
              className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            {asset.type === "video" && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-colors border border-white/20 group/play">
                    <Play className="w-8 h-8 text-white ml-1 group-hover/play:scale-110 transition-transform" />
                  </button>
                </div>
                {asset.duration && (
                  <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-xs font-mono text-white/90">
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

        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          {assets.map((asset, index) => (
            <div key={index} className="relative shrink-0 w-24 aspect-video group/thumb">
              <Carousel.Indicator
                index={index}
                className="absolute inset-0 w-full h-full border-2 border-transparent data-current:border-primary rounded-lg overflow-hidden cursor-pointer transition-all hover:border-primary/50 bg-black block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Image
                  src={asset.thumb}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover opacity-60 data-current:opacity-100 transition-opacity"
                />
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
