"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

interface ReasonPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  /** Minimum characters required before the confirm button is enabled. */
  minLength?: number;
  onConfirm: (note: string) => void;
}

export function ReasonPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  pendingLabel,
  isPending,
  minLength = 3,
  onConfirm,
}: ReasonPromptDialogProps) {
  const [note, setNote] = useState("");

  const trimmed = note.trim();
  const isValid = trimmed.length >= minLength;

  function handleOpenChange(next: boolean) {
    if (!next && isPending) return;
    if (!next) setNote("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="reason-prompt-note"
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
          <Textarea
            id="reason-prompt-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            rows={4}
            maxLength={2000}
            disabled={isPending}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isValid || isPending}
            onClick={() => onConfirm(trimmed)}
          >
            {isPending ? (
              <>
                <Spinner className="size-4" aria-hidden />
                {pendingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
