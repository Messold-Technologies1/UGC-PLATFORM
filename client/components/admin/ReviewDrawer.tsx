import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorProfileResponseDto } from "@/features/admin/types";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { RejectDialog } from "./RejectDialog";

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
    <AnimatePresence>
      {isOpen && creator && (
        <React.Fragment key="drawer-fragment">
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55"
            onClick={onClose}
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[500px] lg:w-[600px] bg-background border-l border-border/30 z-60 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-y-auto flex flex-col [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-border/20 sticky top-0 bg-background z-10">
              <h2 className="text-xl font-headline font-bold">
                Review Creator
              </h2>
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
                <div className="flex flex-wrap gap-2">
                  {creator.categories?.map((c) => (
                    <span
                      key={c.id}
                      className="text-[10px] font-bold px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md uppercase tracking-wider"
                    >
                      {c.category}
                    </span>
                  ))}
                  {creator.personaTags?.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] font-bold px-2 py-1 bg-secondary/10 border border-secondary/20 text-secondary rounded-md uppercase tracking-wider"
                    >
                      {p.tag}
                    </span>
                  ))}
                  {creator.languages?.map((l) => (
                    <span
                      key={l.id}
                      className="text-[10px] font-bold px-2 py-1 bg-card border border-border/40 text-muted-foreground rounded-md uppercase tracking-wider"
                    >
                      {l.language}
                    </span>
                  ))}
                  {creator.onLocationAvailable && (
                    <span className="text-[10px] font-bold px-2 py-1 bg-accent border border-border/50 text-foreground rounded-md uppercase tracking-wider">
                      Travels up to {creator.travelRadius} miles
                    </span>
                  )}
                  {creator.restrictions?.map((r) => (
                    <span
                      key={r.id}
                      className="text-[10px] font-bold px-2 py-1 bg-error/10 border border-error/20 text-error rounded-md uppercase tracking-wider"
                    >
                      No {r.restriction}
                    </span>
                  ))}
                </div>
              </section>

              {creator.packages && creator.packages.length > 0 && (
                <section className="space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Packages & Delivery
                  </h3>
                  <div className="px-10">
                    <Carousel opts={{ align: "start" }} className="w-full">
                      <CarouselContent>
                        {creator.packages.map((p) => (
                          <CarouselItem key={p.id} className="md:basis-1/2">
                            <div className="glass-panel p-4 rounded-xl border border-border/20 bg-card/20 flex flex-col space-y-3 h-full">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm text-foreground pr-2 leading-tight">
                                  {p.name}
                                </h4>
                                <span className="font-bold text-sm text-primary whitespace-nowrap">
                                  ${p.priceAmount}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span className="material-symbols-outlined text-[14px]">
                                  schedule
                                </span>
                                <span>{p.deliveryDays} Days Delivery</span>
                              </div>
                              {p.deliverables && p.deliverables.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1 mt-auto">
                                  {p.deliverables.map((d, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-background/80 rounded-md border border-border/30 text-muted-foreground"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                </section>
              )}

              {creator.addOns && creator.addOns.length > 0 && (
                <section className="space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Add-Ons
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {creator.addOns.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl border border-border/30 bg-card/30 flex flex-col justify-between group hover:border-secondary/30 transition-colors"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-foreground mb-1">
                            {a.name}
                          </h4>
                          {a.description && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                              {a.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-secondary mt-3">
                          +${a.priceAmount}
                        </span>
                      </div>
                    ))}
                  </div>
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
                <span>{isApproving ? "Approving..." : "Approve Creator"}</span>
              </button>
            </div>
          </motion.aside>
        </React.Fragment>
      )}
    </AnimatePresence>

    <RejectDialog 
      isOpen={isRejectOpen} 
      onClose={() => setIsRejectOpen(false)} 
      onConfirm={handleConfirmReject} 
      isWorking={isWorking} 
    />
    </>
  );
}
