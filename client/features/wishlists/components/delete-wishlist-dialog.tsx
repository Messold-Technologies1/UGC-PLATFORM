"use client";

import { HeartCrack, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteWishlistMutation } from "../hooks/use-delete-wishlist-mutation";

interface DeleteWishlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wishlistId: string;
  wishlistName: string;
  creatorCount: number;
  onDeleted?: () => void;
}

export function DeleteWishlistDialog({
  open,
  onOpenChange,
  wishlistId,
  wishlistName,
  creatorCount,
  onDeleted,
}: DeleteWishlistDialogProps) {
  const deleteMutation = useDeleteWishlistMutation();

  async function handleConfirm() {
    try {
      await deleteMutation.mutateAsync(wishlistId);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast.error("Failed to delete wishlist");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-82 max-w-sm gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl"
        overlayClassName="z-80 bg-black/40 backdrop-blur-sm"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Delete wishlist</DialogTitle>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-500 to-pink-600 px-6 pb-8 pt-7 text-white">
          <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 left-8 size-20 rounded-full bg-white/10" />
          <Sparkles
            size={14}
            className="pointer-events-none absolute right-10 top-8 text-white/50"
          />

          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
            <HeartCrack size={26} strokeWidth={2} />
          </div>

          <h2 className="relative mt-5 text-xl font-bold tracking-tight">
            Delete this shortlist?
          </h2>
          <p className="relative mt-1.5 text-sm leading-relaxed text-rose-50/90">
            This can&apos;t be undone — you&apos;ll lose your saved creators for
            this campaign.
          </p>
        </div>

        <div className="space-y-4 bg-white px-6 py-5">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-400">
              You&apos;re about to delete
            </p>
            <p className="mt-1 truncate text-base font-bold text-gray-900">
              {wishlistName}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {creatorCount} creator{creatorCount !== 1 ? "s" : ""} saved in
              this shortlist
            </p>
          </div>

          <p className="text-center text-sm text-gray-500">
            Really want to delete it?
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-gray-200 font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
              disabled={deleteMutation.isPending}
            >
              No, keep it
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl bg-rose-500 font-semibold text-white hover:bg-rose-600"
              onClick={() => void handleConfirm()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Yes, delete"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
