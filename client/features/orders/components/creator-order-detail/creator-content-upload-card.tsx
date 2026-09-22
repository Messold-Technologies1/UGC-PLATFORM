"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileVideo,
  Upload,
  UploadCloud,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubmitDeliveryFlowMutation } from "../../hooks/use-submit-delivery-flow-mutation";
import { useGetCreatorOrderDeliveriesQuery } from "../../hooks/use-get-creator-deliveries-query";
import type { OrderDeliveryAsset } from "../../api/get-brand-order-deliveries";
import type { CreatorDeliveryItem } from "../../api/get-creator-deliveries";

const MAX_FILE_SIZE_MB = 250;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1_000_000;

// Persist a staged (not-yet-confirmed) selection across re-mounts so a stray
// re-render never drops the creator's chosen files before they hit confirm.
const stagedUploadsCache: Record<string, File[]> = {};

interface CreatorContentUploadCardProps {
  orderId: string;
  title: string;
  description?: string;
  /** Whether the uploader is shown (false → read-only history only). */
  canUpload?: boolean;
  /** Show the "notes for the brand" field (used for revisions). */
  withNote?: boolean;
  /** Text shown when no files have been submitted yet. */
  emptyLabel?: string;
  /** Optional content rendered above the uploader (e.g. revision notes). */
  banner?: ReactNode;
  /** Optional content rendered at the very bottom (e.g. due date, status). */
  footer?: ReactNode;
  onUploaded?: () => void;
}

function isSupportedFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|mp4|mov|webm)$/i.test(file.name)
  );
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function revisionLabel(revisionNumber?: number): string {
  if (!revisionNumber) return "Initial delivery";
  return `Revision ${revisionNumber}`;
}

function toCarouselAssets(assets: OrderDeliveryAsset[]): CarouselAsset[] {
  return assets.map((asset) => ({
    id: asset.key,
    type: asset.kind,
    full: asset.url,
    thumb: asset.url,
  }));
}

function SubmittedDeliveryBlock({ delivery }: { delivery: CreatorDeliveryItem }) {
  const assets = delivery.assets ?? [];
  const submittedDate = formatDateTime(delivery.createdAt);
  if (assets.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ThumbnailsCarousel
        assets={toCarouselAssets(assets)}
        className="w-full"
        itemGroupClassName="aspect-auto h-52 rounded-xl sm:h-56"
      />

      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {revisionLabel(delivery.revisionNumber)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {assets.length} file{assets.length === 1 ? "" : "s"}
          {submittedDate && ` • Submitted on ${submittedDate}`}
        </p>
      </div>

      {delivery.note ? (
        <p className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {delivery.note}
        </p>
      ) : null}
    </div>
  );
}

export function CreatorContentUploadCard({
  orderId,
  title,
  description,
  canUpload = false,
  withNote = false,
  emptyLabel = "No content uploaded yet.",
  banner,
  footer,
  onUploaded,
}: Readonly<CreatorContentUploadCardProps>) {
  const { data, isLoading } = useGetCreatorOrderDeliveriesQuery(orderId, {
    enabled: Boolean(orderId),
  });

  const submitMutation = useSubmitDeliveryFlowMutation();
  const isUploading = submitMutation.isPending;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");
  const [pendingUpload, setPendingUpload] = useState<{ files: File[] } | null>(
    stagedUploadsCache[orderId] ? { files: stagedUploadsCache[orderId] } : null,
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

  const stageFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter(isSupportedFile);

      if (validFiles.length === 0) {
        toast.error("Please upload valid video or image files.");
        return;
      }

      if (validFiles.some((f) => f.size > MAX_FILE_SIZE_BYTES)) {
        toast.error(`Each file must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
        return;
      }

      stagedUploadsCache[orderId] = validFiles;
      setPendingUpload({ files: validFiles });
    },
    [orderId],
  );

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

  function handleConfirmUpload() {
    if (!pendingUpload) return;
    const note = withNote ? submissionNote.trim() || undefined : undefined;
    submitMutation.mutate(
      { orderId, files: pendingUpload.files, note },
      {
        onSuccess: () => {
          delete stagedUploadsCache[orderId];
          setPendingUpload(null);
          setSubmissionNote("");
          toast.success("Content uploaded successfully!");
          onUploaded?.();
        },
      },
    );
  }

  const deliveries = [...(data?.items ?? [])]
    .filter((d) => (d.assets ?? []).length > 0)
    .reverse();

  const deliveryList =
    !isLoading && deliveries.length > 0 ? (
      <div
        className={cn(
          canUpload ? "mt-4 border-t border-border/40 pt-4" : "mb-4",
        )}
      >
        {deliveries.length === 1 ? (
          <SubmittedDeliveryBlock delivery={deliveries[0]} />
        ) : (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="w-[78%] shrink-0 snap-start sm:w-[280px]"
              >
                <SubmittedDeliveryBlock delivery={delivery} />
              </div>
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/10 text-[#22c55e]">
          <UploadCloud className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      {banner ? <div className="mb-4">{banner}</div> : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : !canUpload && deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-10 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-muted/50">
            <FileVideo className="size-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : null}

      {!canUpload ? deliveryList : null}

      {canUpload ? (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="video/*,image/*"
            multiple
            onChange={handleFileSelect}
          />

          {pendingUpload ? (
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
              {previewAssets.length > 0 && (
                <ThumbnailsCarousel
                  assets={previewAssets}
                  itemGroupClassName="aspect-auto h-40 rounded-xl"
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
                  className="h-10 flex-1 rounded-xl border-border/50"
                  disabled={isUploading}
                  onClick={() => {
                    delete stagedUploadsCache[orderId];
                    setPendingUpload(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-10 flex-1 rounded-xl bg-[#22c55e] font-bold text-white shadow-sm hover:bg-[#22c55e]/90"
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
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-all duration-200",
                isDragOver
                  ? "border-[#22c55e] bg-[#22c55e]/5"
                  : "border-border/60 hover:border-[#22c55e]/50 hover:bg-muted/30",
                isUploading && "pointer-events-none opacity-60",
              )}
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#22c55e]/10">
                <Upload className="size-6 text-[#22c55e]" />
              </div>
              <p className="mb-1 text-sm font-semibold text-foreground">
                {deliveries.length > 0
                  ? "Drag & drop to add another version"
                  : "Drag & drop your content here"}
              </p>
              <p className="mb-4 text-xs text-muted-foreground">or</p>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl border-border/50 text-xs font-semibold"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Choose Files
              </Button>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Max file size: {MAX_FILE_SIZE_MB} MB • MP4 recommended
              </p>
            </div>
          )}

          {withNote ? (
            <div className="space-y-2">
              <label
                htmlFor={`content-upload-note-${orderId}`}
                className="text-[11px] font-bold uppercase tracking-wide text-foreground"
              >
                Notes for the brand{" "}
                <span className="font-normal normal-case text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Textarea
                id={`content-upload-note-${orderId}`}
                placeholder="Summarize what you changed in this version..."
                className="min-h-20 resize-y rounded-xl border-border/50 bg-background p-3 text-xs shadow-none"
                value={submissionNote}
                onChange={(event) => setSubmissionNote(event.target.value)}
                disabled={isUploading}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {footer ? (
        <div className="mt-4 border-t border-border/40 pt-4">{footer}</div>
      ) : null}

      {canUpload ? deliveryList : null}
    </div>
  );
}
