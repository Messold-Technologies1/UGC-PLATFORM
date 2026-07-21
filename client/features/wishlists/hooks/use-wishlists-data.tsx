"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Wishlist } from "../api/types";
import { useWishlistsQuery } from "./use-wishlists-query";

interface WishlistsData {
  wishlists: Wishlist[];
  isLoading: boolean;
}

const WishlistsContext = createContext<WishlistsData | null>(null);

/**
 * Fetches the viewer's wishlists once and shares them with every descendant
 * `SaveToWishlistButton`. Without this, each card's button subscribes to the
 * wishlists query independently — one React Query observer per card. Gate it
 * with `enabled` (e.g. only for brand/agency viewers) so non-brand viewers
 * never issue the request.
 */
export function WishlistsProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  const { data, isLoading } = useWishlistsQuery({ enabled });
  const value = useMemo<WishlistsData>(
    () => ({ wishlists: data?.items ?? [], isLoading: enabled && isLoading }),
    [data, isLoading, enabled],
  );
  return (
    <WishlistsContext.Provider value={value}>
      {children}
    </WishlistsContext.Provider>
  );
}

/**
 * Reads wishlists from the nearest `WishlistsProvider` when present (shared,
 * single observer), otherwise falls back to its own query so the button still
 * works outside a provider (e.g. the profile drawer or wishlist pages).
 */
export function useWishlistsData(): WishlistsData {
  const ctx = useContext(WishlistsContext);
  const fallback = useWishlistsQuery({ enabled: ctx === null });
  if (ctx) return ctx;
  return {
    wishlists: fallback.data?.items ?? [],
    isLoading: fallback.isLoading,
  };
}
