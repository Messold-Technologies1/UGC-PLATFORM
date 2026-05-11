import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "lime" | "pink" | "sky" | "grape" | "dark";

const tones: Record<Tone, string> = {
  lime: "bg-lime text-lime-foreground border-foreground",
  pink: "bg-pink text-pink-foreground border-foreground",
  sky: "bg-sky text-sky-foreground border-foreground",
  grape: "bg-grape text-grape-foreground border-foreground",
  dark: "bg-foreground text-background border-foreground",
};

export function Sticker({
  tone = "lime",
  children,
  className,
  rotate,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sticker",
        tones[tone],
        className,
      )}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {children}
    </span>
  );
}
