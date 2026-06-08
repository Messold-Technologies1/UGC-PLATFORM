import React from "react";
import { PendingCreatorApprovalListItemDto } from "@/features/admin/types";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { RejectDialog } from "./RejectDialog";
import Image from "next/image";
import { LayoutGrid, Play, Video } from "lucide-react";

function formatLocation(creator: PendingCreatorApprovalListItemDto): string {
  const parts = [creator.city, creator.stateName, creator.countryName].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

export default function CreatorRow({
  creator,
  delay,
  onReview,
}: {
  creator: PendingCreatorApprovalListItemDto;
  delay: number;
  onReview: () => void;
}) {
  const { mutate: approve, isPending: isApproving } =
    useApproveCreatorMutation();
  const { mutate: reject, isPending: isRejecting } = useRejectCreatorMutation();

  const [isRejectOpen, setIsRejectOpen] = React.useState(false);

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    approve(creator.id);
  };

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRejectOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    setIsRejectOpen(false);
    reject({ id: creator.id, rejectionReason: reason });
  };

  const isWorking = isApproving || isRejecting;

  const categories = creator.contentCategories ?? [];
  const primaryCategory = categories[0]?.label ?? "Creator";
  const portfolioCount = creator.portfolioVideos?.length ?? 0;

  return (
    <div
      className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex items-center justify-between transition-all duration-300 hover:bg-accent/60 border-l-4 border-l-transparent hover:border-l-primary hover:shadow-lg hover:shadow-primary/5 reveal-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center space-x-6 min-w-0 flex-1">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-primary/10 font-headline text-lg font-bold text-primary">
          {creator.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <h3 className="font-headline font-bold text-lg mb-0.5 truncate">
            {creator.displayName}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-primary-container/20 text-primary rounded-md border border-primary/20 uppercase tracking-wider shrink-0">
              {primaryCategory}
            </span>
            {categories.length > 1 && (
              <span className="text-[9px] text-muted-foreground font-bold shrink-0">
                +{categories.length - 1}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-10 pt-1 shrink-0">
        <div className="hidden xl:block w-[180px] shrink-0">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Location
          </p>
          <p className="font-bold text-sm truncate">
            {formatLocation(creator)}
          </p>
        </div>

        <div className="hidden lg:block w-[100px] shrink-0">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Age
          </p>
          <p className="font-bold text-base">
            {creator.age != null ? creator.age : "—"}
          </p>
        </div>

        <div className="hidden xl:flex flex-col w-[120px] shrink-0">
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
                    className="relative h-8 w-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center shrink-0 z-0"
                  >
                    <Video className="size-3 text-muted-foreground/40" />
                  </div>
                );
              }
              const mediaUrl = video.thumbnailUrl || video.videoUrl;
              const isVideo =
                mediaUrl.toLowerCase().includes(".mp4") ||
                mediaUrl.toLowerCase().includes(".webm") ||
                mediaUrl.toLowerCase().includes(".mov");

              return (
                <div
                  key={i}
                  className="relative h-8 w-8 rounded-lg border-2 border-background bg-muted overflow-hidden flex items-center justify-center shrink-0 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] transition-transform hover:scale-110 hover:z-10 z-0 group/thumb"
                >
                  {isVideo ? (
                    <video
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      poster={video.thumbnailUrl || undefined}
                    />
                  ) : (
                    <Image
                      src={mediaUrl}
                      alt="Portfolio video"
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="size-3 text-white fill-white opacity-80" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-4 self-center">
          <button
            className="px-5 py-2 rounded-lg text-sm font-bold text-foreground hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onReview();
            }}
          >
            Review
          </button>
          <div className="flex items-center space-x-1.5 bg-background/50 p-1 rounded-full">
            <button
              className="p-2 hover:bg-error-container/20 hover:text-error rounded-full transition-all text-muted-foreground disabled:opacity-50 flex items-center justify-center"
              onClick={handleRejectClick}
              disabled={isWorking}
              title="Reject"
            >
              {isRejecting ? (
                <span className="material-symbols-outlined text-lg animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-lg">close</span>
              )}
            </button>
            <button
              className="p-2 bg-linear-to-tr from-primary to-secondary text-on-primary-fixed rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center"
              onClick={handleApprove}
              disabled={isWorking}
              title="Approve"
            >
              {isApproving ? (
                <span className="material-symbols-outlined text-lg animate-spin">
                  progress_activity
                </span>
              ) : (
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <RejectDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
        isWorking={isWorking}
      />
    </div>
  );
}
