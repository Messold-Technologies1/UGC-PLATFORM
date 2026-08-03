"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubmitDeliveryFlowMutation } from "../../hooks/use-submit-delivery-flow-mutation";
import type { OrderCurrentRevision } from "../../api/types";
import { OrderProgressStepper, type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";
import { CreatorDeliveryAssetsCard } from "./creator-delivery-assets-card";

interface CreatorOrderRevisionPanelProps {
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
  product_received: "Product Received",
  in_progress: "In Progress",
  revision_requested: "Revision Requested",
  delivered: "Delivered",
  completed: "Completed",
};

const MAX_FILE_SIZE_MB = 250;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1_000_000;
const revisionUploadsCache: Record<string, File[]> = {};

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

function RevisionNotesCard({
  currentRevision,
  isLoading,
  orderId,
}: {
  currentRevision?: OrderCurrentRevision | null;
  isLoading?: boolean;
  orderId: string;
}) {
  const { revisionNotes, requestedDate, isEmptyNote } = useMemo(() => {
    const noteText = currentRevision?.note?.trim();
    
    
    const isStaticFallback = noteText === "Please review the brand's feedback in the chat and make the requested changes.";
    
    const notes = (noteText && !isStaticFallback)
      ? noteText
          .split(/\n/)
          .map((line) => line.replace(/^\d+\.\s*/, "").trim())
          .filter(Boolean)
      : [];

    return {
      revisionNotes: notes,
      requestedDate: fmtDateTime(currentRevision?.requestedAt),
      isEmptyNote: !noteText || isStaticFallback || notes.length === 0,
    };
  }, [currentRevision]);

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Revision Notes</h3>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : isEmptyNote ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border border-dashed border-border/60 rounded-lg bg-slate-50/50 my-2">
          <p className="text-sm text-muted-foreground">
            No revision notes provided.
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}

      {requestedDate && (
        <p className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          Requested on {requestedDate}
        </p>
      )}

      <div className="mt-auto pt-4">
        <Button
          variant="outline"
          className="w-full rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
          asChild
        >
          <Link href={`/creator/orders/${orderId}/brief`}>
            View Full Brief
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PreviousSubmissionCard({ orderId }: { orderId: string }) {
  return (
    <CreatorDeliveryAssetsCard
      orderId={orderId}
      title="Your Previous Submission"
      emptyLabel="No previous submission found."
    />
  );
}

function UploadRevisedVideoCard({ orderId }: { orderId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMutation = useSubmitDeliveryFlowMutation();
  const isUploading = submitMutation.isPending;
  const [isDragOver, setIsDragOver] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");
  const [pendingUpload, setPendingUpload] = useState<{ files: File[] } | null>(
    revisionUploadsCache[orderId] ? { files: revisionUploadsCache[orderId] } : null
  );
  const [previewAssets, setPreviewAssets] = useState<CarouselAsset[]>([]);

  useEffect(() => {
    if (!pendingUpload || pendingUpload.files.length === 0) {
      setPreviewAssets([]);
      return;
    }

    const assets = pendingUpload.files.map((file, index) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      return {
        id: `local-${index}-${file.name}`,
        type: isVideo ? "video" : "image",
        full: url,
        thumb: url,
      } as CarouselAsset;
    });
    setPreviewAssets(assets);

    return () => {
      assets.forEach((asset) => URL.revokeObjectURL(asset.full));
    };
  }, [pendingUpload]);

  const stageFiles = useCallback((files: FileList | File[]) => {
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

    revisionUploadsCache[orderId] = validFiles;
    setPendingUpload({ files: validFiles });
  }, []);

  function handleConfirmUpload() {
    if (!pendingUpload) return;

    const note = submissionNote.trim() || undefined;
    submitMutation.mutate(
      { orderId, files: pendingUpload.files, note },
      {
        onSuccess: () => {
          delete revisionUploadsCache[orderId];
          setPendingUpload(null);
          setSubmissionNote("");
          toast.success("Revision uploaded successfully!");
        },
      },
    );
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    stageFiles(fileList);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
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
    if (isUploading) return;
    if (e.dataTransfer.files.length > 0) {
      stageFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Upload Revised Video</h3>

      <div className="mb-4 space-y-2">
        <label
          htmlFor={`revision-submission-note-${orderId}`}
          className="text-[11px] font-bold uppercase tracking-wide text-foreground"
        >
          Notes for the brand{" "}
          <span className="font-normal normal-case text-muted-foreground">
            (optional)
          </span>
        </label>
        <Textarea
          id={`revision-submission-note-${orderId}`}
          placeholder="Summarize what you changed in this revision..."
          className="min-h-20 resize-y rounded-lg border-border/50 bg-background p-3 text-xs shadow-none"
          value={submissionNote}
          onChange={(event) => setSubmissionNote(event.target.value)}
          disabled={isUploading}
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*,image/*"
        multiple
        onChange={handleFileSelect}
      />

      {pendingUpload ? (
        <div className="flex flex-1 flex-col rounded-lg border border-border/50 bg-muted/30 p-4">
          {previewAssets.length > 0 && (
            <ThumbnailsCarousel
              assets={previewAssets}
              itemGroupClassName="aspect-auto h-36 rounded-lg"
            />
          )}
          <p className="mt-3 text-sm font-medium text-foreground">
            Ready to upload {pendingUpload.files.length} file
            {pendingUpload.files.length === 1 ? "" : "s"}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 rounded-lg border-border/50"
              disabled={isUploading}
              onClick={() => {
                delete revisionUploadsCache[orderId];
                setPendingUpload(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 flex-1 rounded-lg bg-[#22c55e] font-bold text-white shadow-sm hover:bg-[#22c55e]/90"
              disabled={isUploading}
              onClick={handleConfirmUpload}
            >
              {isUploading ? (
                <>
                  <Spinner className="mr-1.5 size-3.5" aria-hidden />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-3.5" />
                  Confirm Upload
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-all duration-200",
            isDragOver
              ? "border-[#4318FF] bg-[#4318FF]/5"
              : "border-border/60 hover:border-[#4318FF]/40 hover:bg-muted/30",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#4318FF]/10">
            <Upload className="h-6 w-6 text-[#4318FF]" />
          </div>
          <p className="mb-1 text-sm font-semibold text-foreground">
            Drag & drop your video here
          </p>
          <p className="mb-4 text-xs text-muted-foreground">or</p>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-border/50 text-xs font-semibold"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Choose File
          </Button>
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Max file size: {MAX_FILE_SIZE_MB} MB • MP4 recommended
      </p>
    </div>
  );
}

function RevisionApprovedCard() {
  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col justify-center items-center text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="font-bold text-sm mb-2">Revision Approved</h3>
      <p className="text-sm text-muted-foreground">
        The brand has approved your revised content. This stage is now complete.
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
  isOrderCompleted = false,
}: CreatorOrderRevisionPanelProps) {
  const chatRef = useRef<HTMLDivElement>(null);

  const order = detailsData?.order ?? selectedItem?.order;

  const steps = useMemo(() => buildRevisionSteps(order), [order]);

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
      statusBadgeLabel="Revision Requested"
      statusBadgeColor="bg-orange-500/10 text-orange-600 border-orange-500/20"
      payoutAmountDisplay={new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(expectedAmount)}
      payoutLabelDisplay="Est. Payout"
      steps={steps}
      dispute={detailsData?.order?.dispute}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        <RevisionNotesCard
          currentRevision={order?.currentRevision}
          isLoading={isLoading}
          orderId={selectedOrderId}
        />
        <PreviousSubmissionCard orderId={selectedOrderId} />
        {isOrderCompleted ? (
          <RevisionApprovedCard />
        ) : (
          <UploadRevisedVideoCard orderId={selectedOrderId} />
        )}
      </div>
    </CreatorOrderPanelLayout>
  );
}
