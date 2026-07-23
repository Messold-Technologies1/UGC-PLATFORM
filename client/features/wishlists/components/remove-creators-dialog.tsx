"use client";

import { useState } from "react";
import Image from "next/image";
import { UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRemoveWishlistCreatorMutation } from "../hooks/use-remove-wishlist-creator-mutation";
import type { WishlistCreator } from "../api/types";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned || cleaned === "Creator") return "CR";
  return cleaned
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isValidImageUrl(url?: string | null): url is string {
  return (
    typeof url === "string" &&
    (url.startsWith("http://") || url.startsWith("https://"))
  );
}

interface RemoveCreatorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wishlistId: string;
  wishlistName: string;
  creators: WishlistCreator[];
}

export function RemoveCreatorsDialog({
  open,
  onOpenChange,
  wishlistId,
  wishlistName,
  creators,
}: RemoveCreatorsDialogProps) {
  const removeMutation = useRemoveWishlistCreatorMutation();
  // Track IDs that have been optimistically removed so we can hide them instantly
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Reset local state when dialog opens
  function handleOpenChange(next: boolean) {
    if (next) setRemovedIds(new Set());
    onOpenChange(next);
  }

  async function handleRemove(creator: WishlistCreator) {
    const label =
      creator.city ||
      creator.stateName ||
      creator.countryName ||
      "creator";
    // Optimistically hide the row immediately
    setRemovedIds((prev) => new Set(prev).add(creator.id));
    try {
      await removeMutation.mutateAsync({ wishlistId, creatorId: creator.id });
      toast.success(`Removed ${label} from "${wishlistName}"`);
      const remaining = creators.filter((c) => !removedIds.has(c.id) && c.id !== creator.id);
      if (remaining.length === 0) {
        onOpenChange(false);
      }
    } catch {
      // Roll back the optimistic hide on error
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(creator.id);
        return next;
      });
      toast.error("Failed to remove creator");
    }
  }

  const visibleCreators = creators.filter((c) => !removedIds.has(c.id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
        <div className="border-b border-border/40 px-5 py-4">
          <DialogTitle className="text-base font-bold">Remove creators</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Remove creators from &ldquo;{wishlistName}&rdquo;
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto px-3 py-3 space-y-1">
          {visibleCreators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No creators in this wishlist
            </p>
          ) : (
            visibleCreators.map((creator) => {
              const isRemoving =
                removeMutation.isPending &&
                removeMutation.variables?.creatorId === creator.id;
              const profileUrl = isValidImageUrl(creator.profileImageUrl)
                ? creator.profileImageUrl
                : null;

              return (
                <div
                  key={creator.id}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={cn(
                      "relative size-10 shrink-0 overflow-hidden rounded-full",
                      !profileUrl && "bg-linear-to-br from-violet-500 to-pink-500",
                    )}
                  >
                    {profileUrl ? (
                      <Image
                        src={profileUrl}
                        alt={creator.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs font-bold text-white">
                        {getInitials(
                          creator.city ||
                            creator.stateName ||
                            creator.countryName ||
                            "Creator",
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {creator.city ||
                        creator.stateName ||
                        creator.countryName ||
                        "Creator"}
                    </p>
                    {(creator.city &&
                      (creator.stateName || creator.countryName)) ||
                    (!creator.city &&
                      creator.stateName &&
                      creator.countryName) ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          creator.city ? creator.stateName : null,
                          creator.countryName,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 shrink-0 rounded-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleRemove(creator)}
                        disabled={isRemoving}
                        aria-label={`Remove ${
                          creator.city ||
                          creator.stateName ||
                          creator.countryName ||
                          "creator"
                        }`}
                      >
                        {isRemoving ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <UserMinus size={13} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>Remove creator</TooltipContent>
                  </Tooltip>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
