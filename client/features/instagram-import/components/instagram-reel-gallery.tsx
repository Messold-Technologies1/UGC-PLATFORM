"use client";

import { useCallback, useMemo, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Instagram,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import {
  useImportInstagramReels,
  useInstagramReels,
} from "../hooks/use-instagram-reels";
import type { InstagramReelApi } from "../api/types";

/** Server-side cap on one import; selecting past it is blocked in the UI too. */
const MAX_SELECTION = 20;

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function formatCount(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Full-height reel picker.
 *
 * Everything on screen is served from our cache, so scrolling never waits on
 * Instagram. Only the first batch is fetched automatically; reaching the end of
 * the cache offers a "Load more from Instagram" button, which is the sole thing
 * here that spends a Graph call. The grid is virtualized because a prolific
 * creator can have hundreds of reels and each tile holds an image.
 */
export function InstagramReelGallery({
  open,
  onOpenChange,
  adminCreatorId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminCreatorId?: string;
  onImported?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const reels = useInstagramReels({ enabled: open, adminCreatorId });
  const importMutation = useImportInstagramReels({ adminCreatorId });

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const atCap = selected.length >= MAX_SELECTION;

  const toggle = useCallback((reel: InstagramReelApi) => {
    if (reel.alreadyImported || !reel.importable) return;
    setSelected((prev) => {
      if (prev.includes(reel.igMediaId)) {
        return prev.filter((id) => id !== reel.igMediaId);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, reel.igMediaId];
    });
  }, []);

  const close = useCallback(
    (next: boolean) => {
      if (!next) setSelected([]);
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const submit = useCallback(() => {
    if (selected.length === 0) return;
    importMutation.mutate(selected, {
      onSuccess: () => {
        setSelected([]);
        onImported?.();
        close(false);
      },
    });
  }, [selected, importMutation, onImported, close]);

  const syncing = reels.status === "syncing";
  const showSkeleton = reels.isLoading || (syncing && reels.items.length === 0);

  // Rendered at the bottom of the virtualized list, so it shows up exactly when
  // the reader has run out of cached reels rather than sitting there all along.
  const fetchMoreBatch = reels.fetchMoreFromInstagram.mutate;
  const Footer = useCallback(
    () => (
      <GridFooter
        pagingCache={reels.isFetchingNextPage}
        canFetchMore={reels.canFetchMoreFromInstagram}
        isFetchingBatch={reels.isFetchingBatch}
        queued={reels.syncPhase === "queued"}
        onFetchMore={fetchMoreBatch}
      />
    ),
    [
      reels.isFetchingNextPage,
      reels.canFetchMoreFromInstagram,
      reels.isFetchingBatch,
      reels.syncPhase,
      fetchMoreBatch,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Instagram className="size-4 shrink-0" aria-hidden />
                {reels.username
                  ? `@${reels.username}`
                  : adminCreatorId
                    ? "Creator's reels"
                    : "Your reels"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {reels.reelCount > 0
                  ? `${reels.reelCount} reel${reels.reelCount === 1 ? "" : "s"} · updated ${formatRelative(reels.lastSyncedAt)}`
                  : adminCreatorId
                    ? "Only reels posted from this account appear here."
                    : "Only reels you posted from this account appear here."}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1.5 text-xs"
              onClick={() => reels.refresh.mutate()}
              disabled={reels.refresh.isPending || syncing}
            >
              <RefreshCw
                className={`size-3.5 ${reels.refresh.isPending || syncing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
          {reels.status === "not_connected" ? (
            <EmptyState
              title="No Instagram account connected"
              body={
                adminCreatorId
                  ? "This creator has not connected Instagram, so there are no reels to browse. Only they can link the account."
                  : "Connect Instagram from your profile settings to browse your reels here."
              }
            />
          ) : reels.status === "reconnect_required" ? (
            <EmptyState
              icon="warn"
              title="Instagram needs reconnecting"
              body={
                adminCreatorId
                  ? "This creator's Instagram access expired or was revoked. They will need to reconnect before their reels can be browsed."
                  : "Your Instagram access expired or was revoked. Reconnect from profile settings to browse your reels."
              }
            />
          ) : reels.isError || reels.status === "error" ? (
            <EmptyState
              icon="warn"
              title="Could not load your reels"
              body={reels.error ?? "Something went wrong talking to Instagram."}
              action={
                <Button variant="outline" size="sm" onClick={reels.retry}>
                  Try again
                </Button>
              }
            />
          ) : showSkeleton ? (
            <SkeletonGrid queued={reels.syncPhase === "queued"} />
          ) : reels.items.length === 0 ? (
            <EmptyState
              title="We couldn't find any reels"
              body={`Only reels posted from ${reels.username ? `@${reels.username}` : "this account"} show up here — collabs and cross-posts may be missing.`}
              action={
                <Button variant="outline" size="sm" onClick={reels.retry}>
                  Check again
                </Button>
              }
            />
          ) : (
            <>
              {syncing ? (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  {reels.syncPhase === "queued"
                    ? "Waiting for Instagram — this can take a few minutes when a lot of creators are importing at once."
                    : "Checking Instagram for new reels…"}
                </p>
              ) : null}

              <UnavailableReelsNotice count={reels.unavailableCount} />
              <VirtuosoGrid
                style={{ height: "100%" }}
                totalCount={reels.items.length}
                // Paging the cache is free, so it happens on scroll. Fetching a
                // new batch from Instagram is not, and is never triggered here.
                endReached={reels.loadMore}
                overscan={200}
                components={{ Footer }}
                listClassName="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
                itemContent={(index) => {
                  const reel = reels.items[index];
                  if (!reel) return null;
                  const order = selected.indexOf(reel.igMediaId);
                  return (
                    <ReelTile
                      reel={reel}
                      selectionOrder={order >= 0 ? order + 1 : null}
                      disabled={
                        reel.alreadyImported ||
                        !reel.importable ||
                        (atCap && !selectedSet.has(reel.igMediaId))
                      }
                      onToggle={() => toggle(reel)}
                    />
                  );
                }}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {selected.length > 0
              ? `${selected.length} selected${atCap ? ` (max ${MAX_SELECTION})` : ""}`
              : "Tap reels to select them"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={selected.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add to portfolio"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Explains the reels the picker will not let you select.
 *
 * Instagram withholds the video file for media containing copyrighted material
 * — most often licensed audio on a reel — while still handing over the
 * thumbnail. So these look completely normal here, and before this notice
 * existed selecting them produced a bare "3 reels could not be added". The only
 * way to get one into a portfolio is to save it from Instagram and upload it,
 * which is what this says.
 */
function UnavailableReelsNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5">
      <Lock className="mt-px size-3.5 shrink-0 text-amber-600" aria-hidden />
      <p className="text-[11.5px] leading-relaxed">
        <span className="font-semibold">
          {count === 1
            ? "1 reel can't be added from here"
            : `${count} reels can't be added from here`}
        </span>{" "}
        <span className="text-muted-foreground">
          Instagram doesn&apos;t let us download reels that use licensed audio,
          so they&apos;re greyed out below. To use one, save it from Instagram
          to your device and add it with{" "}
          <span className="font-medium">Upload from your device</span>.
        </span>
      </p>
    </div>
  );
}

/**
 * The bottom of the list. Only one of the three states can apply: still paging
 * the cache, or out of cache with more on Instagram, or genuinely at the end.
 */
function GridFooter({
  pagingCache,
  canFetchMore,
  isFetchingBatch,
  queued,
  onFetchMore,
}: {
  pagingCache: boolean;
  canFetchMore: boolean;
  isFetchingBatch: boolean;
  queued?: boolean;
  onFetchMore: () => void;
}) {
  if (pagingCache) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        Loading more…
      </p>
    );
  }
  if (isFetchingBatch) {
    return (
      <p className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        {queued
          ? "Queued — fetching older reels shortly…"
          : "Fetching older reels from Instagram…"}
      </p>
    );
  }
  if (!canFetchMore) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 py-4">
      <Button variant="outline" size="sm" onClick={() => onFetchMore()}>
        Load more from Instagram
      </Button>
      <p className="text-[11px] text-muted-foreground">
        We keep the reels you have already seen — this fetches the next batch.
      </p>
    </div>
  );
}

function ReelTile({
  reel,
  selectionOrder,
  disabled,
  onToggle,
}: {
  reel: InstagramReelApi;
  selectionOrder: number | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  const selected = selectionOrder != null;
  const views = formatCount(reel.viewCount) ?? formatCount(reel.likeCount);

  return (
    <div className="group relative aspect-[9/16] overflow-hidden rounded-lg border border-border bg-muted">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled && !selected}
        aria-pressed={selected}
        aria-label={
          reel.alreadyImported
            ? "Already in your portfolio"
            : !reel.importable
              ? "Instagram does not allow downloading this reel"
              : selected
                ? "Deselect this reel"
                : "Select this reel"
        }
        title={
          !reel.importable && !reel.alreadyImported
            ? "Instagram won't let us download this reel — usually licensed audio. Save it from Instagram and upload it from your device."
            : undefined
        }
        className="absolute inset-0 size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed"
      >
        {reel.thumbnailUrl ? (
          // Signed CDN URL that expires, so next/image optimisation would cache
          // a dead upstream. Plain img keeps it a pure passthrough.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reel.thumbnailUrl}
            alt=""
            loading="lazy"
            className={`size-full object-cover transition-opacity ${
              reel.alreadyImported || !reel.importable
                ? "opacity-40"
                : "group-hover:opacity-90"
            }`}
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-fuchsia-500/20 to-orange-400/20" />
        )}

        {selected ? (
          <span className="absolute inset-0 ring-2 ring-inset ring-primary" />
        ) : null}

        <span className="absolute left-1.5 top-1.5">
          {reel.alreadyImported ? (
            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Added
            </span>
          ) : !reel.importable ? (
            <span className="flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Lock className="size-2.5" aria-hidden />
              Unavailable
            </span>
          ) : selected ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {selectionOrder}
            </span>
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full border border-white/70 bg-black/30">
              <Check className="size-3 text-white/0" aria-hidden />
            </span>
          )}
        </span>

        {views ? (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {views}
          </span>
        ) : null}
        {reel.durationSeconds ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {reel.durationSeconds}s
          </span>
        ) : null}
      </button>

      {reel.permalink ? (
        <a
          href={reel.permalink}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          title="Open on Instagram"
          className="absolute right-1.5 top-1.5 hidden rounded bg-black/60 p-1 text-white group-hover:block"
        >
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function SkeletonGrid({ queued }: { queued?: boolean }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        {/* A queued sync is waiting behind the rate limiter, which under load is
            minutes. Saying "fetching" for that long reads as broken. */}
        {queued
          ? "You're in the queue — we'll start fetching your reels in a moment."
          : "Fetching your reels from Instagram…"}
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  icon = "info",
  title,
  body,
  action,
}: {
  icon?: "info" | "warn";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      {icon === "warn" ? (
        <AlertTriangle className="size-5 text-muted-foreground" aria-hidden />
      ) : (
        <Instagram className="size-5 text-muted-foreground" aria-hidden />
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
