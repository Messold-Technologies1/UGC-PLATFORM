"use client";

import { useState } from "react";
import { Heart, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useWishlistsQuery } from "../hooks/use-wishlists-query";
import { useCreateWishlistMutation } from "../hooks/use-create-wishlist-mutation";
import { useAddWishlistCreatorMutation } from "../hooks/use-add-wishlist-creator-mutation";
import { useRemoveWishlistCreatorMutation } from "../hooks/use-remove-wishlist-creator-mutation";
import type { Wishlist } from "../api/types";

interface SaveToWishlistButtonProps {
  creatorId: string;
  variant?: "icon" | "full";
}

export function SaveToWishlistButton({ creatorId, variant = "full" }: SaveToWishlistButtonProps) {
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const { data, isLoading } = useWishlistsQuery();
  const wishlists: Wishlist[] = data?.items ?? [];

  const addMutation = useAddWishlistCreatorMutation();
  const removeMutation = useRemoveWishlistCreatorMutation();
  const createMutation = useCreateWishlistMutation();

  const inWishlistIds = new Set(
    wishlists
      .filter((w) => w.creatorCount > 0)
      .map((w) => w.id)
  );

  function isInWishlist(wishlistId: string) {
    return inWishlistIds.has(wishlistId);
  }

  async function handleToggle(wishlist: Wishlist) {
    if (isInWishlist(wishlist.id)) {
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
      const { id } = await createMutation.mutateAsync({ name, creatorIds: [creatorId] });
      toast.success(`Created wishlist "${name}"`);
      setNewName("");
      setShowNew(false);
      void id;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create wishlist");
    }
  }

  const isBusy = addMutation.isPending || removeMutation.isPending || createMutation.isPending;

  if (variant === "icon") {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-20 flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all hover:bg-black/60"
            aria-label="Save to wishlist"
          >
            {isBusy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Heart size={13} />
            )}
          </button>
        </DropdownMenuTrigger>
        <WishlistDropdownContent
          wishlists={wishlists}
          isLoading={isLoading}
          showNew={showNew}
          newName={newName}
          isBusy={isBusy}
          onToggle={handleToggle}
          onShowNew={() => setShowNew(true)}
          onNewNameChange={setNewName}
          onCreate={handleCreate}
          isInWishlist={isInWishlist}
        />
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="dr-btn dr-btn-secondary flex-1 gap-2">
          {isBusy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Heart size={15} />
          )}
          Save
        </Button>
      </DropdownMenuTrigger>
      <WishlistDropdownContent
        wishlists={wishlists}
        isLoading={isLoading}
        showNew={showNew}
        newName={newName}
        isBusy={isBusy}
        onToggle={handleToggle}
        onShowNew={() => setShowNew(true)}
        onNewNameChange={setNewName}
        onCreate={handleCreate}
        isInWishlist={isInWishlist}
      />
    </DropdownMenu>
  );
}

function WishlistDropdownContent({
  wishlists,
  isLoading,
  showNew,
  newName,
  isBusy,
  onToggle,
  onShowNew,
  onNewNameChange,
  onCreate,
  isInWishlist,
}: {
  wishlists: Wishlist[];
  isLoading: boolean;
  showNew: boolean;
  newName: string;
  isBusy: boolean;
  onToggle: (w: Wishlist) => void;
  onShowNew: () => void;
  onNewNameChange: (v: string) => void;
  onCreate: () => void;
  isInWishlist: (id: string) => boolean;
}) {
  return (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-60 rounded-2xl p-2 shadow-xl border-border/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
        Save to wishlist
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : wishlists.length === 0 ? (
        <div className="px-2 py-2 text-sm text-muted-foreground">No wishlists yet</div>
      ) : (
        wishlists.map((w) => {
          const saved = isInWishlist(w.id);
          return (
            <DropdownMenuItem
              key={w.id}
              className="rounded-xl flex items-center gap-2 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                if (!isBusy) onToggle(w);
              }}
            >
              <div className={`flex size-4 shrink-0 items-center justify-center rounded border ${saved ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                {saved && <Check size={10} />}
              </div>
              <span className="truncate text-sm">{w.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{w.creatorCount}</span>
            </DropdownMenuItem>
          );
        })
      )}
      <DropdownMenuSeparator />
      {showNew ? (
        <div className="flex items-center gap-1 px-1 pt-1">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="Wishlist name…"
            className="h-8 text-sm rounded-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreate();
              e.stopPropagation();
            }}
          />
          <Button size="sm" className="h-8 shrink-0" onClick={onCreate} disabled={!newName.trim() || isBusy}>
            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          </Button>
        </div>
      ) : (
        <DropdownMenuItem
          className="rounded-xl flex items-center gap-2 cursor-pointer text-primary"
          onSelect={(e) => {
            e.preventDefault();
            onShowNew();
          }}
        >
          <Plus size={14} />
          <span className="text-sm font-medium">New wishlist</span>
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}
