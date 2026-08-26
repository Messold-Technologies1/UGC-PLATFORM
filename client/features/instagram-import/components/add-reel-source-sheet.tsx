"use client";

import { Instagram, Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Asks where a new reel is coming from. Sits between the "Add reel" tile and
 * either the existing upload drawer or the Instagram gallery.
 *
 * The Instagram option is always visible, even with no account connected —
 * hiding it would leave creators unaware the feature exists. When unlinked it
 * offers to connect instead.
 */
export function AddReelSourceSheet({
  open,
  onOpenChange,
  onUploadFromDevice,
  onChooseFromInstagram,
  instagramState,
  onConnectInstagram,
  connecting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFromDevice: () => void;
  onChooseFromInstagram: () => void;
  /** Drives which of the three Instagram affordances is shown. */
  instagramState: "connected" | "not_connected" | "reconnect_required";
  onConnectInstagram: () => void;
  connecting?: boolean;
}) {
  const connected = instagramState === "connected";
  const needsReconnect = instagramState === "reconnect_required";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a reel</DialogTitle>
          <DialogDescription>
            Upload a new file, or pick something you have already posted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            onClick={onUploadFromDevice}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-muted-foreground/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Upload className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Upload from your device
              </span>
              <span className="block text-xs text-muted-foreground">
                MP4, MOV or WebM, up to 1 GB
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={connected ? onChooseFromInstagram : onConnectInstagram}
            disabled={connecting}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-muted-foreground/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500/15 to-orange-400/15">
              {connecting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Instagram className="size-4" aria-hidden />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Choose from Instagram
              </span>
              <span className="block text-xs text-muted-foreground">
                {connected
                  ? "Pick reels you have already posted"
                  : needsReconnect
                    ? "Reconnect Instagram to browse your reels"
                    : "Connect Instagram to browse your reels"}
              </span>
            </span>
          </button>
        </div>

        <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Whatever you add still has to be your own work, in 1080p or better,
          with no watermark, logo or platform branding.
        </p>
      </DialogContent>
    </Dialog>
  );
}
