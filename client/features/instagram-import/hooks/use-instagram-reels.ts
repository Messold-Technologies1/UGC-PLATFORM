"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchInstagramReels,
  fetchInstagramReelsStatus,
  importInstagramReels,
  instagramReelsQueryKeyFor,
  instagramReelsStatusQueryKeyFor,
  loadMoreInstagramReels,
  refreshInstagramReels,
} from "../api/instagram-media";
import type { InstagramMediaPageApi } from "../api/types";
import { portfolioMyVideosQueryKey } from "@/features/creator-portfolio/api/list-my-portfolio-videos";

const PAGE_SIZE = 24;
/** Matches the server's cache TTL, so the client does not refetch sooner. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/** How often to poll while the server reports a sync in flight. */
const SYNC_POLL_MS = 2500;

/**
 * The reel gallery's data source.
 *
 * Reads are cheap and cached for as long as the server caches them, so opening
 * the sheet repeatedly costs nothing — the server only syncs a cold cache, never
 * one that is merely stale. When it does report a sync in flight, a light poll
 * runs until it settles and then the list is refetched once.
 *
 * There are two separate "more" mechanisms behind one button, because they cost
 * very different things:
 *
 *  - `hasNextPage` pages within our cache. Free, so it also fires on scroll.
 *  - `canFetchMoreFromInstagram` asks Instagram for the next batch of older
 *    reels. One Graph call, so it is never automatic — the reader clicks.
 */
export function useInstagramReels({
  enabled,
  adminCreatorId,
}: {
  enabled: boolean;
  /** Set to browse a named creator's reels as an admin. */
  adminCreatorId?: string;
}) {
  const queryClient = useQueryClient();
  const reelsKey = instagramReelsQueryKeyFor(adminCreatorId);
  const statusKey = instagramReelsStatusQueryKeyFor(adminCreatorId);

  const query = useInfiniteQuery({
    queryKey: reelsKey,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchInstagramReels({
        cursor: pageParam,
        limit: PAGE_SIZE,
        adminCreatorId,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: InstagramMediaPageApi) => last.nextCursor,
    enabled,
    staleTime: SEVEN_DAYS_MS,
    gcTime: SEVEN_DAYS_MS,
  });

  const first = query.data?.pages[0];
  const pages = query.data?.pages;
  const last = pages?.[pages.length - 1];
  const serverSyncing = first?.status === "syncing";

  // Set the moment a batch is requested, so the poll starts before the first
  // page has had a chance to report `syncing` back to us.
  const [awaitingBatch, setAwaitingBatch] = useState(false);
  const polling = serverSyncing || awaitingBatch;

  // Only poll while something is actually running — a settled gallery makes no
  // background requests at all.
  const statusQuery = useQuery({
    queryKey: statusKey,
    queryFn: () => fetchInstagramReelsStatus(adminCreatorId),
    enabled: enabled && polling,
    refetchInterval: polling ? SYNC_POLL_MS : false,
  });

  const syncSettled =
    statusQuery.data?.status === "ready" ||
    statusQuery.data?.status === "error";

  useEffect(() => {
    if (polling && syncSettled) {
      setAwaitingBatch(false);
      // Refetching every page is what makes new reels reachable: the page that
      // was the cache tail now returns a cursor instead of null.
      void queryClient.invalidateQueries({ queryKey: reelsKey });
    }
    // reelsKey is derived from adminCreatorId, so it is stable per creator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, syncSettled, queryClient, adminCreatorId]);

  const refresh = useMutation({
    mutationFn: () => refreshInstagramReels(adminCreatorId),
    onSuccess: () => {
      toast.success(
        adminCreatorId
          ? "Refreshing this creator's reels from Instagram…"
          : "Refreshing your reels from Instagram…",
      );
      void queryClient.invalidateQueries({ queryKey: statusKey });
    },
    onError: (error: unknown) => {
      // The server's guard message says how long is left, so surface it as-is.
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Could not refresh right now";
      toast.error(message);
    },
  });

  const fetchMoreFromInstagram = useMutation({
    mutationFn: () => loadMoreInstagramReels(adminCreatorId),
    onMutate: () => setAwaitingBatch(true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statusKey });
    },
    onError: (error: unknown) => {
      setAwaitingBatch(false);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Could not load more reels right now";
      toast.error(message);
    },
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  // Free: another page of what we already hold.
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  // Costly: the reader is at the end of the cache and Instagram has more. Only
  // offered once cache paging is exhausted, so a click always does something.
  const canFetchMoreFromInstagram =
    Boolean(last?.hasMoreOnInstagram) && !query.hasNextPage && !polling;

  return {
    items,
    status: first?.status ?? "syncing",
    username: first?.username ?? null,
    lastSyncedAt: first?.lastSyncedAt ?? null,
    reelCount: first?.reelCount ?? 0,
    error: first?.error ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore,
    canFetchMoreFromInstagram,
    fetchMoreFromInstagram,
    isFetchingBatch: awaitingBatch || fetchMoreFromInstagram.isPending,
    refresh,
    retry: () => void query.refetch(),
  };
}

/** Import the selected reels, then refresh the portfolio grid. */
export function useImportInstagramReels(options?: { adminCreatorId?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (igMediaIds: string[]) =>
      importInstagramReels(igMediaIds, options),
    onSuccess: async (result) => {
      const n = result.imported.length;
      if (n > 0) {
        // The rows are saved already; only the files are still copying. Say so,
        // so nobody sits and waits on the picker before carrying on.
        toast.success(
          n === 1
            ? "1 reel added to the portfolio"
            : `${n} reels added to the portfolio`,
          {
            description:
              "Save your changes and carry on — the videos will start playing on their own once we finish copying them over.",
          },
        );
      }
      // Say why anything was dropped rather than silently importing fewer.
      const alreadyIn = result.skipped.filter(
        (s) => s.reason === "already_imported",
      ).length;
      if (alreadyIn > 0) {
        const where = options?.adminCreatorId
          ? "the portfolio"
          : "your portfolio";
        toast.info(
          alreadyIn === 1
            ? `1 reel was already in ${where}`
            : `${alreadyIn} reels were already in ${where}`,
        );
      }
      const failed = result.skipped.length - alreadyIn;
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "1 reel could not be added"
            : `${failed} reels could not be added`,
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: portfolioMyVideosQueryKey }),
        queryClient.invalidateQueries({
          queryKey: instagramReelsQueryKeyFor(options?.adminCreatorId),
        }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Could not add those reels",
      );
    },
  });
}
