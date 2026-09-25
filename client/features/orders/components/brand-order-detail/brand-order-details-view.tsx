"use client";

import { useState, useEffect, useRef } from "react";
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
import { OrderActivityTimeline } from "./order-activity-timeline";
import { OrderPageHeader } from "./order-page-header";
import { OrderProgressStepper } from "./order-progress-stepper";
import { OrderStatusBanner } from "./order-status-banner";
import { BrandOrderDisputeView } from "./brand-order-dispute-view";
import { DisputeResolvedBanner } from "../dispute-resolved-banner";
import { OrderSummaryCard } from "./order-summary-card";
import { InprogressNotificationBanner } from "./order-inProgress/inprogress-notification-banner";
import { InprogressShippingCard } from "./order-inProgress/inprogress-shipping-card";
import { ShippingDetailsCard } from "./order-shipping/shipping-details-card";
import { ShippingAddressCard } from "./order-shipping/shipping-address-card";
import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { DeliveredNotificationBanner } from "./order-delivered/delivered-notification-banner";
import { DeliveredVideosCard } from "./order-delivered/delivered-videos-card";
import { YourActionRequiredCard } from "./order-delivered/your-action-required-card";
import { CompletedNotificationBanner, ORDER_REVIEW_SECTION_ID } from "./order-completed/completed-notification-banner";
import { UsageRightsCard } from "./order-completed/usage-rights-card";
import { ShareExperienceCard } from "./order-completed/share-experience-card";
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

export function BrandOrderDetailsView({ orderId }: Readonly<BrandOrderDetailsViewProps>) {
  const { data, isLoading, isError, error } =
    useGetBrandOrderDetailsQuery(orderId);
  const { data: orderBriefData } = useGetOrderBriefQuery(orderId);
  const { data: deliveriesData } = useGetBrandOrderDeliveriesQuery(orderId);
  const { previewGenerating, isRevision } = getLatestDeliveryPreviewState(
    deliveriesData?.items ?? [],
  );

  const [previewState, setPreviewState] = useState<string | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview");
    if (preview) {
      setPreviewState(preview);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // When realtime updates the order status, drop any stepper preview so the
  // live status UI takes over without a manual refresh.
  useEffect(() => {
    const status = data?.order.status;
    if (!status) return;
    if (lastStatusRef.current === null) {
      lastStatusRef.current = status;
      return;
    }
    if (lastStatusRef.current !== status) {
      lastStatusRef.current = status;
      setPreviewState(null);
    }
  }, [data?.order.status]);

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

  const isActuallyAwaitingShipment =
    order.requiresPhysicalProductShipment && order.status === "BRIEF_ACCEPTED";
  const showAwaitingShipmentUI =
    previewState === "Awaiting Shipment" ||
    (isActuallyAwaitingShipment && previewState === null);


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

  if (showAwaitingShipmentUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader orderId={orderId} paidAt={order.paidAt} order={order} />

        <OrderProgressStepper
          order={order}
          onStepClick={(label) =>
            setPreviewState((prev) => (prev === label ? null : label))
          }
          previewState={previewState}
        />

        <DisputeResolvedBanner dispute={order.dispute} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <div className="lg:hidden">
              <ShippingAddressCard shippingAddress={creator.shippingAddress} />
            </div>

            {order.dispatchedAt ? (
              <InprogressShippingCard
                courierPartner={(order as any).courierName}
                trackingId={(order as any).trackingId}
                shippedAt={order.dispatchedAt}
                productReceivedAt={(order as any).productReceivedAt}
              />
            ) : (
              <ShippingDetailsCard orderId={orderId} />
            )}

            <OrderSummaryCard order={order} creator={creator} />

            {order.hasBrief && brief ? (
              <BriefSummaryCard order={order} brief={brief} briefId={briefId} />
            ) : null}
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4">
            <div className="hidden lg:block">
              <ShippingAddressCard shippingAddress={creator.shippingAddress} />
            </div>
            <OrderActivityTimeline order={order} />
          </aside>
        </div>
      </div>
    );
  }

  if (showCompletedUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader
          orderId={orderId}
          paidAt={order.paidAt}
          completedAt={order.acceptedAt || order.createdAt}
          order={order}
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
            <div id={ORDER_REVIEW_SECTION_ID} className="scroll-mt-24">
              <ShareExperienceCard
                order={order}
                creatorName={creator?.displayName}
              />
            </div>
            <UsageRightsCard orderId={orderId} order={order} />
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 items-start">
          <OrderSummaryCard order={order} creator={creator} />

          {order.hasBrief && brief ? (
            <BriefSummaryCard order={order} brief={brief} briefId={briefId} />
          ) : null}
        </div>
      </div>
    );
  }

  if (showDeliveredUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader
          orderId={orderId}
          paidAt={order.paidAt}
          order={order}
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

        <DeliveredVideosCard
          orderId={orderId}
          order={order}
          creatorName={creator?.displayName || "Creator"}
          sidebar={
            <YourActionRequiredCard
              order={order}
              orderId={orderId}
              previewPreparing={previewGenerating}
              creatorName={creator?.displayName || "Creator"}
              isRevision={isRevision}
            />
          }
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <OrderSummaryCard order={order} creator={creator} />

            {order.hasBrief && brief ? (
              <BriefSummaryCard order={order} brief={brief} briefId={briefId} />
            ) : null}
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4">
            <div className="hidden lg:block">
              <OrderChatWidget orderId={orderId} role="brand" creator={creator} />
            </div>
            <OrderActivityTimeline order={order} />
          </aside>
        </div>
      </div>
    );
  }

  if (showInProgressUI) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
        <OrderPageHeader orderId={orderId} paidAt={order.paidAt} order={order} />
        
        <OrderProgressStepper
          order={order}
          onStepClick={(label) => setPreviewState(prev => prev === label ? null : label)}
          previewState={previewState}
        />

        <DisputeResolvedBanner dispute={order.dispute} />

        {order.status === "DISPUTED" ? (
          <OrderStatusBanner order={order} creator={creator} isOrderCompleted={isActuallyCompleted} />
        ) : (
          <InprogressNotificationBanner
            creatorName={creator?.displayName || "Creator"}
            order={order}
            isOrderCompleted={isActuallyCompleted}
          />
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          <div className="flex flex-col gap-5 lg:col-span-8">
            {order.requiresPhysicalProductShipment && (
              <InprogressShippingCard
                courierPartner={(order as any).courierName}
                trackingId={(order as any).trackingId}
                shippedAt={order.dispatchedAt}
                productReceivedAt={(order as any).productReceivedAt}
              />
            )}

            <OrderSummaryCard order={order} creator={creator} />

            {order.hasBrief && brief ? (
              <BriefSummaryCard order={order} brief={brief} briefId={briefId} />
            ) : null}
          </div>

          <aside className="flex flex-col gap-5 lg:col-span-4">
            <OrderChatWidget orderId={orderId} role="brand" creator={creator} />
            <OrderActivityTimeline order={order} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
      <OrderPageHeader
        orderId={orderId}
        paidAt={order.paidAt}
        order={order}
      />

      <OrderProgressStepper
        order={order}
        onStepClick={(label) =>
          setPreviewState((prev) => (prev === label ? null : label))
        }
        previewState={previewState}
      />

      <DisputeResolvedBanner dispute={order.dispute} />

      <OrderStatusBanner
        order={order}
        creator={creator}
        isOrderCompleted={isActuallyCompleted}
      />

      <div
        className={cn(
          "grid grid-cols-1 gap-5 lg:grid-cols-12 items-start",
          isAwaitingPayment && "pointer-events-none select-none opacity-50",
        )}
        aria-disabled={isAwaitingPayment}
      >
        <div className="flex flex-col gap-5 lg:col-span-8">
          <OrderSummaryCard
            order={order}
            creator={creator}
          />

          {order.hasBrief && brief ? (
            <BriefSummaryCard order={order} brief={brief} briefId={briefId} />
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <OrderRatingReviewCard order={order} role="brand" />

          <OrderActivityTimeline order={order} />
        </aside>
      </div>
    </div>
  );
}
