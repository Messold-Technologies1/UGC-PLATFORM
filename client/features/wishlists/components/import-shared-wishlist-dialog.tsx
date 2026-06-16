"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2, ArrowRight, X, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWishlistsQuery } from "../hooks/use-wishlists-query";
import { useImportSharedWishlistMutation } from "../hooks/use-import-shared-wishlist-mutation";
import type { Wishlist } from "../api/types";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = [
  "#3b82f6",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

interface ImportSharedWishlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareToken: string;
  shortlistName: string;
  creatorCount: number;
  sourceBrandName: string;
}

export function ImportSharedWishlistDialog({
  open,
  onOpenChange,
  shareToken,
  shortlistName,
  creatorCount,
  sourceBrandName,
}: ImportSharedWishlistDialogProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState(`${shortlistName} (copy)`);

  const { data, isLoading } = useWishlistsQuery();
  const wishlists: Wishlist[] = data?.items ?? [];
  const importMutation = useImportSharedWishlistMutation(shareToken);

  const isBusy = importMutation.isPending;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setShowCreate(false);
      setNewName(`${shortlistName} (copy)`);
    }
  }

  async function handleImportToExisting(wishlist: Wishlist) {
    try {
      const result = await importMutation.mutateAsync({ wishlistId: wishlist.id });
      const addedLabel =
        result.addedCount > 0
          ? `Added ${result.addedCount} creator${result.addedCount !== 1 ? "s" : ""}`
          : "All creators were already in that wishlist";
      toast.success(addedLabel, { description: `"${wishlist.name}"` });
      handleOpenChange(false);
      router.push(`/brand/wishlists/${result.wishlistId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to import shortlist");
    }
  }

  async function handleCreateAndImport() {
    const name = newName.trim();
    if (!name) return;
    try {
      const result = await importMutation.mutateAsync({ name });
      toast.success(`Created "${name}" with ${result.addedCount} creators`);
      handleOpenChange(false);
      router.push(`/brand/wishlists/${result.wishlistId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create wishlist");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-82 max-w-md gap-0 overflow-hidden rounded-3xl p-0"
        overlayClassName="z-80"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Save shared shortlist</DialogTitle>

        <div className="flex items-start gap-3 p-5 pb-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <Bookmark size={20} className="fill-rose-500 text-rose-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Save to your wishlists
            </p>
            <p className="text-base font-bold leading-snug">{shortlistName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {creatorCount} creator{creatorCount !== 1 ? "s" : ""} from {sourceBrandName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pb-3">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Wishlist name…"
                className="h-9 min-w-0 flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm outline-none transition-colors focus:border-rose-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateAndImport();
                  if (e.key === "Escape") setShowCreate(false);
                }}
              />
              <Button
                size="sm"
                className="h-9 shrink-0 rounded-xl bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => void handleCreateAndImport()}
                disabled={!newName.trim() || isBusy}
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 p-3 text-rose-600 transition-colors hover:bg-rose-100"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <Plus size={14} />
              </div>
              <span className="text-sm font-medium">Create a new wishlist with all creators</span>
            </button>
          )}
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto px-5 pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : wishlists.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No wishlists yet — create one above
            </p>
          ) : (
            wishlists.map((wishlist, index) => {
              const color = ACCENT_COLORS[index % ACCENT_COLORS.length]!;
              const isImportingThis =
                isBusy && importMutation.variables?.wishlistId === wishlist.id;

              return (
                <div
                  key={wishlist.id}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
                >
                  <div
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{wishlist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wishlist.creatorCount} creator{wishlist.creatorCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("h-8 shrink-0 rounded-full gap-1 px-3")}
                    onClick={() => void handleImportToExisting(wishlist)}
                    disabled={isBusy}
                  >
                    {isImportingThis ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={12} />
                    )}
                    Add all
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/40 px-5 py-3">
          <Link
            href="/brand/wishlists"
            onClick={() => handleOpenChange(false)}
            className="flex items-center gap-1 text-sm font-medium text-rose-500 hover:underline"
          >
            View all wishlists
            <ArrowRight size={13} />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
