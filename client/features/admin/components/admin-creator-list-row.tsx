"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  Bookmark,
  BookmarkX,
  MapPin,
  Pencil,
  Play,
  Sparkles,
  Star,
  UserX,
  Video,
} from "lucide-react";
import type {
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
} from "@/features/admin/types";
import {
  formatCreatorLocation,
  formatInrPrice,
} from "@/features/admin/constants/admin-creator-tabs";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useFeatureCreatorMutation } from "@/features/admin/hooks/use-feature-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { useShortlistCreatorMutation } from "@/features/admin/hooks/use-shortlist-creator-mutation";
import { useUnfeatureCreatorMutation } from "@/features/admin/hooks/use-unfeature-creator-mutation";
import { useUnshortlistCreatorMutation } from "@/features/admin/hooks/use-unshortlist-creator-mutation";
import { RejectDialog } from "@/components/admin/RejectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatRowDate(iso?: string | null): string {
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

function getRowDateColumn(creator: AdminCreatorListItemDto): {
  label: string;
  value: string;
} {
  if (creator.approvalStatus === "REJECTED") {
    return {
      label: "Rejected",
      value: formatRowDate(creator.rejectedAt),
    };
  }
  if (creator.approvalStatus === "APPROVED") {
    return {
      label: "Approved",
      value: formatRowDate(creator.approvedAt),
    };
  }
  if (creator.approvalStatus === "SHORTLISTED") {
    return {
      label: "Shortlisted",
      value: formatRowDate(creator.approvedAt),
    };
  }
  return {
    label: "Submitted",
    value: formatRowDate(creator.submittedAt),
  };
}

function CreatorAvatar({ creator }: { creator: AdminCreatorListItemDto }) {
  const initials = creator.displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (creator.profileImageUrl) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
        {/* unoptimized: 56px avatar loaded straight from the CDN. The Next image
            optimizer chokes when a whole list of large source photos is resized
            at once, which left the avatars broken while the raw URLs load fine. */}
        <Image
          src={creator.profileImageUrl}
          alt={`${creator.displayName} profile`}
          fill
          unoptimized
          className="object-cover"
          sizes="56px"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-primary/10 font-headline text-lg font-bold text-primary">
      {initials || creator.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function PortfolioThumbnails({
  videos,
}: {
  videos: AdminCreatorListItemDto["portfolioVideos"];
}) {
  return (
    <div className="flex -space-x-2">
      {[0, 1, 2].map((index) => {
        const video = videos?.[index];
        if (!video) {
          return (
            <div
              key={index}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-background bg-muted"
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
            key={index}
            className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border-2 border-background bg-muted"
          >
            {isVideo ? (
              <video
                src={video.videoUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
                poster={video.thumbnailUrl || undefined}
              />
            ) : (
              <Image src={mediaUrl} alt="Portfolio" fill className="object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="size-3 fill-white text-white opacity-80" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadges({ creator }: { creator: AdminCreatorListItemDto }) {
  const categories = creator.contentCategories ?? [];
  const primaryCategory = categories[0]?.label ?? "Creator";
  const profileFirst = isProfileFirstOnboardingMode();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {creator.approvalStatus === "PENDING" ? (
        <Badge variant="secondary">
          {profileFirst && creator.completeProfile
            ? "Awaiting review"
            : profileFirst
              ? "Building profile"
              : "Pending"}
        </Badge>
      ) : null}
      {creator.approvalStatus === "SHORTLISTED" ? (
        <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20">
          Shortlisted
        </Badge>
      ) : null}
      {creator.approvalStatus === "REJECTED" ? (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive"
        >
          Rejected
        </Badge>
      ) : null}
      {creator.approvalStatus === "APPROVED" ? (
        <Badge className="border-green-500/20 bg-green-500/10 text-green-700 hover:bg-green-500/20">
          Approved
        </Badge>
      ) : null}
      {!creator.completeProfile ? (
        <Badge variant="outline">Incomplete</Badge>
      ) : null}
      {creator.isListed ? (
        <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20">
          Listed
        </Badge>
      ) : null}
      {creator.isFeatured ? (
        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20">
          Featured{creator.featureRank != null ? ` #${creator.featureRank}` : ""}
        </Badge>
      ) : null}
      <span className="shrink-0 rounded-md border border-primary/20 bg-primary-container/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
        {primaryCategory}
      </span>
    </div>
  );
}

function RowMetric({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "min-w-[110px]"}>
      <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="text-sm font-bold">{children}</div>
    </div>
  );
}

export function AdminCreatorListRow({
  creator,
  segment,
  onReview,
}: {
  creator: AdminCreatorListItemDto;
  segment: AdminCreatorListSegment;
  onReview?: () => void;
}) {
  const { mutate: approve, isPending: isApproving } =
    useApproveCreatorMutation();
  const { mutate: reject, isPending: isRejecting } =
    useRejectCreatorMutation();
  const { mutate: shortlist, isPending: isShortlisting } =
    useShortlistCreatorMutation();
  const { mutate: unshortlist, isPending: isUnshortlisting } =
    useUnshortlistCreatorMutation();
  const { mutate: featureCreator, isPending: isFeaturing } =
    useFeatureCreatorMutation();
  const { mutate: unfeatureCreator, isPending: isUnfeaturing } =
    useUnfeatureCreatorMutation();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rank, setRank] = useState(String(creator.featureRank ?? 0));

  const isPending = creator.approvalStatus === "PENDING";
  const isRejected = creator.approvalStatus === "REJECTED";
  const isApproved = creator.approvalStatus === "APPROVED";
  const isIncompleteSegment = segment === "incomplete";
  const isShortlistedSegment = segment === "shortlisted";
  const isListedSegment = segment === "listed";
  const isFeaturedSegment = segment === "featured";
  const showFeatureControls = isListedSegment || isFeaturedSegment;
  const profileFirst = isProfileFirstOnboardingMode();
  const canModeratePending =
    isPending && (!profileFirst || creator.completeProfile);
  const isWorking =
    isApproving ||
    isRejecting ||
    isShortlisting ||
    isUnshortlisting ||
    isFeaturing ||
    isUnfeaturing;
  const rating = Number.parseFloat(creator.avgRating ?? "0");
  const reviewCount = creator.reviewCount ?? 0;
  const dateColumn = getRowDateColumn(creator);

  useEffect(() => {
    setRank(String(creator.featureRank ?? 0));
  }, [creator.id, creator.featureRank]);

  const handleApprove = (event: React.MouseEvent) => {
    event.stopPropagation();
    approve(creator.id);
  };

  const handleRejectClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRejectOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    setIsRejectOpen(false);
    reject({ id: creator.id, rejectionReason: reason });
  };

  const handleShortlistClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    shortlist(creator.id);
  };

  const handleUnshortlistClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    unshortlist(creator.id);
  };

  const handleFeatureClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const parsed = Number.parseInt(rank.trim(), 10);
    featureCreator({
      id: creator.id,
      rank: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      featuredUntil: null,
    });
  };

  const handleUnfeatureClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    unfeatureCreator(creator.id);
  };

  return (
    <>
      <div className="group/item relative overflow-hidden glass-panel rounded-2xl border-l-4 border-l-transparent p-4 transition-all duration-300 hover:border-l-primary hover:bg-accent/60 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <CreatorAvatar creator={creator} />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <h3 className="truncate font-headline text-lg font-bold">
                  {creator.displayName}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{formatCreatorLocation(creator)}</span>
                </div>
              </div>
              <StatusBadges creator={creator} />
              {creator.rejectionReason ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {creator.rejectionReason}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-6 lg:gap-8">
            <RowMetric label="Portfolio" className="hidden min-w-[120px] md:block">
              <PortfolioThumbnails videos={creator.portfolioVideos} />
            </RowMetric>

            <RowMetric label={dateColumn.label}>
              <span>{dateColumn.value}</span>
            </RowMetric>

            <RowMetric label="Rating">
              <div className="flex items-center gap-1">
                <Star className="size-3 fill-yellow-500 text-yellow-500" />
                <span>{rating > 0 ? rating.toFixed(1) : "New"}</span>
                {reviewCount > 0 ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({reviewCount})
                  </span>
                ) : null}
              </div>
            </RowMetric>

            <RowMetric label="Starting Price">
              <div className="flex items-center gap-1">
                <Banknote className="hidden size-3 text-muted-foreground lg:block" />
                <span>{formatInrPrice(creator.startingPrice)}</span>
              </div>
            </RowMetric>

            {showFeatureControls ? (
              <RowMetric label="Featured Rank" className="min-w-[140px]">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm font-semibold"
                  />
                  {creator.isFeatured ? (
                    <>
                      <button
                        type="button"
                        onClick={handleFeatureClick}
                        disabled={isWorking}
                        className="inline-flex h-9 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-bold text-primary"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={handleUnfeatureClick}
                        disabled={isWorking}
                        className="inline-flex h-9 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-bold text-amber-700"
                      >
                        Unfeature
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFeatureClick}
                      disabled={isWorking}
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-bold text-primary"
                    >
                      <Sparkles className="size-3" />
                      Feature
                    </button>
                  )}
                </div>
              </RowMetric>
            ) : null}

            <div className="flex items-center gap-2 self-center">
              {(canModeratePending || isRejected) && onReview ? (
                <Button variant="ghost" size="sm" onClick={onReview}>
                  Review
                </Button>
              ) : null}

              <Button variant="ghost" size="icon" className="size-9" asChild>
                <Link href={`/admin/creators/${creator.id}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>

              {isIncompleteSegment ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={handleRejectClick}
                    disabled={isWorking}
                    aria-label="Reject creator"
                  >
                    <UserX className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={handleShortlistClick}
                    disabled={isWorking}
                  >
                    <Bookmark className="size-3.5" />
                    {isShortlisting ? "Shortlisting…" : "Shortlist"}
                  </Button>
                </>
              ) : null}

              {isShortlistedSegment ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={handleRejectClick}
                    disabled={isWorking}
                    aria-label="Reject creator"
                  >
                    <UserX className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={handleUnshortlistClick}
                    disabled={isWorking}
                  >
                    <BookmarkX className="size-3.5" />
                    {isUnshortlisting ? "Removing…" : "Remove"}
                  </Button>
                </>
              ) : null}

              {canModeratePending &&
              !isIncompleteSegment &&
              !isShortlistedSegment ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={handleRejectClick}
                    disabled={isWorking}
                  >
                    <UserX className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={handleApprove}
                    disabled={isWorking}
                  >
                    {isApproving ? "Approving…" : "Approve"}
                  </Button>
                </>
              ) : null}

              {isRejected && !isIncompleteSegment && !isShortlistedSegment ? (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handleApprove}
                  disabled={isWorking}
                >
                  {isApproving ? "Approving…" : "Approve"}
                </Button>
              ) : null}

              {isApproved &&
              !isIncompleteSegment &&
              !isShortlistedSegment ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:text-destructive"
                  onClick={handleRejectClick}
                  disabled={isWorking}
                >
                  <UserX className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <RejectDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
        isWorking={isRejecting}
      />
    </>
  );
}
