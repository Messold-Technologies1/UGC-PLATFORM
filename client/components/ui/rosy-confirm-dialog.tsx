"use client";

import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface RosyConfirmDialogProps {
  open: boolean;
  title?: string;
  description: string;
  hint?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RosyConfirmDialog({
  open,
  title = "Hold up — not saved yet",
  description,
  hint,
  confirmLabel = "Leave anyway",
  cancelLabel = "Keep editing",
  onConfirm,
  onCancel,
}: RosyConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/30 backdrop-blur-[3px]"
        className={cn(
          "gap-0 overflow-hidden rounded-2xl border border-primary/15 p-0 sm:max-w-[400px]",
          "shadow-[0_28px_64px_-24px_color-mix(in_oklab,var(--primary)_40%,transparent)]",
        )}
      >
        <div className="bg-gradient-to-b from-primary/10 via-background to-background px-8 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20 shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
            <Sparkles className="size-6" />
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </DialogTitle>

          <DialogDescription className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>

          {hint ? (
            <p className="mt-3 text-xs font-medium leading-relaxed text-primary/80">
              {hint}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-primary/10 bg-muted/25 px-8 py-5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 min-w-[140px] flex-1 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 sm:flex-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 min-w-[140px] flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-[filter] hover:brightness-105 sm:flex-none"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
