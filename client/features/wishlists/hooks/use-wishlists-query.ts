import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchWishlists,
  createWishlist,
  fetchWishlistDetail,
  updateWishlist,
  deleteWishlist,
  toggleCreatorInWishlist,
  fetchCreatorWishlistStatus,
  enableWishlistShare,
  disableWishlistShare,
  fetchPublicWishlist,
} from "../api/wishlist-api";

export const wishlistsQueryKey = ["wishlists"] as const;
export const wishlistDetailQueryKey = (id: string) =>
  ["wishlists", id] as const;
export const creatorWishlistStatusQueryKey = (creatorId: string) =>
  ["wishlists", "creator-status", creatorId] as const;

export function useWishlistsQuery() {
  return useQuery({
    queryKey: wishlistsQueryKey,
    queryFn: fetchWishlists,
    staleTime: 60_000,
  });
}

export function useWishlistDetailQuery(wishlistId: string | null) {
  return useQuery({
    queryKey: wishlistDetailQueryKey(wishlistId ?? ""),
    queryFn: () => fetchWishlistDetail(wishlistId!),
    enabled: !!wishlistId,
    staleTime: 30_000,
  });
}

export function useCreatorWishlistStatusQuery(
  creatorId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: creatorWishlistStatusQueryKey(creatorId ?? ""),
    queryFn: () => fetchCreatorWishlistStatus(creatorId!),
    enabled: (options?.enabled ?? true) && !!creatorId,
    staleTime: 30_000,
  });
}

export function useCreateWishlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWishlist,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}

export function useUpdateWishlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateWishlist(id, { name }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: wishlistsQueryKey });
      void qc.invalidateQueries({ queryKey: wishlistDetailQueryKey(vars.id) });
    },
  });
}

export function useDeleteWishlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWishlist(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}

export function useToggleCreatorWishlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      wishlistId,
      creatorId,
    }: {
      wishlistId: string;
      creatorId: string;
    }) => toggleCreatorInWishlist(wishlistId, creatorId),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: creatorWishlistStatusQueryKey(vars.creatorId),
      });
      void qc.invalidateQueries({
        queryKey: wishlistDetailQueryKey(vars.wishlistId),
      });
      void qc.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}

export function useEnableWishlistShareMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wishlistId: string) => enableWishlistShare(wishlistId),
    onSuccess: (_, wishlistId) => {
      void qc.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
      void qc.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}

export function useDisableWishlistShareMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wishlistId: string) => disableWishlistShare(wishlistId),
    onSuccess: (_, wishlistId) => {
      void qc.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
      void qc.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}

export const publicWishlistQueryKey = (token: string) =>
  ["wishlists", "public", token] as const;

export function usePublicWishlistQuery(shareToken: string) {
  return useQuery({
    queryKey: publicWishlistQueryKey(shareToken),
    queryFn: () => fetchPublicWishlist(shareToken),
    staleTime: 5 * 60_000,
  });
}
