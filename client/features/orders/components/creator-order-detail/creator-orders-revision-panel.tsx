"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  FileVideo,
  MessageSquare,
  Play,
  Upload,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OrderChatWidget } from "../order-chat-widget";
import { useGetBrandOrderDeliveriesQuery } from "../../hooks/use-get-brand-order-deliveries-query";
import { useSubmitDeliveryFlowMutation } from "../../hooks/use-submit-delivery-flow-mutation";
import { OrderProgressStepper, type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";

interface CreatorOrderRevisionPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
  previewStepId?: string | null;
  onStepClick?: (id: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  accepted: "Accepted",
  product_received: "Product Received",
  in_progress: "In Progress",
  revision_requested: "Revision Requested",
  delivered: "Delivered",
  completed: "Completed",
};

const MAX_FILE_SIZE_MB = 250;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1_000_000;

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

function fmtDateTime(val?: string | null): string | null {
  if (!val) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(val));
  } catch {
    return null;
  }
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

function isSupportedFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|mp4|mov|webm)$/i.test(file.name)
  );
}

function buildRevisionSteps(order: any): StepDef[] {
  const ids = [
    "accepted",
    "product_received",
    "in_progress",
    "revision_requested",
    "delivered",
    "completed",
  ];

  const dates: Record<string, string | null | undefined> = {
    accepted: order?.briefAcceptedAt,
    product_received: order?.productReceivedAt ?? order?.briefAcceptedAt,
    in_progress: order?.productReceivedAt ?? order?.briefAcceptedAt,
    revision_requested: order?.updatedAt,
    delivered: order?.deliveredAt,
    completed: order?.acceptedAt ?? order?.creatorPaidAt,
  };

  const currentIdx = ids.indexOf("revision_requested");

  return ids.map((id, i) => ({
    id,
    label: STEP_LABELS[id],
    status: (i < currentIdx
      ? "completed"
      : i === currentIdx
        ? "revision"
        : "pending") as StepDef["status"],
    date: dates[id] ?? null,
  }));
}


function RevisionNotesCard({ order }: { order: any }) {
  const revisionNotes = useMemo(() => {
    if (order?.revisionNotes && Array.isArray(order.revisionNotes)) {
      return order.revisionNotes as string[];
    }
    if (order?.revisionNote && typeof order.revisionNote === "string") {
      return order.revisionNote
        .split(/\n/)
        .map((s: string) => s.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);
    }
    return [
      "Please review the brand's feedback in the chat and make the requested changes.",
    ];
  }, [order]);

  const requestedDate = fmtDateTime(order?.updatedAt);

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Revision Notes</h3>

      <p className="text-sm text-muted-foreground mb-3">
        Please make the following changes:
      </p>

      <ol className="space-y-2.5 text-sm list-decimal list-inside">
        {revisionNotes.map((note: string, idx: number) => (
          <li key={idx} className="text-foreground/80 leading-relaxed pl-0.5">
            {note}
          </li>
        ))}
      </ol>

      {requestedDate && (
        <p className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          Requested on {requestedDate}
        </p>
      )}
    </div>
  );
}

function PreviousSubmissionCard({ orderId }: { orderId: string }) {
  const { data: deliveriesData, isLoading } = useGetBrandOrderDeliveriesQuery(
    orderId,
    {
      enabled: Boolean(orderId),
    },
  );

  const latestDelivery = deliveriesData?.items?.at(-1);
  const videoAsset = latestDelivery?.assets?.find((a) => a.kind === "video");
  const submittedDate = fmtDateTime(latestDelivery?.createdAt);
  const versionLabel = `Version ${(latestDelivery?.revisionsUsed ?? 0) + 1}`;

  if (isLoading) {
    return (
      <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
        <h3 className="font-bold text-sm mb-4">Your Previous Submission</h3>
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Your Previous Submission</h3>

      {videoAsset ? (
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/5 border border-border/40">
            <video
              src={videoAsset.url}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-foreground ml-0.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {versionLabel} (Submitted)
              </p>
              {submittedDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submitted on {submittedDate}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
            asChild
          >
            <a href={videoAsset.url} target="_blank" rel="noreferrer">
              <Play className="w-3.5 h-3.5" />
              Re-watch
            </a>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
            <FileVideo className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            No previous submission found.
          </p>
        </div>
      )}
    </div>
  );
}

function UploadRevisedVideoCard({ orderId }: { orderId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMutation = useSubmitDeliveryFlowMutation();
  const isUploading = submitMutation.isPending;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const validFiles = fileArr.filter(isSupportedFile);

      if (validFiles.length === 0) {
        toast.error("Please upload valid video or image files.");
        return;
      }

      if (validFiles.some((f) => f.size > MAX_FILE_SIZE_BYTES)) {
        toast.error(`Each file must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
        return;
      }

      submitMutation.mutate({ orderId, files: validFiles });
    },
    [orderId, submitMutation],
  );

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    handleFiles(fileList);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Upload Revised Video</h3>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*,image/*"
        multiple
        onChange={handleFileSelect}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg transition-all duration-200 text-center cursor-pointer",
          isDragOver
            ? "border-[#4318FF] bg-[#4318FF]/5"
            : "border-border/60 hover:border-[#4318FF]/40 hover:bg-muted/30",
          isUploading && "opacity-60 pointer-events-none",
        )}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner className="w-8 h-8 text-[#4318FF]" />
            <p className="text-sm font-semibold text-foreground">
              Uploading...
            </p>
            <p className="text-xs text-muted-foreground">
              Please wait while your file is being uploaded.
            </p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-lg bg-[#4318FF]/10 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-[#4318FF]" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Drag & drop your video here
            </p>
            <p className="text-xs text-muted-foreground mb-4">or</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
            >
              Choose File
            </Button>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        Max file size: {MAX_FILE_SIZE_MB} MB • MP4 recommended
      </p>
    </div>
  );
}

export function CreatorOrderRevisionPanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
  previewStepId,
  onStepClick,
}: CreatorOrderRevisionPanelProps) {
  const chatRef = useRef<HTMLDivElement>(null);

  const order = detailsData?.order ?? selectedItem?.order;

  const steps = useMemo(() => buildRevisionSteps(order), [order]);

  const expectedAmount = detailsData?.order?.expectedAmountPaise
    ? detailsData.order.expectedAmountPaise / 100
    : selectedItem?.order?.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

  function handleContactBrand() {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!selectedItem) return null;

  return (
    <CreatorOrderPanelLayout
      selectedOrderId={selectedOrderId}
      selectedItem={selectedItem}
      isLoading={isLoading}
      onClose={onClose}
      statusBadgeLabel="Revision Requested"
      statusBadgeColor="bg-orange-500/10 text-orange-600 border-orange-500/20"
      payoutAmountDisplay={new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(expectedAmount)}
      payoutLabelDisplay="Est. Payout"
      steps={steps}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        <RevisionNotesCard order={order} />
        <PreviousSubmissionCard orderId={selectedOrderId} />
        <UploadRevisedVideoCard orderId={selectedOrderId} />
      </div>
    </CreatorOrderPanelLayout>
  );
}
