"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, /* AlertTriangle, */ ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
// import {
//   Drawer,
//   DrawerClose,
//   DrawerContent,
//   DrawerDescription,
//   DrawerFooter,
//   DrawerHeader,
//   DrawerTitle,
// } from "@/components/ui/drawer";
// import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
// import { Spinner } from "@/components/ui/spinner";
// import { Textarea } from "@/components/ui/textarea";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useGetBrandOrderDetailsQuery } from "../../hooks/use-get-brand-order-details-query";
import { OrderRatingReviewCard } from "../order-rating-review-card";
import { BriefSummaryCard } from "./brief-summary-card";
import { CreatorAcceptanceCard } from "./creator-acceptance-card";
import { CreatorProfileCard } from "./creator-profile-card";
import { AwaitingAcceptanceCreatorCard } from "./awaiting-acceptance-creator-card";
import { OrderActivityTimeline } from "./order-activity-timeline";
import { OrderDetailsCard } from "./order-details-card";
import { OrderPageHeader } from "./order-page-header";
import { OrderProgressStepper } from "./order-progress-stepper";
import { OrderStatusBanner } from "./order-status-banner";
import { OrderSummaryCard } from "./order-summary-card";
import { NeedHelpCard, TipsCard } from "./support-tips-card";
import { InprogressNotificationBanner } from "./order-inProgress/inprogress-notification-banner";
import { InprogressOrderDetailsCard } from "./order-inProgress/inprogress-order-details-card";
import { InprogressShippingCard } from "./order-inProgress/inprogress-shipping-card";
import { NeedUpdateCard } from "./need-update-card";
import { QuickActionsCard } from "./quick-actions-card";
import { ChatPreviewCard } from "./chat-preview-card";
import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { DeliveredNotificationBanner } from "./order-delivered/delivered-notification-banner";
import { DeliveredVideosCard } from "./order-delivered/delivered-videos-card";
import { YourActionRequiredCard } from "./order-delivered/your-action-required-card";
import { CompletedNotificationBanner } from "./order-completed/completed-notification-banner";
import { CompletedPaymentSummaryCard } from "./order-completed/completed-payment-summary-card";
import { ShareExperienceCard } from "./order-completed/share-experience-card";
import { SupportBanner } from "./order-completed/support-banner";
import { cn } from "@/lib/utils";

interface BrandOrderDetailsViewProps {
  orderId: string;
}

function BrandOrderDetailsSkeleton() {
  return (
    <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>

      <Skeleton className="h-28 w-full rounded-2xl" />

      <Skeleton className="h-16 w-full rounded-xl" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function BrandOrderDetailsView({ orderId }: BrandOrderDetailsViewProps) {
  const { data, isLoading, isError, error } =
    useGetBrandOrderDetailsQuery(orderId);
  const { data: orderBriefData } = useGetOrderBriefQuery(orderId);

  const [previewState, setPreviewState] = useState<string | null>(null);

  // Read preview state from URL if arriving from Shipping page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview");
    if (preview) {
      setPreviewState(preview);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  // const [disputeReason, setDisputeReason] = useState("");
  // const openBrandDisputeMutation = useOpenBrandDisputeMutation({
  //   onSuccess: () => {
  //     setDisputeReason("");
  //     setIsDisputeDrawerOpen(false);
  //   },
  // });
  // const isDisputePending = openBrandDisputeMutation.isPending;
  // const trimmedDisputeReason = disputeReason.trim();

  if (isLoading) {
    return <BrandOrderDetailsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Unable to load this order
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {error?.message ||
                  "The brand order details request did not return usable data."}
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/brand/orders">
                  <ArrowLeft className="w-4 h-4" />
                  Back to orders
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { order, creator } = data;
  const briefId = order.briefId ?? orderBriefData?.brief?.id ?? null;
  const brief = orderBriefData?.brief ?? null;

  // const canOpenDispute = ![
  //   "PENDING_PAYMENT",
  //   "CREATOR_PAYMENT_DONE",
  //   "REFUNDED",
  //   "REJECTED",
  // ].includes(order.status);

  // function handleDisputeSubmit() {
  //   if (trimmedDisputeReason.length < 3) return;
  //   openBrandDisputeMutation.mutate({
  //     orderId,
  //     reason: trimmedDisputeReason,
  //   });
  const inProgressStatuses = ["PRODUCT_SHIPPED", "PRODUCT_RECEIVED"];
  if (!order.requiresPhysicalProductShipment) {
    inProgressStatuses.push("BRIEF_ACCEPTED");
  }
  const isActuallyInProgress = inProgressStatuses.includes(order.status);

  const showInProgressUI =
    previewState === "In Progress" ||
    (isActuallyInProgress && previewState === null);


  const deliveredStatuses = ["DELIVERED", "REVISION_REQUESTED", "REVISION_SUBMITTED"];
  const isActuallyDelivered = deliveredStatuses.includes(order.status);
  const showDeliveredUI =
    previewState === "Delivered" ||
    (isActuallyDelivered && previewState === null);


  const completedStatuses = ["ACCEPTED", "CREATOR_PAYMENT_DONE"];
  const isActuallyCompleted = completedStatuses.includes(order.status);
  const showCompletedUI = 
    previewState === "Completed" || 
    (isActuallyCompleted && previewState === null);

  
  const packageDescription = order.deliverablesSnapshot.length > 0
    ? `${order.deliverablesSnapshot.length} UGC Video (Up to 60 sec)`
    : order.packageNameSnapshot;
  const isAwaitingPayment = order.status === "PENDING_PAYMENT";

  if (showCompletedUI) {
    return (
      <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader
          orderId={orderId}
          paidAt={order.paidAt}
          completedAt={order.acceptedAt || order.createdAt}
          status={order.status === "ACCEPTED" || order.status === "CREATOR_PAYMENT_DONE" ? order.status : "ACCEPTED"}
          packageDescription={packageDescription}
          showBriefDownload
          showInvoice
        />

        <OrderProgressStepper
          order={order}
          onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)}
          previewState={previewState}
        />

        <CompletedNotificationBanner />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col gap-5 lg:col-span-8 h-full">
            <DeliveredVideosCard orderId={orderId} order={order} variant="completed" />
          </div>
          <aside className="flex flex-col gap-5 lg:col-span-4 h-full">
            <CompletedPaymentSummaryCard order={order} />
          </aside>
        </div>

        <InprogressOrderDetailsCard
          order={order}
          brief={brief}
          briefId={briefId}
          orderId={orderId}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <CreatorProfileCard creator={creator} order={order} />
          <ShareExperienceCard order={order} creatorName={creator?.displayName} />
          <QuickActionsCard />
        </div>

        <SupportBanner />
      </div>
    );
  }

  if (showDeliveredUI) {
    return (
      <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader
          orderId={orderId}
          paidAt={order.paidAt}
          status={order.status}
          packageDescription={packageDescription}
          showBriefDownload
          showInvoice
        />

        <OrderProgressStepper
          order={order}
          onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)}
          previewState={previewState}
        />

        <DeliveredNotificationBanner
          creatorName={creator?.displayName || "Creator"}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col gap-5 lg:col-span-8 h-full">
            <DeliveredVideosCard orderId={orderId} />
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4 h-full">
            <YourActionRequiredCard order={order} orderId={orderId} />
          </aside>
        </div>

        <InprogressOrderDetailsCard
          order={order}
          brief={brief}
          briefId={briefId}
          orderId={orderId}
        />

       
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <CreatorProfileCard creator={creator} order={order} />
          <ChatPreviewCard creator={creator} orderId={orderId} />
          <QuickActionsCard />
        </div>
      </div>
    );
  }

  if (showInProgressUI) {
    return (
      <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />
        
        <OrderProgressStepper 
          order={order} 
          onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)} 
          previewState={previewState} 
        />

        <InprogressNotificationBanner creatorName={creator?.displayName || "Creator"} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <InprogressOrderDetailsCard
              order={order}
              brief={brief}
              briefId={briefId}
              orderId={orderId}
            />

            {order.requiresPhysicalProductShipment && (
              <InprogressShippingCard
                courierPartner={(order as any).courierName}
                trackingId={(order as any).trackingId}
                shippedAt={order.dispatchedAt}
                productReceivedAt={(order as any).productReceivedAt}
              />
            )}

            <NeedUpdateCard />
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4">
            <CreatorProfileCard creator={creator} order={order} />
            <OrderChatWidget orderId={orderId} role="brand" creator={creator} />
            <QuickActionsCard />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
      <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />

      <OrderProgressStepper 
        order={order} 
        onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)} 
        previewState={previewState} 
      />

      <OrderStatusBanner order={order} creator={creator} />

      <div
        className={cn(
          "grid grid-cols-1 gap-5 lg:grid-cols-12 items-start",
          isAwaitingPayment && "pointer-events-none select-none opacity-50",
        )}
        aria-disabled={isAwaitingPayment}
      >
        <div className="flex flex-col gap-5 lg:col-span-8">
          <AwaitingAcceptanceCreatorCard creator={creator} order={order} />

          <OrderSummaryCard
            order={order}
            orderId={orderId}
            briefId={briefId}
            brief={brief}
          />

          <BriefSummaryCard order={order} brief={brief} briefId={briefId} />

          <OrderActivityTimeline order={order} />
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <CreatorAcceptanceCard creator={creator} order={order} />

          <OrderDetailsCard order={order} />

          <OrderRatingReviewCard order={order} role="brand" />

          <NeedHelpCard />

          <TipsCard />

          {/* Raise Dispute – temporarily disabled
          {canOpenDispute && (
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/5 text-xs font-medium"
                onClick={() => setIsDisputeDrawerOpen(true)}
              >
                <AlertTriangle className="size-3.5" />
                Raise Dispute
              </Button>
            </div>
          )}
          */}
        </aside>
      </div>
    </div>
  );

  /* Raise Dispute Drawer – temporarily disabled
  <Drawer
    open={isDisputeDrawerOpen}
    onOpenChange={(open) => {
      if (!open && isDisputePending) return;
      setIsDisputeDrawerOpen(open);
      if (!open) setDisputeReason("");
    }}
    direction="right"
  >
    <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-112.5 data-[vaul-drawer-direction=right]:rounded-none h-full border-l border-border/30 bg-background shadow-2xl flex flex-col p-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      <DrawerHeader className="sticky top-0 z-10 border-b border-border/20 bg-background/95 px-8 py-6 text-left backdrop-blur-sm">
        <DrawerTitle className="text-xl font-bold tracking-tight text-destructive">
          Raise Dispute
        </DrawerTitle>
        <DrawerDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Please provide a detailed reason for raising a dispute for this
          order.
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
          variant="destructive"
          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            className="w-full font-semibold text-muted-foreground hover:text-foreground"
            disabled={isDisputePending}
          >
            Cancel
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
  */
}
