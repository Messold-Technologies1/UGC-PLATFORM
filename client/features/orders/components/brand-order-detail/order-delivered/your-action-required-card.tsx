"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileEdit,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAcceptOrderDeliveryMutation } from "../../../hooks/use-accept-order-delivery-mutation";
import { useRequestOrderRevisionMutation } from "../../../hooks/use-request-order-revision-mutation";
import type { OrderDetailsPublic } from "../../../api/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface YourActionRequiredCardProps {
  order: OrderDetailsPublic;
  orderId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function computeDaysLeft(deliveredAt?: string | null): number | null {
  if (!deliveredAt) return null;
  const delivered = new Date(deliveredAt);
  const deadline = new Date(delivered);
  deadline.setDate(deadline.getDate() + 2); // 2-day review window
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DRAWER_CONTENT_CLASSES =
  "data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-112.5 data-[vaul-drawer-direction=right]:rounded-none h-full border-l border-border/30 bg-background shadow-2xl flex flex-col p-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]";

const DRAWER_HEADER_CLASSES =
  "sticky top-0 z-10 border-b border-border/20 bg-background/95 px-8 py-6 text-left backdrop-blur-sm";

const DRAWER_FOOTER_CLASSES =
  "sticky bottom-0 flex flex-col gap-3 border-t border-border/20 bg-background/95 px-8 py-6 backdrop-blur-sm";

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function YourActionRequiredCard({
  order,
  orderId,
}: YourActionRequiredCardProps) {
  /* ---- State ---- */
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRevisionDrawerOpen, setIsRevisionDrawerOpen] = useState(false);
  const [isIssueDrawerOpen, setIsIssueDrawerOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [issueReason, setIssueReason] = useState("");

  /* ---- Mutations ---- */
  const acceptMutation = useAcceptOrderDeliveryMutation({
    onSuccess: () => setIsApproveDialogOpen(false),
  });
  const revisionMutation = useRequestOrderRevisionMutation({
    onSuccess: () => {
      setRevisionNote("");
      setIsRevisionDrawerOpen(false);
    },
  });

  /* ---- Derived state ---- */
  const canReviewDelivery =
    order.status === "DELIVERED" || order.status === "REVISION_SUBMITTED";
  const isAccepted = ["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(
    order.status,
  );
  const hasRevisionsRemaining =
    order.revisionCount < order.maxRevisionsSnapshot;
  const canRequestRevision = canReviewDelivery && hasRevisionsRemaining;
  const revisionsUsed = order.revisionCount;
  const revisionsMax = order.maxRevisionsSnapshot;
  const daysLeft = computeDaysLeft(order.deliveredAt);
  const isAcceptPending = acceptMutation.isPending;
  const isRevisionPending = revisionMutation.isPending;
  const trimmedRevisionNote = revisionNote.trim();
  const trimmedIssueReason = issueReason.trim();

  /* ---- Handlers ---- */
  function handleApproveDelivery() {
    if (!canReviewDelivery || isAcceptPending) return;
    acceptMutation.mutate({ orderId });
  }

  function handleRequestRevision() {
    if (!canRequestRevision || isRevisionPending) return;
    revisionMutation.mutate({ orderId });
  }

  /* ---- If already accepted, show completion state ---- */
  if (isAccepted) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="size-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Content Approved
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            You've approved the delivered content. The order is now complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Your Action Required
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Please review the content and take action within
          </p>

          {/* Timer */}
          {daysLeft !== null && (
            <div className="flex items-center gap-2 mt-3">
              <Clock className="size-4 text-destructive shrink-0" />
              <span className="text-sm font-semibold text-destructive">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
              </span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-5">
          {/* Primary actions */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full font-semibold h-11 rounded-xl shadow-sm"
              disabled={!canReviewDelivery || isAcceptPending}
              onClick={() => setIsApproveDialogOpen(true)}
            >
              <CheckCircle className="size-4 mr-1.5" />
              Approve Content
            </Button>

            <Button
              variant="outline"
              className="w-full font-semibold h-11 rounded-xl"
              disabled={!canRequestRevision}
              onClick={() => setIsRevisionDrawerOpen(true)}
            >
              <RotateCcw className="size-4 mr-1.5" />
              Request Revision
            </Button>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Not happy with the content?
            </span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Raise issue */}
          <Button
            variant="outline"
            className="w-full mt-4 font-semibold h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
            onClick={() => setIsIssueDrawerOpen(true)}
          >
            <AlertTriangle className="size-4 mr-1.5" />
            Raise an Issue
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Approve Dialog                                               */}
      {/* ============================================================ */}
      <Dialog
        open={isApproveDialogOpen}
        onOpenChange={(open) => {
          if (!open && isAcceptPending) return;
          setIsApproveDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={!isAcceptPending}>
          <DialogHeader>
            <DialogTitle>Approve delivered content?</DialogTitle>
            <DialogDescription>
              This will mark the order as completed. The creator&apos;s payment
              will be released after approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isAcceptPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleApproveDelivery}
              disabled={!canReviewDelivery || isAcceptPending}
            >
              {isAcceptPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/*  Request Revision Drawer (right)                              */}
      {/* ============================================================ */}
      <Drawer
        open={isRevisionDrawerOpen}
        onOpenChange={(open) => {
          if (!open && isRevisionPending) return;
          setIsRevisionDrawerOpen(open);
          if (!open) setRevisionNote("");
        }}
        direction="right"
      >
        <DrawerContent className={DRAWER_CONTENT_CLASSES}>
          <DrawerHeader className={DRAWER_HEADER_CLASSES}>
            <DrawerTitle className="text-xl font-bold tracking-tight">
              Request Revision
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Describe what changes you&apos;d like the creator to make.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="space-y-6">
              {/* Revision count */}
              <div className="flex items-center gap-2.5">
                <Badge
                  variant="outline"
                  className="rounded-full text-xs font-semibold px-3 py-1"
                >
                  <FileEdit className="size-3 mr-1.5" />
                  {revisionsUsed} / {revisionsMax} revisions used
                </Badge>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <label
                  htmlFor="revisionNote"
                  className="text-[11px] font-bold tracking-wide text-foreground uppercase"
                >
                  Revision Notes
                </label>
                <Textarea
                  id="revisionNote"
                  placeholder="Describe the specific changes you'd like (e.g., adjust lighting, re-record intro, change background music)..."
                  className="min-h-37.5 resize-y rounded-lg border-border/50 bg-background p-3 text-xs shadow-none transition-colors placeholder:text-muted-foreground/50 focus-visible:ring-primary/20"
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  disabled={isRevisionPending}
                />
                <p className="text-[11px] text-muted-foreground">
                  Provide clear and specific feedback to help the creator
                  deliver exactly what you need.
                </p>
              </div>
            </div>
          </div>

          <DrawerFooter className={DRAWER_FOOTER_CLASSES}>
            <Button
              className="w-full font-semibold"
              onClick={handleRequestRevision}
              disabled={
                isRevisionPending ||
                !canRequestRevision ||
                trimmedRevisionNote.length < 3
              }
            >
              {isRevisionPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Submitting...
                </>
              ) : (
                <>
                  <RotateCcw className="size-4" />
                  Submit Revision Request
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                className="w-full font-semibold text-muted-foreground hover:text-foreground"
                disabled={isRevisionPending}
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ============================================================ */}
      {/*  Raise an Issue Drawer (right)                                */}
      {/* ============================================================ */}
      <Drawer
        open={isIssueDrawerOpen}
        onOpenChange={(open) => {
          setIsIssueDrawerOpen(open);
          if (!open) setIssueReason("");
        }}
        direction="right"
      >
        <DrawerContent className={DRAWER_CONTENT_CLASSES}>
          <DrawerHeader className={DRAWER_HEADER_CLASSES}>
            <DrawerTitle className="text-xl font-bold tracking-tight text-destructive">
              Raise an Issue
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Please provide a detailed description of the issue with this
              order. Our team will review and take appropriate action.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="issueReason"
                  className="text-[11px] font-bold tracking-wide text-foreground uppercase"
                >
                  Issue Description
                </label>
                <Textarea
                  id="issueReason"
                  placeholder="Describe the issue with the order in detail..."
                  className="min-h-37.5 resize-y rounded-lg border-border/50 bg-background p-3 text-xs shadow-none transition-colors placeholder:text-muted-foreground/50 focus-visible:ring-destructive/20"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter at least 10 characters. Providing specific details helps
                  us resolve the issue faster.
                </p>
              </div>
            </div>
          </div>

          <DrawerFooter className={DRAWER_FOOTER_CLASSES}>
            <Button
              variant="destructive"
              className="w-full font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={trimmedIssueReason.length < 10}
            >
              <AlertTriangle className="size-4" />
              Submit Issue
            </Button>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                className="w-full font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
