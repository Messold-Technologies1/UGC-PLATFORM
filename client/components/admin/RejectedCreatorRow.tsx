import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Play, Video } from "lucide-react";
import { RejectedCreatorApprovalListItemDto } from "@/features/admin/types";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { Button } from "@/components/ui/button";

function formatLocation(creator: RejectedCreatorApprovalListItemDto): string {
  const parts = [creator.city, creator.stateName, creator.countryName].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

function formatRejectedAt(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function RejectedCreatorRow({
  creator,
  delay,
  onReview,
}: {
  creator: RejectedCreatorApprovalListItemDto;
  delay: number;
  onReview: () => void;
}) {
  const { mutate: approve, isPending: isApproving } =
    useApproveCreatorMutation();

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    approve(creator.id);
  };

  const categories = creator.contentCategories ?? [];
  const primaryCategory = categories[0]?.label ?? "Creator";

  return (
    <div
      className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all duration-300 hover:bg-accent/60 border-l-4 border-l-destructive/70 hover:shadow-lg hover:shadow-destructive/5 reveal-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center space-x-6 min-w-0 flex-1">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-destructive/20 bg-destructive/10 font-headline text-lg font-bold text-destructive">
          {creator.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <h3 className="font-headline font-bold text-lg mb-0.5 truncate">
            {creator.displayName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-destructive/10 text-destructive rounded-md border border-destructive/20 uppercase tracking-wider shrink-0">
              Rejected
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-primary-container/20 text-primary rounded-md border border-primary/20 uppercase tracking-wider shrink-0">
              {primaryCategory}
            </span>
          </div>
          {creator.rejectionReason ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {creator.rejectionReason}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No rejection reason provided
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-8 lg:gap-10 shrink-0">
        <div className="min-w-[140px]">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Location
          </p>
          <p className="font-bold text-sm truncate">{formatLocation(creator)}</p>
        </div>

        <div className="min-w-[120px]">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Rejected
          </p>
          <p className="font-bold text-sm">{formatRejectedAt(creator.rejectedAt)}</p>
        </div>

        <div className="hidden md:flex flex-col min-w-[120px]">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Portfolio
          </p>
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => {
              const video = creator.portfolioVideos?.[i];
              if (!video) {
                return (
                  <div
                    key={i}
                    className="relative h-8 w-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center shrink-0"
                  >
                    <Video className="size-3 text-muted-foreground/40" />
                  </div>
                );
              }
              const hasVideo = Boolean(video.videoUrl?.trim());

              return (
                <div
                  key={i}
                  className="relative h-8 w-8 rounded-lg border-2 border-background bg-muted overflow-hidden flex items-center justify-center shrink-0"
                >
                  {hasVideo ? (
                    <video
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      poster={video.thumbnailUrl || undefined}
                    />
                  ) : video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt="Portfolio video"
                      fill
                      className="object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="size-3 text-white fill-white opacity-80" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 self-center">
          <button
            type="button"
            className="px-5 py-2 rounded-lg text-sm font-bold text-foreground hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onReview();
            }}
          >
            Review
          </button>
          <Button variant="ghost" size="icon" className="size-9" asChild>
            <Link href={`/admin/creators/${creator.id}`}>
              <Pencil className="size-4" />
            </Link>
          </Button>
          <button
            type="button"
            className="px-4 py-2 bg-linear-to-tr from-primary to-secondary text-on-primary-fixed rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
            onClick={handleApprove}
            disabled={isApproving}
          >
            {isApproving ? "Approving…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
