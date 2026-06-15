"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Users,
  Lock,
  Check,
  Pencil,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlistDetailQuery } from "@/features/wishlists/hooks/use-wishlist-detail-query";
import { useToggleWishlistShareMutation } from "@/features/wishlists/hooks/use-toggle-wishlist-share-mutation";
import { useUpdateWishlistMutation } from "@/features/wishlists/hooks/use-update-wishlist-mutation";
import { useRemoveWishlistCreatorMutation } from "@/features/wishlists/hooks/use-remove-wishlist-creator-mutation";
import type { WishlistCreator } from "@/features/wishlists/api/types";

function CreatorCard({
  creator,
  wishlistId,
}: {
  creator: WishlistCreator;
  wishlistId: string;
}) {
  const removeMutation = useRemoveWishlistCreatorMutation();

  async function handleRemove() {
    try {
      await removeMutation.mutateAsync({ wishlistId, creatorId: creator.id });
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Failed to remove creator");
    }
  }

  const minPrice = creator.packages?.[0]?.priceAmount
    ? Number(creator.packages[0].priceAmount)
    : null;

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        {creator.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.profileImageUrl}
            alt={creator.name}
            className="size-11 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="size-11 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-semibold text-sm">
            {creator.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{creator.name}</p>
          {creator.city && (
            <p className="text-xs text-muted-foreground truncate">{creator.city}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {creator.avgRating
            ? `★ ${Number(creator.avgRating).toFixed(1)} (${creator.reviewCount ?? 0})`
            : "No reviews yet"}
        </span>
        {minPrice !== null && (
          <span className="font-medium text-foreground">
            from ₹{minPrice.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={removeMutation.isPending}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        aria-label="Remove from wishlist"
      >
        {removeMutation.isPending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Trash2 size={11} />
        )}
      </button>
    </div>
  );
}

export default function WishlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: wishlist, isLoading } = useWishlistDetailQuery(id);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/brand/wishlists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Wishlists
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-48 rounded-xl" />
          <Skeleton className="h-5 w-32 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !wishlist ? (
        <p className="text-muted-foreground">Wishlist not found.</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-start gap-3 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xl font-bold h-10 rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditing(false);
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1 rounded-xl"
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">
                    {wishlist.name}
                  </h1>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Rename wishlist"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {wishlist.shareEnabled ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                  Shared
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-1">
                  <Lock size={10} /> Private
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full"
                onClick={handleShare}
                disabled={shareMutation.isPending}
              >
                {shareMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Share2 size={13} />
                )}
                {wishlist.shareEnabled ? "Copy Link" : "Share"}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
            <Users size={13} />
            {wishlist.creatorCount} creator{wishlist.creatorCount !== 1 ? "s" : ""}
          </p>

          {wishlist.creators.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <Users className="size-8 text-muted-foreground mb-3" />
              <p className="font-semibold">No creators saved yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse creators and save them to this wishlist.
              </p>
              <Link href="/brand/creators">
                <Button className="mt-4 rounded-full" size="sm">
                  Browse Creators
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.creators.map((c) => (
                <CreatorCard key={c.id} creator={c} wishlistId={id} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
