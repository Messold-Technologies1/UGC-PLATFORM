"use client";

import { useState } from "react";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WishlistCard } from "@/features/wishlists/components/wishlist-card";
import { CreateWishlistDialog } from "@/features/wishlists/components/create-wishlist-dialog";
import { useWishlistsQuery } from "@/features/wishlists/hooks/use-wishlists-query";

const SHARE_BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "";

export default function WishlistsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useWishlistsQuery();
  const wishlists = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Wishlists</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Save and organise creators you love
          </p>
        </div>
        <Button
          className="gap-2 rounded-full"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={15} />
          New Wishlist
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : wishlists.length === 0 ? (
        <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Heart className="size-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">No wishlists yet</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Create your first wishlist to start saving creators for your campaigns.
          </p>
          <Button className="mt-5 rounded-full gap-2" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Create Wishlist
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((w) => (
            <WishlistCard key={w.id} wishlist={w} shareBaseUrl={SHARE_BASE_URL} />
          ))}
        </div>
      )}

      <CreateWishlistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
