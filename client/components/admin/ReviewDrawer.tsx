import React from "react";
import Image from "next/image";
import { CreatorProfileResponseDto } from "@/features/admin/types";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { RejectDialog } from "./RejectDialog";
import { PackagesTab } from "@/features/creators/components/packages-tab";

export default function ReviewDrawer({
  isOpen,
  onClose,
  creator,
}: {
  isOpen: boolean;
  onClose: () => void;
  creator?: CreatorProfileResponseDto | null;
}) {
  const { mutate: approve, isPending: isApproving } =
    useApproveCreatorMutation();
  const { mutate: reject, isPending: isRejecting } = useRejectCreatorMutation();

  const [isRejectOpen, setIsRejectOpen] = React.useState(false);


  const mappedPackages = (() => {
    if (!creator?.packages) return [];
    return creator.packages.map((p) => {
      let tier: "basic" | "standard" | "premium" = "basic";
      const lowerName = p.name.toLowerCase();
      if (lowerName.includes("standard") || lowerName.includes("pro") || lowerName.includes("popular")) tier = "standard";
      else if (lowerName.includes("premium") || lowerName.includes("elite")) tier = "premium";

      return {
        id: p.id,
        tier,
        label: p.name,
        price: parseFloat(p.priceAmount) || 0,
        deliveryDays: p.deliveryDays,
        revisions: (p as unknown as { maxRevisions?: number }).maxRevisions || 1,
        features: p.deliverables || [],
      };
    });
  })();

  const mappedAddOns = (() => {
    if (!creator?.addOns) return [];
    return creator.addOns.map((a) => ({
      id: a.id,
      label: a.name,
      price: parseFloat(a.priceAmount) || 0,
    }));
  })();

  const handleApprove = () => {
    if (!creator) return;
    approve(creator.id, {
      onSuccess: () => onClose(),
    });
  };

  const handleRejectClick = () => {
    setIsRejectOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    if (!creator) return;
    setIsRejectOpen(false);
    reject(
      { id: creator.id, rejectionReason: reason },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const isWorking = isApproving || isRejecting;

  const getImageUrl = () => {
    if (!creator) return "";
    if (creator.profileImageUrl) return creator.profileImageUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.displayName)}&background=random`;
  };

  const portfolioVideos = creator?.firstPortfolioVideo
    ? [
        creator.firstPortfolioVideo.thumbnailUrl ||
          creator.firstPortfolioVideo.videoUrl,
      ]
    : [];

  return (
    <>
      <Drawer
        open={isOpen && !!creator}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-[500px] lg:data-[vaul-drawer-direction=right]:max-w-[600px] h-full data-[vaul-drawer-direction=right]:rounded-none border-l border-border/30 bg-background shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-y-auto flex flex-col [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {creator && (
            <>
              <div className="flex items-center justify-between px-8 py-6 border-b border-border/20 sticky top-0 bg-background z-10">
                <DrawerTitle className="text-xl font-headline font-bold">
                  Review Creator
                </DrawerTitle>
                <button
                  className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={onClose}
                  disabled={isWorking}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-8 space-y-8 flex-1">
                <section className="flex items-start space-x-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-2xl opacity-40 blur-sm"></div>
                    <Image
                      alt="Creator Profile"
                      width={112}
                      height={112}
                      className="relative w-28 h-28 rounded-2xl object-cover ring-2 ring-primary/20"
                      src={getImageUrl()}
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h1 className="text-3xl font-headline font-extrabold tracking-tight">
                      {creator.displayName}
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {creator.bio ||
                        "Multidisciplinary visual artist specializing in hyper-realistic tech cinematography and urban exploration."}
                    </p>
                    <div className="flex items-center space-x-4 pt-2">
                      <a
                        className="flex items-center space-x-2 text-xs font-bold text-muted-foreground hover:text-secondary transition-colors"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-base">
                          location_on
                        </span>
                        <span>{creator.city || "Unknown Location"}</span>
                      </a>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Creator Details
                  </h3>
                  <div className="space-y-3">
                    {creator.categories && creator.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {creator.categories.map((c) => (
                          <span
                            key={c.id}
                            className="text-[10px] font-bold px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md uppercase tracking-wider"
                          >
                            {c.category}
                          </span>
                        ))}
                      </div>
                    )}

                    {creator.personaTags && creator.personaTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {creator.personaTags.map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] font-bold px-2 py-1 bg-secondary text-secondary-foreground rounded-md uppercase tracking-wider"
                          >
                            {p.tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {creator.languages && creator.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {creator.languages.map((l) => (
                          <span
                            key={l.id}
                            className="text-[10px] font-bold px-2 py-1 bg-card border border-border/40 text-muted-foreground rounded-md uppercase tracking-wider"
                          >
                            {l.language}
                          </span>
                        ))}
                      </div>
                    )}

                    {creator.onLocationAvailable && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-bold px-2 py-1 bg-accent border border-border/50 text-foreground rounded-md uppercase tracking-wider">
                          Travels up to {creator.travelRadius} miles
                        </span>
                      </div>
                    )}

                    {creator.restrictions &&
                      creator.restrictions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {creator.restrictions.map((r) => (
                            <span
                              key={r.id}
                              className="text-[10px] font-bold px-2 py-1 bg-error/10 border border-error/20 text-error rounded-md uppercase tracking-wider"
                            >
                              No {r.restriction}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                </section>

                {(mappedPackages.length > 0 || mappedAddOns.length > 0) && (
                  <section className="space-y-6">
                    <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Packages & Delivery
                    </h3>
                    <PackagesTab
                      packages={mappedPackages}
                      addOns={mappedAddOns}
                      readOnly={true}
                    />
                  </section>
                )}

                <section className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Portfolio Highlights
                    </h3>
                    <button className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">
                      View Source Links
                    </button>
                  </div>
                  {portfolioVideos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {portfolioVideos.map((mediaUrl: string, idx: number) => {
                        const isVideo =
                          mediaUrl.toLowerCase().includes(".mp4") ||
                          mediaUrl.toLowerCase().includes(".webm") ||
                          mediaUrl.toLowerCase().includes(".mov");
                        return (
                          <div
                            key={idx}
                            className="aspect-4/5 rounded-xl overflow-hidden bg-card border border-border/20 relative group/thumb"
                          >
                            {isVideo ? (
                              <video
                                src={mediaUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            ) : (
                              <Image
                                alt="Portfolio item"
                                fill
                                className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110"
                                src={mediaUrl}
                                unoptimized
                              />
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-end p-4">
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                Video {idx + 1}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-card/20 rounded-xl border border-border/20 cursor-not-allowed">
                      <p className="text-muted-foreground text-sm font-medium">
                        No portfolio items provided...
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <div className="p-8 border-t border-border/20 bg-background/95 backdrop-blur-md sticky bottom-0 flex space-x-4">
                <button
                  className="flex-1 py-4 rounded-xl border border-border text-muted-foreground font-bold text-sm uppercase tracking-wider hover:bg-error/10 hover:text-error hover:border-error/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  onClick={handleRejectClick}
                  disabled={isWorking}
                >
                  {isRejecting && (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  <span>{isRejecting ? "Rejecting..." : "Reject"}</span>
                </button>
                <button
                  className="flex-2 w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider hover:brightness-110 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  onClick={handleApprove}
                  disabled={isWorking}
                >
                  {isApproving && (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  <span>
                    {isApproving ? "Approving..." : "Approve Creator"}
                  </span>
                </button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <RejectDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
        isWorking={isWorking}
      />
    </>
  );
}
