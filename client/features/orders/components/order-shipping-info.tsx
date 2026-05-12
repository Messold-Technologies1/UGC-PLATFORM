"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  RotateCcw,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
  OrderDetailsPublic,
} from "../api/types";
import { useMarkProductReceivedMutation } from "../hooks/use-mark-product-received-mutation";
import { useMarkProductShippedMutation } from "../hooks/use-mark-product-shipped-mutation";

interface OrderShippingInfoProps {
  role?: "brand" | "creator";
  order?: OrderDetailsPublic;
  creator?: OrderCreatorSnapshot;
  brand?: OrderBrandSnapshot;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available yet";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayYmd() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function isValidYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function OrderShippingInfo({
  role = "brand",
  order,
  creator,
  brand,
}: OrderShippingInfoProps) {
  const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [dispatchDate, setDispatchDate] = useState(getTodayYmd);
  const markProductShippedMutation = useMarkProductShippedMutation({
    onSuccess: () => {
      setIsShipmentDialogOpen(false);
      setCourierName("");
      setTrackingId("");
      setDispatchDate(getTodayYmd());
    },
  });
  const markProductReceivedMutation = useMarkProductReceivedMutation({
    onSuccess: () => {
      setIsReceiptDialogOpen(false);
    },
  });

  if (!order) {
    return (
      <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Shipping Information
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                The creator needs the physical product to start filming. Ensure the
                package is dispatched within 48 hours.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button
              variant="outline"
              className="rounded-xl border-border/60 font-semibold shadow-sm"
            >
              Mark as Shipped
            </Button>
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Creator Shipping Address
            </span>
          </div>
          <div className="text-sm font-medium leading-relaxed text-card-foreground">
            Riya Sharma
            <br />
            Apt 4B, Emerald Heights, Linking Road
            <br />
            Mumbai, MH 400050
            <br />
            India
          </div>
        </div>
      </section>
    );
  }

  const partnerLabel = role === "creator" ? "Brand" : "Creator Base";
  const partnerValue =
    role === "creator" ? brand?.brandName || "Brand partner" : creator?.city || "Remote";
  const showShipmentWorkflow = order.requiresPhysicalProductShipment;
  const canMarkProductShipped =
    role === "brand" &&
    showShipmentWorkflow &&
    order.status === "BRIEF_ACCEPTED";
  const canConfirmProductReceived =
    role === "creator" &&
    showShipmentWorkflow &&
    order.status === "PRODUCT_SHIPPED";
  const hasShipmentDetails =
    Boolean(order.dispatchedAt || order.courierName) ||
    ["PRODUCT_SHIPPED", "PRODUCT_RECEIVED"].includes(order.status);
  const hasReceivedProduct =
    Boolean(order.productReceivedAt) || order.status === "PRODUCT_RECEIVED";
  const trimmedCourierName = courierName.trim();
  const trimmedTrackingId = trackingId.trim();
  const todayYmd = getTodayYmd();
  const isFutureDispatchDate =
    isValidYmd(dispatchDate) && dispatchDate > todayYmd;
  const canSubmitShipment =
    trimmedCourierName.length > 0 &&
    trimmedCourierName.length <= 200 &&
    trimmedTrackingId.length <= 200 &&
    isValidYmd(dispatchDate) &&
    !isFutureDispatchDate;
  const isShipmentPending = markProductShippedMutation.isPending;
  const isReceiptPending = markProductReceivedMutation.isPending;

  function handleSubmitShipment() {
    if (!order || !canSubmitShipment || isShipmentPending) return;

    markProductShippedMutation.mutate({
      orderId: order.id,
      courierName: trimmedCourierName,
      trackingId: trimmedTrackingId || undefined,
      dispatchDate,
    });
  }

  function handleConfirmProductReceived() {
    if (!order || !canConfirmProductReceived || isReceiptPending) return;
    markProductReceivedMutation.mutate({ orderId: order.id });
  }

  const shipmentDescription = hasReceivedProduct
    ? "Product receipt has been confirmed for this order."
    : role === "creator" && canConfirmProductReceived
      ? "Confirm receipt once the package has arrived."
      : hasShipmentDetails
        ? "Shipment details have been recorded for this order."
        : canMarkProductShipped
          ? "Mark the product as shipped once it leaves your team."
          : "Shipment can be recorded after the creator accepts the brief.";

  return (
    <>
      <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Order Scope
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Snapshot details captured at checkout for this collaboration.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:w-auto">
            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock3 className="w-3.5 h-3.5" />
                Delivery Window
              </div>
              <p className="mt-2 text-sm font-semibold text-card-foreground">
                {order.deliveryDaysSnapshot} day
                {order.deliveryDaysSnapshot === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" />
                Revisions
              </div>
              <p className="mt-2 text-sm font-semibold text-card-foreground">
                {order.revisionCount} used / {order.maxRevisionsSnapshot} included
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {partnerLabel}
              </div>
              <p className="mt-2 text-sm font-semibold text-card-foreground">
                {partnerValue}
              </p>
            </div>
          </div>
        </div>

        {showShipmentWorkflow ? (
          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/20 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                  {hasShipmentDetails ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Truck className="size-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-card-foreground">
                    Physical Product Shipment
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {shipmentDescription}
                  </p>
                </div>
              </div>

              {role === "brand" && !hasShipmentDetails ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-border/60 font-semibold shadow-sm md:w-auto"
                  disabled={!canMarkProductShipped}
                  onClick={() => setIsShipmentDialogOpen(true)}
                >
                  <Truck className="size-4" />
                  Mark as Shipped
                </Button>
              ) : null}
              {canConfirmProductReceived ? (
                <Button
                  type="button"
                  className="w-full rounded-xl font-bold shadow-sm md:w-auto"
                  disabled={isReceiptPending}
                  onClick={() => setIsReceiptDialogOpen(true)}
                >
                  <CheckCircle2 className="size-4" />
                  Confirm Received
                </Button>
              ) : null}
            </div>

            {hasShipmentDetails ? (
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Courier
                  </dt>
                  <dd className="mt-1 font-semibold text-card-foreground">
                    {order.courierName || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tracking ID
                  </dt>
                  <dd className="mt-1 font-semibold text-card-foreground">
                    {order.trackingId || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Dispatched
                  </dt>
                  <dd className="mt-1 font-semibold text-card-foreground">
                    {formatDate(order.dispatchedAt)}
                  </dd>
                </div>
                {hasReceivedProduct ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Received
                    </dt>
                    <dd className="mt-1 font-semibold text-card-foreground">
                      {formatDate(order.productReceivedAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                Deliverables Snapshot
              </span>
            </div>
            <div className="space-y-2">
              {order.deliverablesSnapshot.length > 0 ? (
                order.deliverablesSnapshot.map((deliverable) => (
                  <div
                    key={deliverable}
                    className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm font-medium text-card-foreground"
                  >
                    {deliverable}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No deliverables snapshot was provided for this order.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Timeline
            </span>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-semibold text-card-foreground">
                  {formatDate(order.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="font-semibold text-card-foreground">
                  {formatDate(order.paidAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Brief submitted</dt>
                <dd className="font-semibold text-card-foreground">
                  {formatDate(order.briefSubmittedAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Brief accepted</dt>
                <dd className="font-semibold text-card-foreground">
                  {formatDate(order.briefAcceptedAt)}
                </dd>
              </div>
              {showShipmentWorkflow ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Product shipped</dt>
                    <dd className="font-semibold text-card-foreground">
                      {formatDate(order.dispatchedAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Product received</dt>
                    <dd className="font-semibold text-card-foreground">
                      {formatDate(order.productReceivedAt)}
                    </dd>
                  </div>
                </>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Target deadline</dt>
                <dd className="font-semibold text-card-foreground">
                  {formatDate(order.deliveryDeadlineAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <Dialog
        open={isShipmentDialogOpen}
        onOpenChange={(open) => {
          if (isShipmentPending) return;
          setIsShipmentDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Product Shipped</DialogTitle>
            <DialogDescription>
              Record the courier details once the physical product has been
              dispatched to the creator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courierName">Courier name</Label>
              <Input
                id="courierName"
                value={courierName}
                onChange={(event) => setCourierName(event.target.value)}
                maxLength={200}
                placeholder="BlueDart"
                disabled={isShipmentPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingId">Tracking ID</Label>
              <Input
                id="trackingId"
                value={trackingId}
                onChange={(event) => setTrackingId(event.target.value)}
                maxLength={200}
                placeholder="AWB123456789"
                disabled={isShipmentPending}
              />
              <p className="text-xs text-muted-foreground">Optional but recommended.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispatchDate">Dispatch date</Label>
              <Input
                id="dispatchDate"
                type="date"
                value={dispatchDate}
                max={todayYmd}
                onChange={(event) => setDispatchDate(event.target.value)}
                disabled={isShipmentPending}
              />
              {isFutureDispatchDate ? (
                <p className="text-xs text-destructive">
                  Dispatch date cannot be in the future.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isShipmentPending}
              onClick={() => setIsShipmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl font-bold"
              disabled={!canSubmitShipment || isShipmentPending}
              onClick={handleSubmitShipment}
            >
              {isShipmentPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Saving...
                </>
              ) : (
                <>
                  <Truck className="size-4" />
                  Mark Shipped
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReceiptDialogOpen}
        onOpenChange={(open) => {
          if (isReceiptPending) return;
          setIsReceiptDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Product Received</DialogTitle>
            <DialogDescription>
              Confirm that the physical product has arrived. Delivery uploads
              will open after receipt is confirmed.
            </DialogDescription>
          </DialogHeader>

          {hasShipmentDetails ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <dl className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Courier</dt>
                  <dd className="font-semibold text-foreground">
                    {order.courierName || "Not available"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Tracking ID</dt>
                  <dd className="font-semibold text-foreground">
                    {order.trackingId || "Not provided"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Dispatched</dt>
                  <dd className="font-semibold text-foreground">
                    {formatDate(order.dispatchedAt)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isReceiptPending}
              onClick={() => setIsReceiptDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl font-bold"
              disabled={!canConfirmProductReceived || isReceiptPending}
              onClick={handleConfirmProductReceived}
            >
              {isReceiptPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Confirm Received
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
