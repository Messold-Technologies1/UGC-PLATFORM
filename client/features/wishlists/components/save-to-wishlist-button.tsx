"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Plus, Check, Loader2, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWishlistsQuery } from "../hooks/use-wishlists-query";
import { useCreateWishlistMutation } from "../hooks/use-create-wishlist-mutation";
import { useAddWishlistCreatorMutation } from "../hooks/use-add-wishlist-creator-mutation";
import { useRemoveWishlistCreatorMutation } from "../hooks/use-remove-wishlist-creator-mutation";
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

const AVATAR_GRADIENTS = [
  "from-orange-500 to-red-400",
  "from-violet-600 to-pink-500",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function pickGradient(name: string) {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length]!;
}

interface SaveToWishlistButtonProps {
  creatorId: string;
  creatorName: string;
  variant?: "icon" | "full";
}

export function SaveToWishlistButton({ creatorId, creatorName, variant = "full" }: SaveToWishlistButtonProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data, isLoading } = useWishlistsQuery();
  const wishlists: Wishlist[] = data?.items ?? [];

  const addMutation = useAddWishlistCreatorMutation();
  const removeMutation = useRemoveWishlistCreatorMutation();
  const createMutation = useCreateWishlistMutation();

  const isBusy = addMutation.isPending || removeMutation.isPending || createMutation.isPending;

  function isInWishlist(wishlist: Wishlist) {
    return wishlist.creatorIds?.includes(creatorId) ?? false;
  }

  const savedCount = wishlists.filter(isInWishlist).length;

  async function handleToggle(wishlist: Wishlist) {
    if (isInWishlist(wishlist)) {
      try {
        await removeMutation.mutateAsync({ wishlistId: wishlist.id, creatorId });
        toast.success(`Removed from "${wishlist.name}"`);
      } catch {
        toast.error("Failed to remove from wishlist");
      }
    } else {
      try {
        await addMutation.mutateAsync({ wishlistId: wishlist.id, creatorId });
        toast.success(`Added to "${wishlist.name}"`);
      } catch {
        toast.error("Failed to add to wishlist");
      }
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createMutation.mutateAsync({ name, creatorIds: [creatorId] });
      toast.success(`Created wishlist "${name}"`);
      setNewName("");
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create wishlist");
    }
  }

  const initials = getInitials(creatorName);
  const gradient = pickGradient(creatorName);
  const isSaved = savedCount > 0;

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute top-3 right-3 z-20 flex size-7 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur-sm transition-all hover:scale-110"
        aria-label="Save to wishlist"
      >
        {isBusy ? (
          <Loader2 size={13} className="animate-spin text-rose-500" />
        ) : (
          <Heart
            size={13}
            className={isSaved ? "fill-rose-500 text-rose-500" : "text-gray-500"}
          />
        )}
      </button>
    ) : (
      <Button
        variant="outline"
        className="dr-btn dr-btn-secondary flex-1 gap-2"
        onClick={() => setOpen(true)}
      >
        {isBusy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Heart size={15} className={isSaved ? "fill-rose-500 text-rose-500" : ""} />
        )}
        Save
      </Button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl gap-0">
          <DialogTitle className="sr-only">Save to Wishlist</DialogTitle>

          {/* Header */}
          <div className="flex items-center gap-3 p-5 pb-4">
            <div
              className={cn(
                "size-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0",
                gradient
              )}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Save to wishlist
              </p>
              <p className="text-base font-bold truncate">{creatorName}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto size-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Create new wishlist */}
          <div className="px-5 pb-3">
            {showCreate ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Wishlist name…"
                  className="flex-1 min-w-0 h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm outline-none focus:border-rose-400 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 shrink-0 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                  onClick={handleCreate}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
              >
                <div className="size-7 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <Plus size={14} />
                </div>
                <span className="font-medium text-sm">Create a new wishlist</span>
              </button>
            )}
          </div>

          {/* Wishlist list */}
          <div className="px-5 pb-3 space-y-1 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : wishlists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No wishlists yet</p>
            ) : (
              wishlists.map((w, i) => {
                const saved = isInWishlist(w);
                const color = ACCENT_COLORS[i % ACCENT_COLORS.length]!;
                return (
                  <div
                    key={w.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      saved ? "bg-rose-50" : "hover:bg-gray-50"
                    )}
                  >
                    <div
                      className="size-3 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.creatorCount} creator{w.creatorCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {saved ? (
                      <Button
                        size="sm"
                        className="bg-rose-500 hover:bg-rose-600 text-white rounded-full gap-1 h-8 px-3 shrink-0"
                        onClick={() => handleToggle(w)}
                        disabled={isBusy}
                      >
                        {removeMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Saved
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full gap-1 h-8 px-3 shrink-0"
                        onClick={() => handleToggle(w)}
                        disabled={isBusy}
                      >
                        {addMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={12} />
                        )}
                        Add
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/40 px-5 py-3">
            <Link
              href="/brand/wishlists"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-rose-500 hover:underline flex items-center gap-1"
            >
              View all wishlists
              <ArrowRight size={13} />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
