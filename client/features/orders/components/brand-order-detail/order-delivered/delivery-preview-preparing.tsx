"use client";

import { Clapperboard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderDeliveryItem } from "../../../api/get-brand-order-deliveries";

export function getLatestDeliveryPreviewState(items: OrderDeliveryItem[]) {
  const latestDelivery = items.at(-1);
  const assets = latestDelivery?.assets ?? [];
  const previewGenerating =
    assets.length > 0 &&
    assets.some(
      (asset) =>
        asset.watermarked &&
        (!asset.url || asset.previewStatus === "pending"),
    );
  const isRevision = (latestDelivery?.revisionsUsed ?? 0) > 0;

  return {
    latestDelivery,
    previewGenerating,
    isRevision,
    playableAssets: assets.filter((asset) => !!asset.url),
  };
}

interface DeliveryPreviewPreparingProps {
  creatorName?: string;
  isRevision?: boolean;
  className?: string;
}

export function DeliveryPreviewPreparing({
  creatorName = "Creator",
  isRevision = false,
  className,
}: DeliveryPreviewPreparingProps) {
  const headline = isRevision
    ? `${creatorName} is working on your revision`
    : `${creatorName} is preparing your preview`;

  const subline = isRevision
    ? "Fresh content is on the way — we'll show it here as soon as it's ready."
    : "Hang tight while we generate a watermarked preview for you.";

  return (
    <div
      className={cn(
        "relative flex min-h-[263px] xl:min-h-[295px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-violet-500/[0.08] px-6 py-10 text-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
      >
        <div className="absolute -left-8 top-8 size-32 rounded-full bg-primary/10 blur-2xl animate-pulse" />
        <div className="absolute -right-6 bottom-6 size-40 rounded-full bg-violet-500/10 blur-3xl animate-pulse [animation-delay:700ms]" />
      </div>

      <div className="relative mb-6 flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping [animation-duration:2.4s]" />
        <span className="absolute inset-1 rounded-full border border-dashed border-primary/30 animate-spin [animation-duration:10s]" />
        <span className="absolute inset-3 rounded-full bg-primary/10 animate-pulse" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-background/90 shadow-lg ring-1 ring-primary/20 backdrop-blur-sm">
          <Clapperboard className="size-7 text-primary animate-bounce [animation-duration:2s]" />
        </div>
      </div>

      <div className="relative max-w-md space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="size-4 text-primary animate-pulse" />
          <p className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {headline}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{subline}</p>
      </div>

      <div className="relative mt-6 flex items-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-primary/70 animate-bounce"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>

      <p className="relative mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
        Auto-refreshing
      </p>
    </div>
  );
}
