"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  MapPin,
  Pencil,
  Play,
  SendHorizontal,
  Sparkles,
  Instagram,
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
import { formatFollowers } from "@/features/admin/lib/format-followers";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useFeatureCreatorMutation } from "@/features/admin/hooks/use-feature-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { useSendCreatorForReviewMutation } from "@/features/admin/hooks/use-send-creator-for-review-mutation";
import { useUnfeatureCreatorMutation } from "@/features/admin/hooks/use-unfeature-creator-mutation";
import { RejectDialog } from "@/components/admin/RejectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";

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

function getRowDateColumn(
  creator: AdminCreatorListItemDto,
  segment: AdminCreatorListSegment,
): {
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
  if (creator.approvalStatus === "SELF_COMPLETED") {
    return {
      label: "Completed",
      value: formatRowDate(creator.approvedAt ?? creator.submittedAt),
    };
  }
  if (creator.approvalStatus === "WITHDRAWN") {
    return {
      label: "Withdrawn",
      value: formatRowDate(creator.withdrawnAt ?? creator.submittedAt),
    };
  }
  if (segment === "incomplete") {
    return {
      label: "Registered",
      value: formatRowDate(creator.submittedAt),
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

function instagramProfileHref(creator: AdminCreatorListItemDto): string | null {
  const raw = creator.instagramUrl?.trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^(www\.)?instagram\.com\//i.test(raw)) return `https://${raw}`;
    const handle = raw.replace(/^@/, "").replace(/^\/+/, "");
    return handle ? `https://www.instagram.com/${handle}` : null;
  }
  const username = creator.instagramUsername?.trim();
  return username ? `https://www.instagram.com/${username}` : null;
}

function instagramProfileLabel(
  creator: AdminCreatorListItemDto,
  href: string,
): string {
  const username = creator.instagramUsername?.trim().replace(/^@/, "");
  if (username) return `@${username}`;
  try {
    const handle = new URL(href).pathname.split("/").filter(Boolean)[0];
    if (handle) return `@${decodeURIComponent(handle)}`;
  } catch {
    // fall through
  }
  return (
    creator.instagramUrl?.trim().replace(/^https?:\/\/(www\.)?/i, "") ??
    "Open profile"
  );
}

function InstagramProfileLink({
  creator,
}: {
  creator: AdminCreatorListItemDto;
}) {
  const href = instagramProfileHref(creator);
  if (!href) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={href}
      className="inline-flex max-w-40 items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary"
    >
      <Instagram className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{instagramProfileLabel(creator, href)}</span>
    </a>
  );
}

function InstagramFollowers({ creator }: { creator: AdminCreatorListItemDto }) {
  const count = creator.instagramFollowers;

  if (count === null || count === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div
      className="flex items-center gap-1.5"
      title={
        creator.instagramUsername
          ? `@${creator.instagramUsername} — ${count.toLocaleString()} followers`
          : `${count.toLocaleString()} followers`
      }
    >
      <Instagram className="size-3 shrink-0 text-muted-foreground" />
      <span>{formatFollowers(count)}</span>
    </div>
  );
}

/** Portfolio videos as carousel assets, for the preview modal. */
function toCarouselAssets(
  videos: AdminCreatorListItemDto["portfolioVideos"],
): CarouselAsset[] {
  return (videos ?? [])
    .filter((video) => Boolean(video.videoUrl?.trim()))
    .map((video) => ({
      type: "video" as const,
      full: video.videoUrl,
      thumb: video.thumbnailUrl ?? video.videoUrl,
      id: video.id,
    }));
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

        const hasVideo = Boolean(video.videoUrl?.trim());

        return (
          <div
            key={index}
            className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border-2 border-background bg-muted"
          >
            {hasVideo ? (
              <video
                src={video.videoUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                poster={video.thumbnailUrl || undefined}
              />
            ) : video.thumbnailUrl ? (
              <Image src={video.thumbnailUrl} alt="Portfolio" fill className="object-cover" />
            ) : null}
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
      {creator.approvalStatus === "SELF_COMPLETED" ? (
        <Badge className="border-teal-500/20 bg-teal-500/10 text-teal-700 hover:bg-teal-500/20">
          Self complete
        </Badge>
      ) : null}
      {creator.approvalStatus === "WITHDRAWN" ? (
        <Badge className="border-orange-500/20 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20">
          Withdrawn
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
      {!creator.completeProfile && creator.approvalStatus !== "WITHDRAWN" ? (
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

/**
 * What a listed creator still owes, as sent by the server for the
 * listed_complete / listed_incomplete segments. Shown in full rather than
 * truncated to one item: the whole point of the segment is knowing what to
 * chase each creator for.
 */
function MissingRequirements({
  missing,
}: {
  missing: string[] | undefined;
}) {
  if (!missing?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        Still missing
      </span>
      {missing.map((item) => (
        <Badge
          key={item}
          variant="outline"
          className="border-rose-500/30 bg-rose-500/10 text-[10px] font-semibold text-rose-700"
        >
          {item}
        </Badge>
      ))}
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
  const { mutate: sendForReview, isPending: isSendingForReview } =
    useSendCreatorForReviewMutation();
  const { mutate: featureCreator, isPending: isFeaturing } =
    useFeatureCreatorMutation();
  const { mutate: unfeatureCreator, isPending: isUnfeaturing } =
    useUnfeatureCreatorMutation();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const portfolioAssets = toCarouselAssets(creator.portfolioVideos);
  const [rank, setRank] = useState(String(creator.featureRank ?? 0));

  const isPending = creator.approvalStatus === "PENDING";
  const isRejected = creator.approvalStatus === "REJECTED";
  const isApproved = creator.approvalStatus === "APPROVED";
  const isSelfCompleted = creator.approvalStatus === "SELF_COMPLETED";
  const isIncompleteSegment = segment === "incomplete";
  const isSelfCompletedSegment = segment === "self_completed";
  const isListedSegment = segment === "listed";
  const isFeaturedSegment = segment === "featured";
  const showFeatureControls = isListedSegment || isFeaturedSegment;
  const profileFirst = isProfileFirstOnboardingMode();
  const isAwaitingReviewSegment = segment === "pending";
  const canModeratePending =
    isPending && (!profileFirst || creator.completeProfile);
  const isWorking =
    isApproving ||
    isRejecting ||
    isSendingForReview ||
    isFeaturing ||
    isUnfeaturing;
  const dateColumn = getRowDateColumn(creator, segment);

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

  const handleSendForReviewClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    sendForReview(creator.id);
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
              <MissingRequirements missing={creator.missingRequirements} />
              {creator.rejectionReason ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {creator.rejectionReason}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-6 lg:gap-8">
            <RowMetric label="Portfolio" className="hidden min-w-[120px] md:block">
              {portfolioAssets.length > 0 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    // The row itself is clickable; this opens the preview only.
                    event.stopPropagation();
                    setPortfolioOpen(true);
                  }}
                  className="rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Preview ${creator.displayName}'s portfolio (${portfolioAssets.length} video${portfolioAssets.length === 1 ? "" : "s"})`}
                >
                  <PortfolioThumbnails videos={creator.portfolioVideos} />
                </button>
              ) : (
                <PortfolioThumbnails videos={creator.portfolioVideos} />
              )}
            </RowMetric>

            <RowMetric label="Followers">
              <InstagramFollowers creator={creator} />
            </RowMetric>

            <RowMetric label="Instagram" className="min-w-32">
              <InstagramProfileLink creator={creator} />
            </RowMetric>

            <RowMetric label="Starting Price">
              <div className="flex items-center gap-1">
                <Banknote className="hidden size-3 text-muted-foreground lg:block" />
                <span>{formatInrPrice(creator.startingPrice)}</span>
              </div>
            </RowMetric>

            <RowMetric label={dateColumn.label}>
              <span>{dateColumn.value}</span>
            </RowMetric>

            {isAwaitingReviewSegment ? (
              <RowMetric label="Review sent by" className="min-w-[130px]">
                <span className="truncate" title={creator.reviewSentByName ?? undefined}>
                  {creator.reviewSentByName ?? "—"}
                </span>
              </RowMetric>
            ) : null}

            {isListedSegment ? (
              <RowMetric label="Approved by" className="min-w-[130px]">
                <span className="truncate" title={creator.approvedByName ?? undefined}>
                  {creator.approvedByName ?? "—"}
                </span>
              </RowMetric>
            ) : null}

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
              {(canModeratePending || isRejected || isSelfCompleted) &&
              onReview ? (
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
              ) : null}

              {isSelfCompletedSegment ? (
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
                    className="rounded-full"
                    onClick={handleSendForReviewClick}
                    disabled={isWorking}
                  >
                    <SendHorizontal className="size-3.5" />
                    {isSendingForReview ? "Sending…" : "Send for review"}
                  </Button>
                </>
              ) : null}

              {canModeratePending && !isIncompleteSegment ? (
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
                    {isApproving
                      ? profileFirst
                        ? "Listing…"
                        : "Approving…"
                      : profileFirst
                        ? "List"
                        : "Approve"}
                  </Button>
                </>
              ) : null}

              {isRejected &&
              creator.completeProfile &&
              !isIncompleteSegment ? (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handleApprove}
                  disabled={isWorking}
                >
                  {isApproving ? "Approving…" : "Approve"}
                </Button>
              ) : null}

              {isApproved && !isIncompleteSegment ? (
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

      <Dialog open={portfolioOpen} onOpenChange={setPortfolioOpen}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-4 overflow-hidden p-5 sm:max-w-100"
          overlayClassName="bg-black/50 backdrop-blur-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {creator.displayName}&rsquo;s portfolio
            </DialogTitle>
          </DialogHeader>

          {/* Mounted only while open, so the videos are not fetched for every
              row in the list and stop playing the moment the modal closes. */}
          {portfolioOpen ? (
            <ThumbnailsCarousel
              assets={portfolioAssets}
              orientation="portrait"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <RejectDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
        isWorking={isRejecting}
      />
    </>
  );
}
