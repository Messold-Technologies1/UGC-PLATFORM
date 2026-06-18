"use client";

import Link from "next/link";
import { Heart, Share2, Trash2, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDeleteWishlistMutation } from "../hooks/use-delete-wishlist-mutation";
import { useToggleWishlistShareMutation } from "../hooks/use-toggle-wishlist-share-mutation";
import type { Wishlist } from "../api/types";

interface WishlistCardProps {
  wishlist: Wishlist;
  shareBaseUrl: string;
}

export function WishlistCard({ wishlist, shareBaseUrl }: WishlistCardProps) {
  const deleteMutation = useDeleteWishlistMutation();
  const shareMutation = useToggleWishlistShareMutation(wishlist.id);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const res = await shareMutation.mutateAsync();
      if (res.shareEnabled && res.shareToken) {
        const url = `${shareBaseUrl}/wishlists/share/${res.shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } else {
        toast.success("Sharing disabled");
      }
    } catch {
      toast.error("Failed to update share settings");
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete wishlist "${wishlist.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(wishlist.id);
      toast.success("Wishlist deleted");
    } catch {
      toast.error("Failed to delete wishlist");
    }
  }

  return (
    <Link href={`/brand/wishlists/${wishlist.id}`} className="block group">
      <Card className="p-5 rounded-2xl border border-border/60 hover:shadow-md transition-shadow flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {wishlist.name}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Users size={11} />
                {wishlist.creatorCount} creator{wishlist.creatorCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {wishlist.shareEnabled ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                Shared
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-0.5">
                <Lock size={9} /> Private
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1 border-t border-border/40">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleShare}
            disabled={shareMutation.isPending}
          >
            <Share2 size={12} />
            {wishlist.shareEnabled ? "Unshare" : "Share"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-2 text-xs gap-1 text-muted-foreground hover:text-destructive ml-auto"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={12} />
            Delete
          </Button>
        </div>
      </Card>
    </Link>
  );
}
