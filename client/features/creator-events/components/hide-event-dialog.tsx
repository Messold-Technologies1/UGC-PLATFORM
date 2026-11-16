"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AdminCreatorEventApi } from "../api/types";
import { CREATOR_EVENT_HIDE_REASON_MAX_LENGTH } from "../lib/constants";
import { useHideEventMutation } from "../hooks/use-admin-events";

interface HideEventDialogProps {
  /** The post to hide; null closes the dialog. */
  event: AdminCreatorEventApi | null;
  onClose: () => void;
}

function HideEventForm({
  event,
  onClose,
}: {
  event: AdminCreatorEventApi;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const hide = useHideEventMutation();

  const trimmed = reason.trim();
  const over = trimmed.length > CREATOR_EVENT_HIDE_REASON_MAX_LENGTH;

  async function submit() {
    if (over || hide.isPending) return;
    await hide.mutateAsync({ id: event.id, reason: trimmed || undefined });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Hide this post?</DialogTitle>
        <DialogDescription>
          It leaves the brand feed straight away. The creator keeps seeing it in
          their own list, with your reason attached — nothing disappears on them
          unexplained. Reversible, and the post is never deleted.
        </DialogDescription>
      </DialogHeader>

      {/* The admin should see exactly what they are acting on, rather than
          trusting the row they happened to click. */}
      <div className="rounded-lg border border-border bg-muted/60 p-3">
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
          {event.creatorName}
        </p>
        <p className="max-h-32 overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed">
          {event.body}
        </p>
      </div>

      <div>
        <label
          htmlFor="hide-reason"
          className="mb-1.5 block text-[13px] font-medium"
        >
          Reason{" "}
          <span className="font-normal text-muted-foreground">
            — shown to the creator
          </span>
        </label>
        <Textarea
          id="hide-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            // Enter alone stays a newline: a reason can run to two lines.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
          }}
          aria-describedby="hide-reason-hint"
          aria-invalid={over || undefined}
          placeholder="e.g. Off-platform solicitation"
          className="resize-none"
        />
        <div
          id="hide-reason-hint"
          className="mt-1.5 flex items-center justify-between gap-3"
        >
          <span className="text-xs text-muted-foreground">
            Optional, but it is the only explanation they get.
          </span>
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              over ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {trimmed.length} / {CREATOR_EVENT_HIDE_REASON_MAX_LENGTH}
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={hide.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={over || hide.isPending}>
          {hide.isPending ? "Hiding…" : "Hide post"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function HideEventDialog({ event, onClose }: HideEventDialogProps) {
  return (
    <Dialog
      open={event !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {/* Keyed on the post, so the reason box starts empty for each one.
            Carrying the last reason over is how the wrong explanation ends up
            attached to the wrong creator. */}
        {event ? (
          <HideEventForm key={event.id} event={event} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
