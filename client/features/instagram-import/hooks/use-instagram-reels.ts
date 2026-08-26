"use client";

import { useCallback, useEffect } from "react";
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
  instagramReelsQueryKey,
  instagramReelsStatusQueryKey,
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
 * the sheet repeatedly costs nothing. When the server says it is syncing, a
 * light poll runs until it settles and then the list is refetched once.
 */
export function useInstagramReels({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: instagramReelsQueryKey,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchInstagramReels({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: InstagramMediaPageApi) => last.nextCursor,
    enabled,
    staleTime: SEVEN_DAYS_MS,
    gcTime: SEVEN_DAYS_MS,
  });

  const first = query.data?.pages[0];
  const serverSyncing = first?.status === "syncing";

  // Only poll while something is actually running — a settled gallery makes no
  // background requests at all.
  const statusQuery = useQuery({
    queryKey: instagramReelsStatusQueryKey,
    queryFn: fetchInstagramReelsStatus,
    enabled: enabled && serverSyncing,
    refetchInterval: serverSyncing ? SYNC_POLL_MS : false,
  });

  const syncSettled =
    statusQuery.data?.status === "ready" || statusQuery.data?.status === "error";

  useEffect(() => {
    if (serverSyncing && syncSettled) {
      void queryClient.invalidateQueries({ queryKey: instagramReelsQueryKey });
    }
  }, [serverSyncing, syncSettled, queryClient]);

  const refresh = useMutation({
    mutationFn: refreshInstagramReels,
    onSuccess: () => {
      toast.success("Refreshing your reels from Instagram…");
      void queryClient.invalidateQueries({
        queryKey: instagramReelsStatusQueryKey,
      });
    },
    onError: (error: unknown) => {
      // The server's guard message says how long is left, so surface it as-is.
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not refresh right now";
      toast.error(message);
    },
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    items,
    status: first?.status ?? "syncing",
    username: first?.username ?? null,
    lastFullSyncAt: first?.lastFullSyncAt ?? null,
    reelCount: first?.reelCount ?? 0,
    error: first?.error ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore,
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
        toast.success(
          n === 1
            ? "1 reel added — it will be ready in a moment"
            : `${n} reels added — they will be ready in a moment`,
        );
      }
      // Say why anything was dropped rather than silently importing fewer.
      const alreadyIn = result.skipped.filter(
        (s) => s.reason === "already_imported",
      ).length;
      if (alreadyIn > 0) {
        toast.info(
          alreadyIn === 1
            ? "1 reel was already in your portfolio"
            : `${alreadyIn} reels were already in your portfolio`,
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
        queryClient.invalidateQueries({ queryKey: instagramReelsQueryKey }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Could not add those reels",
      );
    },
  });
}
