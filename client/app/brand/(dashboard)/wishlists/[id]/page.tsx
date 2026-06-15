"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Share2, Wand2, X, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WishlistSidebar } from "@/features/wishlists/components/wishlist-sidebar";
import { WishlistCreatorCard } from "@/features/wishlists/components/wishlist-creator-card";
import { useWishlistsQuery } from "@/features/wishlists/hooks/use-wishlists-query";
import { useWishlistDetailQuery } from "@/features/wishlists/hooks/use-wishlist-detail-query";
import { useToggleWishlistShareMutation } from "@/features/wishlists/hooks/use-toggle-wishlist-share-mutation";
import { useUpdateWishlistMutation } from "@/features/wishlists/hooks/use-update-wishlist-mutation";

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
  const shareMutation = useToggleWishlistShareMutation(id);
  const updateMutation = useUpdateWishlistMutation(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

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
      const res = await shareMutation.mutateAsync();
      if (res.shareEnabled && res.shareToken) {
        const url = `${window.location.origin}/wishlists/share/${res.shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } else {
        toast.success("Sharing disabled");
      }
    } catch {
      toast.error("Failed to update share settings");
    }
  }

  const minPrice = wishlist?.creators
    .flatMap((c) => c.packages ?? [])
    .reduce((min, p) => {
      const v = Number(p.priceAmount);
      return v < min ? v : min;
    }, Infinity);

  const totalPrice = wishlist?.creators
    .map((c) => {
      if (!c.packages || c.packages.length === 0) return 0;
      return Math.min(...c.packages.map((p) => Number(p.priceAmount)));
    })
    .reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-50">
      {/* Left sidebar */}
      <div className="w-[300px] shrink-0 p-4 overflow-y-auto">
        <WishlistSidebar wishlists={wishlists} activeId={id} isLoading={listsLoading} />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-w-0">
        {detailLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-56 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="rounded-2xl" style={{ aspectRatio: "10/14" }} />
              ))}
            </div>
          </div>
        ) : !wishlist ? (
          <p className="text-muted-foreground">Wishlist not found.</p>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-1">
              {/* Editable name */}
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

              {/* Action buttons */}
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
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl"
                  onClick={handleShare}
                  disabled={shareMutation.isPending}
                  title={wishlist.shareEnabled ? "Copy share link" : "Share"}
                >
                  {shareMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Share2 size={15} />
                  )}
                </Button>
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

            {/* Metadata */}
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

            {/* Creator grid */}
            {wishlist.creators.length === 0 ? (
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wishlist.creators.map((c, i) => (
                  <WishlistCreatorCard
                    key={c.id}
                    creator={c}
                    wishlistId={id}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
