import React from "react";
import Image from "next/image";
import { PendingCreatorApprovalListItemDto } from "@/features/admin/types";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { RejectDialog } from "./RejectDialog";

function formatLocation(creator: PendingCreatorApprovalListItemDto): string {
  const parts = [creator.city, creator.stateName, creator.countryName].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : "Not provided";
}

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function ReviewDrawer({
  isOpen,
  onClose,
  creator,
}: {
  isOpen: boolean;
  onClose: () => void;
  creator?: PendingCreatorApprovalListItemDto | null;
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

  const portfolioVideos = creator?.portfolioVideos ?? [];

  return (
    <>
      <Drawer
        open={isOpen && !!creator}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-[500px] lg:data-[vaul-drawer-direction=right]:max-w-[600px] h-full data-[vaul-drawer-direction=right]:rounded-none border-l border-border/30 bg-background shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-y-auto overflow-x-hidden flex flex-col [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-headline text-4xl font-extrabold text-primary ring-2 ring-primary/20">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h1 className="text-3xl font-headline font-extrabold tracking-tight">
                      {creator.displayName}
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {creator.bio || "No bio provided."}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">
                          location_on
                        </span>
                        {formatLocation(creator)}
                      </span>
                      <span className="text-border">|</span>
                      <span>
                        Submitted {formatSubmittedAt(creator.submittedAt)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Signup details
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                        Email
                      </dt>
                      <dd className="font-medium break-all">
                        {creator.contactEmail || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                        Phone
                      </dt>
                      <dd className="font-medium">
                        {creator.phone || "—"}
                        {creator.phoneVerified && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-primary">
                            Verified
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                        Age
                      </dt>
                      <dd className="font-medium">
                        {creator.age != null ? `${creator.age} years` : "—"}
                        {creator.gender && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {creator.gender.replace(/_/g, " ")}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                        Instagram
                      </dt>
                      <dd className="font-medium break-all">
                        {creator.instagramUrl ? (
                          <a
                            href={creator.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {creator.instagramUrl}
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                        Google Drive
                      </dt>
                      <dd className="font-medium break-all">
                        {creator.driveLink ? (
                          <a
                            href={creator.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {creator.driveLink}
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>

                  {creator.contentCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {creator.contentCategories.map((c) => (
                        <span
                          key={c.slug}
                          className="text-[10px] font-bold px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md uppercase tracking-wider"
                        >
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4 pb-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Portfolio ({portfolioVideos.length})
                  </h3>
                  {portfolioVideos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {portfolioVideos.map((video, idx) => {
                        const mediaUrl =
                          video.thumbnailUrl || video.videoUrl;
                        const isVideo =
                          mediaUrl.toLowerCase().includes(".mp4") ||
                          mediaUrl.toLowerCase().includes(".webm") ||
                          mediaUrl.toLowerCase().includes(".mov");
                        return (
                          <div
                            key={video.id}
                            className="aspect-4/5 rounded-xl overflow-hidden bg-card border border-border/20 relative group/thumb"
                          >
                            {isVideo ? (
                              <video
                                src={video.videoUrl}
                                className="w-full h-full object-cover"
                                controls
                                muted
                                playsInline
                              />
                            ) : (
                              <Image
                                alt={`Portfolio ${idx + 1}`}
                                fill
                                className="object-cover transition-transform duration-700 group-hover/thumb:scale-110"
                                src={mediaUrl}
                                unoptimized
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : creator.driveLink ? (
                    <div className="rounded-xl border border-border/20 bg-card/20 px-4 py-3 text-sm">
                      <p className="text-muted-foreground font-medium">
                        Portfolio provided via Google Drive at signup.
                      </p>
                      <a
                        href={creator.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block break-all text-primary hover:underline"
                      >
                        Open Drive folder
                      </a>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-card/20 rounded-xl border border-border/20">
                      <p className="text-muted-foreground text-sm font-medium">
                        No portfolio videos uploaded at signup.
                      </p>
                    </div>
                  )}
                </section>

                <p className="text-xs text-muted-foreground border-t border-border/30 pt-6">
                  Packages, languages, and full profile details can be added
                  after approval via the creator profile update flow.
                </p>
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
