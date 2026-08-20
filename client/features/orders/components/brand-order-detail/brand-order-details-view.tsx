"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useGetBrandOrderDetailsQuery } from "../../hooks/use-get-brand-order-details-query";
import { useGetBrandOrderDeliveriesQuery } from "../../hooks/use-get-brand-order-deliveries-query";
import { getLatestDeliveryPreviewState } from "./order-delivered/delivery-preview-preparing";
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
import { BrandOrderDisputeView } from "./brand-order-dispute-view";
import { DisputeResolvedBanner } from "../dispute-resolved-banner";
import { OrderSummaryCard } from "./order-summary-card";
import { NeedHelpCard, TipsCard } from "./support-tips-card";
import { InprogressNotificationBanner } from "./order-inProgress/inprogress-notification-banner";
import { InprogressOrderDetailsCard } from "./order-inProgress/inprogress-order-details-card";
import { InprogressShippingCard } from "./order-inProgress/inprogress-shipping-card";
import { ChatPreviewCard } from "./chat-preview-card";
import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { DeliveredNotificationBanner } from "./order-delivered/delivered-notification-banner";
import { DeliveredVideosCard } from "./order-delivered/delivered-videos-card";
import { YourActionRequiredCard } from "./order-delivered/your-action-required-card";
import { CompletedNotificationBanner } from "./order-completed/completed-notification-banner";
import { CompletedPaymentSummaryCard } from "./order-completed/completed-payment-summary-card";
import { UsageRightsCard } from "./order-completed/usage-rights-card";
import { ShareExperienceCard } from "./order-completed/share-experience-card";
import { SupportBanner } from "./order-completed/support-banner";
import { cn } from "@/lib/utils";

interface BrandOrderDetailsViewProps {
  orderId: string;
}

function BrandOrderDetailsSkeleton() {
  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
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
  const { data: deliveriesData } = useGetBrandOrderDeliveriesQuery(orderId);
  const { previewGenerating, isRevision } = getLatestDeliveryPreviewState(
    deliveriesData?.items ?? [],
  );

  const [previewState, setPreviewState] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview");
    if (preview) {
      setPreviewState(preview);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (isLoading) {
    return <BrandOrderDetailsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8">
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

  const inProgressStatuses = ["PRODUCT_SHIPPED", "PRODUCT_RECEIVED"];
  if (!order.requiresPhysicalProductShipment) {
    inProgressStatuses.push("BRIEF_ACCEPTED");
  }
  const isActuallyInProgress =
    inProgressStatuses.includes(order.status) ||
    (order.status === "DISPUTED" && !order.deliveredAt && !!order.briefAcceptedAt);

  const showInProgressUI =
    previewState === "In Progress" ||
    (isActuallyInProgress && previewState === null);


  const deliveredStatuses = ["DELIVERED", "REVISION_REQUESTED", "REVISION_SUBMITTED"];
  const isActuallyDelivered =
    deliveredStatuses.includes(order.status) ||
    (order.status === "DISPUTED" && !!order.deliveredAt);
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

  // A live dispute gets its own dedicated view with the brand ↔ creator ↔
  // support group chat, rather than being buried as a banner in the regular
  // in-progress/delivered layout.
  if (order.status === "DISPUTED" && previewState === null) {
    return (
      <BrandOrderDisputeView
        orderId={orderId}
        order={order}
        creator={creator}
        brief={brief}
        briefId={briefId}
      />
    );
  }

  if (showCompletedUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
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

        <DisputeResolvedBanner dispute={order.dispute} />

        <CompletedNotificationBanner />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <DeliveredVideosCard orderId={orderId} order={order} variant="completed" />
          </div>
          <aside className="flex flex-col gap-5 lg:col-span-4">
            <CompletedPaymentSummaryCard order={order} />
            <UsageRightsCard orderId={orderId} order={order} />
          </aside>
        </div>

        <InprogressOrderDetailsCard
          order={order}
          brief={brief}
          briefId={briefId}
          orderId={orderId}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <CreatorProfileCard creator={creator} order={order} />
          <ShareExperienceCard order={order} creatorName={creator?.displayName} />
        </div>

        <SupportBanner />
      </div>
    );
  }

  if (showDeliveredUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
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

        <DisputeResolvedBanner dispute={order.dispute} />

        {order.status === "DISPUTED" ? (
          <OrderStatusBanner order={order} creator={creator} isOrderCompleted={isActuallyCompleted} />
        ) : (
          <DeliveredNotificationBanner
            creatorName={creator?.displayName || "Creator"}
            order={order}
            previewPreparing={previewGenerating}
            isRevision={isRevision}
            isOrderCompleted={isActuallyCompleted}
            completedAt={order.acceptedAt}
          />
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col gap-5 lg:col-span-8 h-full">
            <DeliveredVideosCard
              orderId={orderId}
              creatorName={creator?.displayName || "Creator"}
            />
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4 h-full">
            <YourActionRequiredCard
              order={order}
              orderId={orderId}
              previewPreparing={previewGenerating}
              creatorName={creator?.displayName || "Creator"}
              isRevision={isRevision}
            />
          </aside>
        </div>

        <InprogressOrderDetailsCard
          order={order}
          brief={brief}
          briefId={briefId}
          orderId={orderId}
        />

       
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <CreatorProfileCard creator={creator} order={order} />
          <ChatPreviewCard creator={creator} orderId={orderId} />
        </div>
      </div>
    );
  }

  if (showInProgressUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />
        
        <OrderProgressStepper
          order={order}
          onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)}
          previewState={previewState}
        />

        <DisputeResolvedBanner dispute={order.dispute} />

        {order.status === "DISPUTED" ? (
          <OrderStatusBanner order={order} creator={creator} isOrderCompleted={isActuallyCompleted} />
        ) : (
          <InprogressNotificationBanner creatorName={creator?.displayName || "Creator"} isOrderCompleted={isActuallyCompleted} />
        )}

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
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4">
            <CreatorProfileCard creator={creator} order={order} />
            <OrderChatWidget orderId={orderId} role="brand" creator={creator} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
      <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />

      <OrderProgressStepper
        order={order}
        onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)}
        previewState={previewState}
      />

      <DisputeResolvedBanner dispute={order.dispute} />

      <OrderStatusBanner order={order} creator={creator} isOrderCompleted={isActuallyCompleted} />

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

          {order.hasBrief && brief ? (
            <BriefSummaryCard order={order} brief={brief} briefId={briefId} />
          ) : null}

          <OrderActivityTimeline order={order} />
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <CreatorAcceptanceCard creator={creator} order={order} />

          <OrderDetailsCard order={order} />

          <OrderRatingReviewCard order={order} role="brand" />

          <NeedHelpCard />

          <TipsCard />
        </aside>
      </div>
    </div>
  );
}
