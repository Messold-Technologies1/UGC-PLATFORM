"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  CloudUpload,
  FileEdit,
  PlayCircle,
  Plus,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderDetailsPublic } from "../api/types";
import { STATUS_COLORS, STATUS_LABELS } from "../constants";

interface OrderDeliveryStatusProps {
  role?: "brand" | "creator";
  order?: OrderDetailsPublic;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrderDeliveryStatus({
  role = "brand",
  order,
}: OrderDeliveryStatusProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<CarouselAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.full));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (validFiles.length === 0) {
      toast.error("Please upload valid image or video files.");
      return;
    }

    setFiles((current) => [...current, ...validFiles]);

    const newPreviews: CarouselAsset[] = validFiles.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      return {
        type: file.type.startsWith("video/") ? "video" : "image",
        full: objectUrl,
        thumb: objectUrl,
        id: Math.random().toString(36).slice(2),
      };
    });

    setPreviews((current) => [...current, ...newPreviews]);
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(Array.from(event.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    URL.revokeObjectURL(previews[index].full);
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setPreviews((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = () => {
    if (files.length === 0) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Delivery submitted successfully. Awaiting brand approval!");
      previews.forEach((preview) => URL.revokeObjectURL(preview.full));
      setFiles([]);
      setPreviews([]);
    }, 2000);
  };

  if (role === "brand" && order) {
    // const canReviewDelivery =
    //   order.status === "DELIVERED" || order.status === "REVISION_SUBMITTED";
    const milestones = [
      {
        label: "Payment captured",
        date: order.paidAt,
        done: Boolean(order.paidAt),
        description: "The order has been paid and confirmed.",
      },
      {
        label: "Brief submitted",
        date: order.briefSubmittedAt,
        done: order.hasBrief,
        description: "The creator can work against the campaign requirements.",
      },
      {
        label: "Delivery submitted",
        date: order.deliveredAt,
        done: Boolean(order.deliveredAt),
        description: "The creator has marked the work as delivered or revised.",
      },
      {
        label: "Order completed",
        date: order.acceptedAt ?? order.refundedAt ?? order.creatorPaidAt,
        done: ["ACCEPTED", "CREATOR_PAYMENT_DONE", "REFUNDED"].includes(order.status),
        description: "Completion, payout, or refund has been recorded.",
      },
    ];

    // const statusHint =
    //   order.status === "BRIEF_SUBMISSION_PENDING"
    //     ? "Submit the brief to start the delivery timer."
    //     : order.status === "DELIVERED" || order.status === "REVISION_SUBMITTED"
    //       ? "The creator has marked this order as delivered and it is ready for review."
    //       : order.status === "DISPUTED"
    //         ? "This order is currently being handled as a dispute."
    //         : order.status === "REFUNDED"
    //           ? "This order has already been refunded."
    //           : "Progress is being tracked from payment through completion.";

    return (
      <section className="bg-card rounded-3xl overflow-hidden border shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-muted/30 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <PlayCircle className="w-5 h-5 text-foreground" />
              <h2 className="text-lg font-bold text-foreground">Delivery Status</h2>
            </div>
            {/* <p className="mt-2 text-sm text-muted-foreground">{statusHint}</p> */}
          </div>
          <Badge
            variant="outline"
            className={`${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"} w-fit rounded-full px-3 py-1 text-[11px] font-semibold`}
          >
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>

        <div className="space-y-6 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-muted/20 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Expected Total
              </p>
              <p className="mt-2 text-2xl font-black text-foreground">
                {(order.expectedAmountPaise / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: order.currency || "USD",
                })}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Delivery Deadline
              </p>
              <p className="mt-2 text-lg font-bold text-foreground">
                {formatDate(order.deliveryDeadlineAt) || "Starts after brief"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.label}
                className="flex gap-4 rounded-2xl border border-border/60 bg-background/80 px-5 py-4"
              >
                <div
                  className={cn(
                    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    milestone.done
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/70 bg-muted text-muted-foreground",
                  )}
                >
                  {milestone.done ? <CheckCircle className="w-4 h-4" /> : "•"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <p className="font-semibold text-foreground">{milestone.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(milestone.date) || "Pending"}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (role === "creator") {
    return (
      <section className="bg-card rounded-3xl overflow-hidden border shadow-sm relative">
        <div className="flex flex-col gap-4 border-b bg-muted/30 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CloudUpload className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-bold text-foreground">Delivery Upload</h2>
          </div>
        </div>

        <div className="p-6 md:p-8 relative">
          <div className="absolute top-0 right-0 -z-10 h-64 w-64 rounded-tr-3xl bg-primary/5 blur-[100px] pointer-events-none" />
          
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="video/*,image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {previews.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUploadClick}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-muted/10 hover:border-primary/50",
              )}
            >
              <div
                className={cn(
                  "mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-xl transition-transform",
                  isDragging ? "scale-110" : "group-hover:scale-110",
                )}
              >
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                Drag and drop your final cut
              </h3>
              <p className="max-w-xs text-balance text-sm text-muted-foreground">
                High-resolution MP4 or MOV files are preferred for maximum quality.
              </p>
            </div>
          ) : (
            <>
              <ThumbnailsCarousel
                assets={previews}
                isEditable={true}
                onRemove={handleRemove}
              />

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 font-semibold hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Plus className="w-5 h-5" />
                  Add More Files
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || previews.length === 0}
                  className="w-full py-4 font-bold shadow-lg shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner aria-hidden className="size-4" />
                      Uploading Media...
                    </>
                  ) : (
                    "Upload Final Video"
                  )}
                </Button>
              </div>
            </>
          )}

        </div>
      </section>
    );
  }

  return (
    <section className="bg-card rounded-3xl overflow-hidden border shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 p-5">
        <div className="flex items-center gap-3">
          <PlayCircle className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-bold text-foreground">Final Delivery</h2>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <ThumbnailsCarousel />
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button className="w-full py-6 font-bold shadow-lg shadow-primary/10 sm:flex-1">
            <CheckCircle className="w-5 h-5" />
            Approve & Release Funds
          </Button>
          <Button
            variant="outline"
            className="w-full px-8 py-6 font-semibold hover:bg-muted/50 sm:w-auto"
          >
            <FileEdit className="w-5 h-5" />
            Request Revision
          </Button>
        </div>
      </div>
    </section>
  );
}
