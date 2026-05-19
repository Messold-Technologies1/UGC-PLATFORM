"use client";

// import { useState } from "react";
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
// import { useOpenBrandDisputeMutation } from "@/features/orders/hooks/use-open-brand-dispute-mutation";
import { useGetBrandOrderDetailsQuery } from "../hooks/use-get-brand-order-details-query";
import { OrderRatingReviewCard } from "./order-rating-review-card";
import {
  BriefSummaryCard,
  CreatorAcceptanceCard,
  CreatorProfileCard,
  NeedHelpCard,
  OrderActivityTimeline,
  OrderDetailsCard,
  OrderPageHeader,
  OrderProgressStepper,
  OrderStatusBanner,
  OrderSummaryCard,
  TipsCard,
} from "./brand-order-detail";

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

  // const [isDisputeDrawerOpen, setIsDisputeDrawerOpen] = useState(false);
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
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
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
  // }

  return (
    <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
      <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />

      <OrderProgressStepper order={order} />

      <OrderStatusBanner order={order} creator={creator} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <CreatorProfileCard creator={creator} order={order} />

          <OrderSummaryCard
            order={order}
            orderId={orderId}
            briefId={briefId}
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
