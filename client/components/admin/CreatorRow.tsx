import React from "react";
import Image from "next/image";
import { CreatorProfileResponseDto } from "@/features/admin/types";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { RejectDialog } from "./RejectDialog";

export default function CreatorRow({
  creator,
  delay,
  onReview,
}: {
  creator: CreatorProfileResponseDto;
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

  const getImageUrl = () => {
    if (creator.profileImageUrl) return creator.profileImageUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.displayName)}&background=random`;
  };

  const niche = creator.categories?.[0]?.category || "Creator";
  const portfolioVideos = creator.firstPortfolioVideo
    ? [
        creator.firstPortfolioVideo.thumbnailUrl ||
          creator.firstPortfolioVideo.videoUrl,
      ]
    : [];

  return (
    <div
      className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex items-center justify-between transition-all duration-300 hover:bg-accent/60 border-l-4 border-l-transparent hover:border-l-primary hover:shadow-lg hover:shadow-primary/5 reveal-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center space-x-6">

        <div className="relative">
          <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-full opacity-0 group-hover/item:opacity-100 blur transition-opacity duration-500"></div>
          <Image
            alt="Creator Profile"
            width={56}
            height={56}
            className="relative w-14 h-14 rounded-full object-cover border-2 border-border"
            src={getImageUrl()}
            unoptimized
          />
        </div>
        <div>
          <h3 className="font-headline font-bold text-lg mb-0.5">
            {creator.displayName}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-primary-container/20 text-primary rounded-md border border-primary/20 uppercase tracking-wider">
              {niche}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-10">
        <div className="hidden xl:block min-w-[120px]">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
            Reach
          </p>
          <p className="font-bold text-base">
            N/A{" "}
            <span className="text-xs font-normal text-muted-foreground">
              Followers
            </span>
          </p>
        </div>

        <div className="hidden xl:block">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
            Portfolio
          </p>
          <div className="flex -space-x-2">
            {portfolioVideos.map((mediaUrl: string, idx: number) => {
              const isVideo =
                mediaUrl.toLowerCase().includes(".mp4") ||
                mediaUrl.toLowerCase().includes(".webm") ||
                mediaUrl.toLowerCase().includes(".mov");
              return (
                <div
                  key={idx}
                  className="relative w-8 h-8 rounded-lg bg-card border border-border/30 overflow-hidden"
                >
                  {isVideo ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Image
                      alt="Asset"
                      src={mediaUrl}
                      fill
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  )}
                </div>
              );
            })}
            {portfolioVideos.length === 0 && (
              <div className="w-8 h-8 rounded-lg bg-card border border-border/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                -
              </div>
            )}
            <div className="w-8 h-8 rounded-lg bg-card border border-border/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              +
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
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
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
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
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
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
