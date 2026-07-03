"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, FileVideo, Package, Truck, Upload } from "lucide-react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
// import { OrderChatWidget } from "../order-chat-widget";
import { useMarkProductReceivedMutation } from "../../hooks/use-mark-product-received-mutation";
import { useSubmitDeliveryFlowMutation } from "../../hooks/use-submit-delivery-flow-mutation";
import { OrderProgressStepper, type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";
import { CreatorDeliveryAssetsCard } from "./creator-delivery-assets-card";
import { DeliveryDeadlineDisplay } from "../delivery-deadline-display";

const activeUploadsCache: Record<string, File[]> = {};

interface CreatorOrderActivePanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
  previewStepId?: string | null;
  onStepClick?: (id: string) => void;
  isOrderCompleted?: boolean;
}

const STEP_LABELS: Record<string, string> = {
  accepted: "Accepted",
  awaiting_shipment: "Awaiting Shipment",
  product_received: "Product Received",
  in_progress: "In Progress",
  delivered: "Delivered",
  completed: "Completed",
};

const QUICK_TIPS = [
  "Hook viewers in the first 3 seconds",
  "Show the product in real use",
  "Mention key benefits clearly",
  "Keep it natural and authentic",
  "Follow the brand guidelines",
];

function fmtDate(val?: string | null): string {
  if (!val) return "TBD";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(val));
  } catch {
    return "TBD";
  }
}

function resolveCurrentStep(status: string, ship: boolean): string {
  if (!ship) return "in_progress";
  switch (status) {
    case "BRIEF_ACCEPTED":
    case "PRODUCT_SHIPPED":
      return "awaiting_shipment";
    case "PRODUCT_RECEIVED":
      return "in_progress";
    default:
      return "in_progress";
  }
}

function buildSteps(
  status: string,
  ship: boolean,
  order: any,
  brief: any,
): StepDef[] {
  const ids = ship
    ? [
        "accepted",
        "awaiting_shipment",
        "product_received",
        "in_progress",
        "delivered",
        "completed",
      ]
    : ["accepted", "in_progress", "delivered", "completed"];

  const cur = resolveCurrentStep(status, ship);
  const curIdx = ids.indexOf(cur);

  const dates: Record<string, string | null | undefined> = {
    accepted: brief?.briefAcceptedAt ?? order?.briefAcceptedAt,
    awaiting_shipment: order?.dispatchedAt,
    product_received: order?.productReceivedAt,
    in_progress: order?.productReceivedAt ?? order?.briefAcceptedAt,
    delivered: order?.deliveredAt,
    completed: order?.acceptedAt ?? order?.creatorPaidAt,
  };

  return ids.map((id, i) => ({
    id,
    label: STEP_LABELS[id],
    status: (i < curIdx
      ? "completed"
      : i === curIdx
        ? "current"
        : "pending") as StepDef["status"],
    date: dates[id] ?? null,
  }));
}

function fmtEnum(val?: string | string[] | null): string {
  if (!val) return "N/A";
  const arr = Array.isArray(val) ? val : [val];
  if (arr.length === 0) return "N/A";
  return arr
    .map((s) =>
      s
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" "),
    )
    .join(", ");
}

function getActiveStatusLabel(status: string, ship: boolean): string {
  if (!ship) return "In Progress";
  switch (status) {
    case "BRIEF_ACCEPTED":
    case "PRODUCT_SHIPPED":
      return "Awaiting Shipment";
    case "PRODUCT_RECEIVED":
      return "In Progress";
    default:
      return "In Progress";
  }
}

function getActiveStatusColor(status: string, ship: boolean): string {
  const label = getActiveStatusLabel(status, ship);
  if (label === "Awaiting Shipment")
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-[#4318FF]/10 text-[#4318FF] border-[#4318FF]/20";
}

function isSupportedFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|mp4|mov|webm)$/i.test(file.name)
  );
}



function OrderSummaryCard({
  briefData,
  order,
  selectedItem,
  selectedOrderId,
}: {
  briefData: any;
  order: any;
  selectedItem: any;
  selectedOrderId: string;
}) {
  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Order Summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Video Type</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.contentType?.length
              ? fmtEnum(briefData.brief.contentType)
              : selectedItem.order.packageNameSnapshot || "Not specified"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Key Points</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.keyNoteToInclude ? "Included in Brief" : "None"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Language</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.language || "Not specified"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Tone</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.toneStyle?.length
              ? fmtEnum(briefData.brief.toneStyle)
              : "Not specified"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Deliverables</span>
          <div className="sm:text-right">
            <span className="font-medium text-foreground block">
              1 {selectedItem.order.packageNameSnapshot || "Deliverable"}
            </span>
            <span className="text-xs text-muted-foreground">
              9:16 Aspect Ratio
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 pt-1 mt-auto">
          <span className="text-muted-foreground shrink-0">Due Date</span>
          <DeliveryDeadlineDisplay
            order={order}
            dateClassName="font-medium text-foreground"
          />
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full mt-4 rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
        asChild
      >
        <Link href={`/creator/orders/${selectedOrderId}/brief`}>
          View Full Brief
        </Link>
      </Button>
    </div>
  );
}

function AwaitingShipmentContent({
  order,
  selectedOrderId,
  isCurrentStep,
  briefData,
  selectedItem,
  isOrderCompleted = false,
}: {
  order: any;
  selectedOrderId: string;
  isCurrentStep: boolean;
  briefData: any;
  selectedItem: any;
  isOrderCompleted?: boolean;
}) {
  const markReceivedMutation = useMarkProductReceivedMutation({
    onSuccess: () => {
      toast.success(
        "Product marked as received! You can now start creating content.",
      );
    },
  });

  const hasShippingDetails = Boolean(order?.dispatchedAt || order?.courierName);
  const canMarkReceived = isCurrentStep && order?.status === "PRODUCT_SHIPPED";
  const isPending = markReceivedMutation.isPending;

  function handleCopyTrackingId() {
    if (order?.trackingId) {
      navigator.clipboard.writeText(order.trackingId);
      toast.success("Tracking ID copied to clipboard!");
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
      <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
        <h3 className="font-bold text-sm mb-4">Shipping Details</h3>

        {hasShippingDetails ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Courier Partner</span>
              <span className="font-medium">{order.courierName || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tracking ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium font-mono text-xs truncate max-w-[120px]">
                  {order.trackingId || "N/A"}
                </span>
                {order.trackingId && (
                  <button
                    type="button"
                    onClick={handleCopyTrackingId}
                    className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="Copy tracking ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipped On</span>
              <span className="font-medium">{fmtDate(order.dispatchedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ETA</span>
              <DeliveryDeadlineDisplay
                order={order}
                dateClassName="font-medium"
                showBadge={false}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
              <Truck className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Waiting for the brand to ship the product to your address.
            </p>
          </div>
        )}


        {canMarkReceived && !isOrderCompleted && (
          <Button
            className="w-full mt-3 rounded-lg h-10 font-bold bg-[#22c55e] hover:bg-[#22c55e]/90 text-white shadow-sm"
            disabled={isPending}
            onClick={() =>
              markReceivedMutation.mutate({ orderId: selectedOrderId })
            }
          >
            {isPending ? (
              <>
                <Spinner className="w-4 h-4" aria-hidden />
                Confirming...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Mark Product Received
              </>
            )}
          </Button>
        )}

        {isOrderCompleted && (
          <div className="flex items-center gap-2.5 mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Product was received and this stage is complete.
            </p>
          </div>
        )}
      </div>

      <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm flex flex-col">
        <h3 className="font-bold text-sm mb-4">What&apos;s Next?</h3>
        <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
          <div className="w-14 h-14 rounded-lg bg-[#4318FF]/10 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-[#4318FF]" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Once you receive the product
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
            Check the product and mark it as received to start creating your
            content.
          </p>
        </div>
      </div>

      <OrderSummaryCard
        briefData={briefData}
        order={order}
        selectedItem={selectedItem}
        selectedOrderId={selectedOrderId}
      />
    </div>
  );
}

function InProgressContent({
  order,
  selectedOrderId,
  isCurrentStep,
  briefData,
  selectedItem,
  isOrderCompleted = false,
}: {
  order: any;
  selectedOrderId: string;
  isCurrentStep: boolean;
  briefData: any;
  selectedItem: any;
  isOrderCompleted?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMutation = useSubmitDeliveryFlowMutation();
  const isUploading = submitMutation.isPending;

  const [pendingUpload, setPendingUpload] = useState<{
    files: File[];
  } | null>(
    activeUploadsCache[selectedOrderId] ? { files: activeUploadsCache[selectedOrderId] } : null
  );

  const [previewAssets, setPreviewAssets] = useState<CarouselAsset[]>([]);

  useEffect(() => {
    if (!pendingUpload || pendingUpload.files.length === 0) {
      setPreviewAssets([]);
      return;
    }
    const assets = pendingUpload.files.map((file, i) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      return {
        id: `local-${i}-${file.name}`,
        type: isVideo ? "video" : "image",
        full: url,
        thumb: url,
      } as CarouselAsset;
    });
    setPreviewAssets(assets);

    return () => {
      assets.forEach((a) => URL.revokeObjectURL(a.full));
    };
  }, [pendingUpload]);

  const timelineOrder = order;

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0 || !isCurrentStep) return;

    const validFiles = Array.from(fileList).filter(isSupportedFile);

    if (validFiles.length === 0) {
      toast.error("Please upload valid video or image files.");
      return;
    }

    if (validFiles.some((f) => f.size > 250_000_000)) {
      toast.error("Each file must be 250 MB or smaller.");
      return;
    }

    activeUploadsCache[selectedOrderId] = validFiles;
    setPendingUpload({ files: validFiles });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleConfirmUpload() {
    if (!pendingUpload) return;
    submitMutation.mutate(
      { orderId: selectedOrderId, files: pendingUpload.files },
      {
        onSuccess: () => {
          delete activeUploadsCache[selectedOrderId];
          setPendingUpload(null);
          toast.success("Files uploaded successfully!");
        },
      },
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
      <CreatorDeliveryAssetsCard
        orderId={selectedOrderId}
        title="Your Progress"
        emptyLabel="No files uploaded yet."
        hideEmptyState={Boolean(pendingUpload)}
        action={
          <div className="mt-auto">
            {isCurrentStep && !isOrderCompleted && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="video/*,image/*"
                  multiple
                  onChange={handleFileSelect}
                />

                {pendingUpload ? (
                  <div className="mt-4 p-4 rounded-lg border border-border/50 bg-muted/30 space-y-3 text-sm">
                    {previewAssets.length > 0 && (
                      <ThumbnailsCarousel
                        assets={previewAssets}
                        itemGroupClassName="aspect-auto h-36 rounded-lg"
                      />
                    )}
                    <div className="font-medium text-foreground">
                      Ready to upload {pendingUpload.files.length} file(s)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-9 rounded-lg border-border/50"
                        disabled={isUploading}
                        onClick={() => {
                          delete activeUploadsCache[selectedOrderId];
                          setPendingUpload(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-9 rounded-lg font-bold bg-[#22c55e] hover:bg-[#22c55e]/90 text-white shadow-sm"
                        disabled={isUploading}
                        onClick={handleConfirmUpload}
                      >
                        {isUploading ? (
                          <>
                            <Spinner className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Confirm Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full mt-4 rounded-lg h-10 font-bold bg-[#22c55e] hover:bg-[#22c55e]/90 text-white shadow-sm gap-1.5"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Select Content
                  </Button>
                )}
              </>
            )}

            {isOrderCompleted && (
              <div className="flex items-center gap-2.5 mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Content was delivered and approved by the brand.
                </p>
              </div>
            )}

            <div className={cn("flex items-center justify-between", isCurrentStep ? "mt-4 pt-4 border-t border-border/40" : "mt-4 pt-4 border-t border-border/40")}>
              <span className="text-sm text-muted-foreground">Due Date</span>
              <DeliveryDeadlineDisplay
                order={timelineOrder}
                dateClassName="text-sm font-semibold"
              />
            </div>
          </div>
        }
      />

      <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
        <h3 className="font-bold text-sm mb-4">Quick Tips</h3>
        <ul className="space-y-3">
          {QUICK_TIPS.map((tip) => (
            <li key={tip} className="flex items-start gap-2.5 text-sm">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-[#22c55e]" />
              </div>
              <span className="text-foreground/80 leading-snug">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <OrderSummaryCard
        briefData={briefData}
        order={order}
        selectedItem={selectedItem}
        selectedOrderId={selectedOrderId}
      />
    </div>
  );
}

export function CreatorOrderActivePanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
  previewStepId,
  onStepClick,
  isOrderCompleted = false,
}: CreatorOrderActivePanelProps) {
  const order = detailsData?.order ?? selectedItem?.order;
  const requiresShip = Boolean(
    briefData?.brief?.willShipPhysicalProductToCreator ??
    selectedItem?.order?.requiresPhysicalProductShipment,
  );
  const orderStatus = (selectedItem?.order?.status as string) || "";

  const steps = useMemo(
    () => buildSteps(orderStatus, requiresShip, order, briefData),
    [orderStatus, requiresShip, order, briefData],
  );

  const currentStepId = useMemo(
    () => resolveCurrentStep(orderStatus, requiresShip),
    [orderStatus, requiresShip],
  );

  const [viewingStepId, setViewingStepId] = useState(currentStepId);

  useEffect(() => {
    setViewingStepId(resolveCurrentStep(orderStatus, requiresShip));
  }, [selectedOrderId, orderStatus, requiresShip]);

  const effectiveViewingStepId = useMemo(() => {
    if (previewStepId && steps.some((s) => s.id === previewStepId)) {
      return previewStepId;
    }
    if (steps.some((s) => s.id === viewingStepId)) return viewingStepId;
    return currentStepId;
  }, [steps, viewingStepId, currentStepId, previewStepId]);

  const isViewingCurrentStep = effectiveViewingStepId === currentStepId;

  const statusLabel = getActiveStatusLabel(orderStatus, requiresShip);
  const statusColor = getActiveStatusColor(orderStatus, requiresShip);

  const expectedAmount = detailsData?.order?.expectedAmountPaise
    ? detailsData.order.expectedAmountPaise / 100
    : selectedItem?.order?.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

  if (!selectedItem) return null;

  return (
    <CreatorOrderPanelLayout
      selectedOrderId={selectedOrderId}
      selectedItem={selectedItem}
      isLoading={isLoading}
      onClose={onClose}
      statusBadgeLabel={statusLabel}
      statusBadgeColor={statusColor}
      expectedAmount={expectedAmount}
      steps={steps}
      viewingStepId={
        isViewingCurrentStep ? currentStepId : effectiveViewingStepId
      }
    >
      {(effectiveViewingStepId === "awaiting_shipment" ||
        effectiveViewingStepId === "product_received") && (
        <AwaitingShipmentContent
          order={order}
          selectedOrderId={selectedOrderId}
          isCurrentStep={isViewingCurrentStep}
          briefData={briefData}
          selectedItem={selectedItem}
          isOrderCompleted={isOrderCompleted}
        />
      )}

      {effectiveViewingStepId === "in_progress" && (
        <InProgressContent
          order={order}
          selectedOrderId={selectedOrderId}
          isCurrentStep={isViewingCurrentStep}
          briefData={briefData}
          selectedItem={selectedItem}
          isOrderCompleted={isOrderCompleted}
        />
      )}

      {effectiveViewingStepId === "accepted" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
          <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm xl:col-span-1 2xl:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Order Accepted
                </h3>
                <p className="text-xs text-muted-foreground">
                  Brief was accepted on{" "}
                  {fmtDate(
                    briefData?.briefAcceptedAt || order?.briefAcceptedAt,
                  )}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You accepted this order and the brief. The order has progressed to
              the next stage in the workflow.
            </p>
          </div>
          <OrderSummaryCard
            briefData={briefData}
            order={order}
            selectedItem={selectedItem}
            selectedOrderId={selectedOrderId}
          />
        </div>
      )}
    </CreatorOrderPanelLayout>
  );
}
