"use client";

import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { BriefForm } from "@/features/orders/components/brief-form";
import { useOpenBrandDisputeMutation } from "@/features/orders/hooks/use-open-brand-dispute-mutation";
import { useOpenCreatorDisputeMutation } from "@/features/orders/hooks/use-open-creator-dispute-mutation";
import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
  OrderDetailsPublic,
} from "../api/types";
import { STATUS_COLORS, STATUS_LABELS } from "../constants";

interface OrderHeaderProps {
  orderId: string;
  role?: "brand" | "creator";
  order?: OrderDetailsPublic;
  creator?: OrderCreatorSnapshot;
  brand?: OrderBrandSnapshot;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function OrderHeader({
  orderId,
  role = "brand",
  order,
  creator,
  brand,
}: OrderHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDisputeDrawerOpen, setIsDisputeDrawerOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const openBrandDisputeMutation = useOpenBrandDisputeMutation({
    onSuccess: () => {
      setDisputeReason("");
      setIsDisputeDrawerOpen(false);
    },
  });
  const openCreatorDisputeMutation = useOpenCreatorDisputeMutation({
    onSuccess: () => {
      setDisputeReason("");
      setIsDisputeDrawerOpen(false);
    },
  });

  const isDisputePending =
    openBrandDisputeMutation.isPending || openCreatorDisputeMutation.isPending;
  const trimmedDisputeReason = disputeReason.trim();
  const counterpartyName =
    role === "brand"
      ? creator?.displayName ?? "Riya Sharma"
      : brand?.companyName ?? "Brand partner";
  const counterpartyImageUrl =
    role === "brand" ? creator?.profileImageUrl : brand?.logoUrl;
  const canManageBrief =
    role === "brand" &&
    (order ? order.status === "BRIEF_SUBMISSION_PENDING" && !order.hasBrief : true);
  const isBriefReadOnly = role === "creator" || !canManageBrief;
  const canOpenBrief =
    role === "creator" ? true : order ? canManageBrief || order.hasBrief : true;
  const briefActionLabel =
    role === "brand" && order && !canOpenBrief
      ? "Brief Unavailable"
      : role === "creator" || (order && isBriefReadOnly)
        ? "View Brief"
        : "Submit Brief";
  const deadlineLabel = order?.deliveryDeadlineAt
    ? formatDate(order.deliveryDeadlineAt)
    : order?.hasBrief
      ? "In progress"
      : "Starts after brief";
  const canOpenDispute = order
    ? !["PENDING_PAYMENT", "CREATOR_PAYMENT_DONE", "REFUNDED", "REJECTED"].includes(
        order.status,
      )
    : true;

  function handleDisputeSubmit() {
    if (trimmedDisputeReason.length < 3) {
      return;
    }

    if (role === "brand") {
      openBrandDisputeMutation.mutate({
        orderId,
        reason: trimmedDisputeReason,
      });
      return;
    }

    openCreatorDisputeMutation.mutate({
      orderId,
      reason: trimmedDisputeReason,
    });
  }

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            {order?.packageNameSnapshot ?? "Summer Essentials UGC"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {role === "brand" ? "Creator:" : "Brand:"}
              </span>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-primary/20">
                  <AvatarImage src={counterpartyImageUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(counterpartyName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">{counterpartyName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Deadline:</span>
              <span className="font-medium text-foreground">{deadlineLabel}</span>
            </div>
            {order ? (
              <Badge
                variant="outline"
                className={`${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"} rounded-full px-3 py-1 text-[11px] font-semibold`}
              >
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
            ) : null}
          </div>
          {/* <p className="mt-3 text-sm text-muted-foreground">Order ID: {orderId}</p> */}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="destructive"
            className="rounded-xl font-semibold shadow-sm transition-all hover:opacity-90"
            onClick={() => setIsDisputeDrawerOpen(true)}
            disabled={!canOpenDispute}
          >
            <AlertTriangle className="w-4 h-4" />
            Raise Dispute
          </Button>
          <Button
            variant="outline"
            className="rounded-xl font-semibold shadow-sm"
            disabled
          >
            <Download className="w-4 h-4" />
            Invoice
          </Button>
          <Button
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-xl bg-linear-to-r from-primary to-secondary font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
            disabled={!canOpenBrief}
          >
            {briefActionLabel}
          </Button>
        </div>
      </div>

      <Drawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-112.5 data-[vaul-drawer-direction=right]:rounded-none h-full border-l border-border/30 bg-background shadow-2xl flex flex-col p-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <DrawerHeader className="sticky top-0 z-10 border-b border-border/20 bg-background/95 px-8 py-6 text-left backdrop-blur-sm">
            <DrawerTitle className="text-xl font-headline font-extrabold tracking-tight">
              Project Brief
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {order?.packageNameSnapshot ?? `Order ${orderId}`} - Brief details and
              requirements.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <BriefForm
              orderId={orderId}
              showHeading={false}
              submitLabel="Send Details"
              showCancelButton={role === "brand" && !isBriefReadOnly}
              onSuccess={() => setIsDrawerOpen(false)}
              onCancel={() => setIsDrawerOpen(false)}
              className="border-0 bg-transparent p-0 shadow-none"
              readOnly={isBriefReadOnly}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isDisputeDrawerOpen}
        onOpenChange={(open) => {
          if (!open && isDisputePending) {
            return;
          }

          setIsDisputeDrawerOpen(open);
          if (!open) {
            setDisputeReason("");
          }
        }}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-112.5 data-[vaul-drawer-direction=right]:rounded-none h-full border-l border-border/30 bg-background shadow-2xl flex flex-col p-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <DrawerHeader className="sticky top-0 z-10 border-b border-border/20 bg-background/95 px-8 py-6 text-left backdrop-blur-sm">
            <DrawerTitle className="text-xl font-headline font-extrabold tracking-tight text-destructive">
              Raise Dispute
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Please provide a detailed reason for raising a dispute for order{" "}
              {orderId}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="disputeReason"
                  className="text-[11px] font-bold tracking-wide text-foreground"
                >
                  Reason for Dispute
                </Label>
                <Textarea
                  id="disputeReason"
                  placeholder="Describe the issue with the order in detail..."
                  className="min-h-37.5 resize-y rounded-lg border-border/50 bg-background p-3 text-xs shadow-none transition-colors placeholder:text-muted-foreground/50 focus-visible:ring-destructive/20"
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value)}
                  disabled={isDisputePending}
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter at least 3 characters to submit the dispute.
                </p>
              </div>
            </div>
          </div>

          <DrawerFooter className="sticky bottom-0 flex flex-col gap-3 border-t border-border/20 bg-background/95 px-8 py-6 backdrop-blur-sm">
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-full rounded-xl text-base font-semibold shadow-lg shadow-destructive/20"
              onClick={handleDisputeSubmit}
              disabled={isDisputePending || trimmedDisputeReason.length < 3}
            >
              {isDisputePending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                className="h-12 w-full font-semibold text-muted-foreground hover:text-foreground"
                disabled={isDisputePending}
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
