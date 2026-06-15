"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Share2, Wand2, X, Plus, Check, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreatorCardSkeleton } from "@/features/creators/components/creator-card";
import { ReelCard } from "@/features/creators/components/browse-creators/reel-card";
import { ProfileDrawer } from "@/features/creators/components/browse-creators/profile-drawer";
import { mapProfileToListingCreator } from "@/features/creators/api/map-profile-to-creator";
import type { Creator } from "@/features/creators/types";
import { WishlistSidebar } from "@/features/wishlists/components/wishlist-sidebar";
import { useWishlistsQuery } from "@/features/wishlists/hooks/use-wishlists-query";
import { useWishlistDetailQuery } from "@/features/wishlists/hooks/use-wishlist-detail-query";
import { useEnableWishlistShareMutation } from "@/features/wishlists/hooks/use-enable-wishlist-share-mutation";
import { useDisableWishlistShareMutation } from "@/features/wishlists/hooks/use-disable-wishlist-share-mutation";
import { useUpdateWishlistMutation } from "@/features/wishlists/hooks/use-update-wishlist-mutation";
import "@/features/creators/components/browse-creators/browse-creators.css";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function WishlistDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: allData, isLoading: listsLoading } = useWishlistsQuery();
  const wishlists = allData?.items ?? [];

  const { data: wishlist, isLoading: detailLoading } = useWishlistDetailQuery(id);
  const enableShareMutation = useEnableWishlistShareMutation(id);
  const disableShareMutation = useDisableWishlistShareMutation(id);
  const updateMutation = useUpdateWishlistMutation(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreatorId, setDrawerCreatorId] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  const openDrawer = useCallback((creator: Creator) => {
    setSelectedCreator(creator);
    setDrawerCreatorId(creator.id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const listingCreators = useMemo(
    () => wishlist?.creators.map(mapProfileToListingCreator) ?? [],
    [wishlist?.creators],
  );

  function startEdit() {
    setEditName(wishlist?.name ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === wishlist?.name) {
      setEditing(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({ name: trimmed });
      toast.success("Wishlist renamed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to rename");
    } finally {
      setEditing(false);
    }
  }

  async function handleShare() {
    try {
      if (wishlist?.shareEnabled && wishlist.shareToken) {
        // Already shared — just copy the link
        const url = `${window.location.origin}/wishlists/share/${wishlist.shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } else {
        // Enable sharing
        const res = await enableShareMutation.mutateAsync();
        if (res.shareEnabled && res.shareToken) {
          const url = `${window.location.origin}/wishlists/share/${res.shareToken}`;
          await navigator.clipboard.writeText(url);
          toast.success("Sharing enabled — link copied to clipboard");
        }
      }
    } catch {
      toast.error("Failed to enable sharing");
    }
  }

  async function handleMakePrivate() {
    try {
      await disableShareMutation.mutateAsync();
      toast.success("Wishlist is now private");
    } catch {
      toast.error("Failed to disable sharing");
    }
  }

  const totalPrice = wishlist?.creators
    .map((c) => {
      if (!c.packages || c.packages.length === 0) return 0;
      return Math.min(...c.packages.map((p) => Number(p.priceAmount)));
    })
    .reduce((a, b) => a + b, 0);

  return (
    <div className="flex bg-gray-50">
      <aside className="sticky top-24 z-10 w-[300px] shrink-0 self-start p-4 max-h-[calc(100dvh-7rem)] overflow-y-auto">
        <WishlistSidebar wishlists={wishlists} activeId={id} isLoading={listsLoading} />
      </aside>

      <div className="flex-1 px-6 py-6 min-w-0">
        {detailLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-56 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-muted animate-pulse" />
            <div className="reelgrid browse-redesign-scope mt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CreatorCardSkeleton key={i} appearance="browse" />
              ))}
            </div>
          </div>
        ) : !wishlist ? (
          <p className="text-muted-foreground">Wishlist not found.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-1">
              {editing ? (
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-rose-400 bg-transparent outline-none min-w-0 w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    onBlur={saveEdit}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                    className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-rose-500 text-white"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                  </button>
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold tracking-tight cursor-pointer hover:opacity-75 transition-opacity min-w-0 truncate"
                  onClick={startEdit}
                  title="Click to rename"
                >
                  {wishlist.name}
                </h1>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  className="gap-2 rounded-full bg-gray-900 hover:bg-gray-800 text-white h-9 text-sm"
                  asChild
                >
                  <Link href="/brand/creators">
                    <Plus size={15} />
                    Add creators
                  </Link>
                </Button>

                {wishlist.shareEnabled ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={handleShare}
                      disabled={enableShareMutation.isPending}
                      title="Copy share link"
                    >
                      {enableShareMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Share2 size={14} />
                      )}
                      Copy link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={handleMakePrivate}
                      disabled={disableShareMutation.isPending}
                      title="Make private"
                    >
                      {disableShareMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Lock size={14} />
                      )}
                      Make private
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl gap-1.5"
                    onClick={handleShare}
                    disabled={enableShareMutation.isPending}
                    title="Share this wishlist"
                  >
                    {enableShareMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Share2 size={14} />
                    )}
                    Share
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl"
                  disabled
                  title="Smart suggestions (coming soon)"
                >
                  <Wand2 size={15} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl"
                  asChild
                >
                  <Link href="/brand/wishlists">
                    <X size={15} />
                  </Link>
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5 flex items-center gap-1.5 flex-wrap">
              <span>{wishlist.creatorCount} creator{wishlist.creatorCount !== 1 ? "s" : ""}</span>
              {totalPrice !== undefined && totalPrice > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>from ₹{totalPrice.toLocaleString("en-IN")} total</span>
                </>
              )}
              <span className="opacity-40">·</span>
              <span>created {timeAgo(wishlist.createdAt)}</span>
            </p>

            <hr className="border-border/40 mb-6" />

            {listingCreators.length === 0 ? (
              <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
                <p className="font-semibold">No creators saved yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse creators and save them to this wishlist.
                </p>
                <Button className="mt-4 rounded-full gap-2" size="sm" asChild>
                  <Link href="/brand/creators">
                    <Plus size={14} /> Browse Creators
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="reelgrid browse-redesign-scope !mt-0">
                {listingCreators.map((creator, index) => (
                  <ReelCard
                    key={creator.id}
                    creator={creator}
                    index={index}
                    onOpen={openDrawer}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ProfileDrawer
        creatorId={drawerCreatorId}
        open={drawerOpen}
        onClose={closeDrawer}
        creator={selectedCreator}
      />
    </div>
  );
}
