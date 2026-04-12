"use client";
import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface HeroProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title: React.ReactNode;
  subtitle: string;
  images: { src: string; alt: string }[];
}

export const HeroSection = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ title, subtitle, images, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(
      Math.floor(images.length / 2),
    );

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, [images.length]);

    React.useEffect(() => {
      const timer = setInterval(() => {
        handleNext();
      }, 4000);
      return () => clearInterval(timer);
    }, [handleNext]);

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-background text-foreground p-4",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 z-0 opacity-20" aria-hidden="true">
          <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(128,90,213,0.3),rgba(255,255,255,0))]"></div>
          <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(0,123,255,0.3),rgba(255,255,255,0))]"></div>
        </div>
        <div className="z-10 flex w-full flex-col items-center text-center space-y-8 md:space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter max-w-4xl">
              {title}
            </h1>
            <p className="max-w-2xl mx-auto text-muted-foreground md:text-xl">
              {subtitle}
            </p>
          </div>

          <div className="relative w-full h-[350px] md:h-[450px] flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">
              {images.map((image, index) => {
                const offset = index - currentIndex;
                const total = images.length;
                let pos = (offset + total) % total;
                if (pos > Math.floor(total / 2)) {
                  pos = pos - total;
                }

                const isCenter = pos === 0;
                const isAdjacent = Math.abs(pos) === 1;

                return (
                  <div
                    key={index}
                    className={cn(
                      "absolute w-48 h-96 md:w-64 md:h-[450px] transition-all duration-500 ease-in-out",
                      "flex items-center justify-center",
                    )}
                    style={{
                      transform: `
                        translateX(${pos * 45}%) 
                        scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7})
                        rotateY(${pos * -10}deg)
                      `,
                      zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                      opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                      filter: isCenter ? "blur(0px)" : "blur(4px)",
                      visibility: Math.abs(pos) > 1 ? "hidden" : "visible",
                    }}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 768px) 192px, 256px"
                      className="object-cover rounded-3xl border-2 border-foreground/10 shadow-2xl"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

HeroSection.displayName = "HeroSection";
