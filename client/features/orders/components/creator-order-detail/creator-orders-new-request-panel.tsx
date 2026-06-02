"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  X,
  Clock,
  Download,
  FileText,
  CheckCircle,
  Smartphone,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Star,
  XCircle,
  Music,
  ClipboardCheck,
  Truck,
  FileVideo,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CreatorOrderNewRequestPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
}

function formatEnumLabel(value?: string | string[] | null) {
  if (!value) return "N/A";
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return "N/A";

  return values
    .map((item) =>
      item
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" "),
    )
    .join(", ");
}

export function CreatorOrderNewRequestPanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
}: CreatorOrderNewRequestPanelProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedItem?.order?.createdAt) return;

    const calculateTimeLeft = () => {
      const createdAt = new Date(selectedItem.order.createdAt).getTime();
      const expiresAt = createdAt + 48 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [selectedItem?.order?.createdAt]);

  if (!selectedItem) return null;

  const hasBrief = Boolean(selectedItem.order.hasBrief);
  const expectedAmount = detailsData?.order?.expectedAmountPaise
    ? detailsData.order.expectedAmountPaise / 100
    : selectedItem.order.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

  const baseAmount = expectedAmount;
  const addOnsTotal = detailsData?.order?.addOnsTotalSnapshot
    ? parseFloat(detailsData.order.addOnsTotalSnapshot)
    : 0;
  const platformFee = 0;

  return (
    <div className="bg-background rounded-lg border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-fit sticky top-24">
      <div className="flex items-center justify-between p-5 border-b border-border/40 bg-white">
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32]">
            <AvatarImage
              src={selectedItem.brand.logoUrl || undefined}
              className="object-cover rounded-lg"
            />
            <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
              {selectedItem.brand.brandName.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg leading-none">
                Order #{selectedItem.order.id.substring(0, 5).toUpperCase()}
              </h2>
              <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-0 font-semibold px-2 py-0">
                New Request
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-none">
              {selectedItem.brand.brandName} •{" "}
              {selectedItem.order.packageNameSnapshot || "UGC Video (60s)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="font-bold text-lg leading-none mb-1">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(expectedAmount)}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Est. Payout
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasBrief && (
              <>
                <Button className="bg-[#4318FF] hover:bg-[#4318FF]/90 text-white font-bold h-10 px-5 rounded-lg shadow-sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Order
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold h-10 px-4 rounded-lg"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/50 space-y-6">
        <div className="bg-[#fff9e6] border border-[#ffe58f] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-700 font-medium text-sm">
            <Clock className="w-5 h-5 text-amber-500" />
            You have 48 hours to accept or decline this request.
          </div>
          {timeLeft && (
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm bg-white/60 px-3 py-1 rounded-md border border-amber-200/60">
              <Clock className="w-4 h-4 text-amber-500" />
              {String(timeLeft.hours ?? 0).padStart(2, '0')}h : {String(timeLeft.minutes ?? 0).padStart(2, '0')}m : {String(timeLeft.seconds ?? 0).padStart(2, '0')}s left
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px_280px] gap-4">
              <div className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base">Brief</h3>
                  <Button
                    variant="outline"
                    className="h-8 text-xs font-semibold px-3"
                    asChild
                  >
                    <Link href={`/creator/orders/${selectedOrderId}/brief`}>
                      View Full Brief
                    </Link>
                  </Button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-foreground/90 leading-relaxed mb-2">
                    {briefData?.brief?.creativeGuidance ||
                      "Create an engaging 60-second UGC video..."}
                  </p>
                  <button className="text-sm font-bold text-[#4318FF] hover:underline">
                    Show more
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Music className="w-3.5 h-3.5" /> Video Type
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.contentType ? formatEnumLabel(briefData.brief.contentType) : "UGC Testimonial"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <FileText className="w-3.5 h-3.5" /> Key Notes
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.keyNoteToInclude ? "Included in brief" : "None"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <MessageSquare className="w-3.5 h-3.5" /> Language
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.language || "English"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Star className="w-3.5 h-3.5" /> Tone
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.toneStyle ? formatEnumLabel(briefData.brief.toneStyle) : "Natural, Authentic"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Usage Rights
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Organic Social + Paid Ads
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Deliverables
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        1{" "}
                        {selectedItem.order.packageNameSnapshot ||
                          "UGC Video (60s)"}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        9:16 Aspect Ratio
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" /> Due Date
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {selectedItem.order.deliveryDeadlineAt
                        ? new Intl.DateTimeFormat("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(
                            new Date(selectedItem.order.deliveryDeadlineAt),
                          )
                        : "TBD"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col">
                  <div>
                    <h3 className="font-bold text-base mb-4">Brand</h3>

                    <div className="flex items-center gap-4 mb-8">
                      <Avatar className="w-12 h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32]">
                        <AvatarImage
                          src={selectedItem.brand.logoUrl || undefined}
                          className="object-cover rounded-lg"
                        />
                        <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                          {selectedItem.brand.brandName
                            .substring(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-sm leading-none">
                          {selectedItem.brand.brandName}
                        </span>
                        <Button
                          variant="outline"
                          className="h-6 text-[10px] text-[#4318FF] border-[#4318FF]/20 bg-[#4318FF]/5 px-2 font-bold hover:bg-[#4318FF]/10 hover:text-[#4318FF]"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mt-auto">
                    <div className="flex flex-col gap-1 border-r border-border/50">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Orders
                      </span>
                      <span className="font-bold text-base">0</span>
                    </div>
                    <div className="flex flex-col gap-1 border-r border-border/50">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Completed
                      </span>
                      <span className="font-bold text-base">0</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Rating
                      </span>
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-base">0.0</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col flex-1">
                  <h3 className="font-bold text-base mb-4">Earnings</h3>

                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-medium">
                        Base Payout
                      </span>
                      <span className="text-sm font-semibold">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(baseAmount - addOnsTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-medium">
                        Add-ons (
                        {detailsData?.order?.addOnsSnapshot?.length || 0})
                      </span>
                      <span className="text-sm font-semibold">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(addOnsTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border/50">
                      <span className="text-sm text-muted-foreground font-medium">
                        Platform Fee
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        ₹0
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold">Est. Payout</span>
                      <span className="text-2xl font-black text-[#4318FF]">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(expectedAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col">
                  <div>
                    <h3 className="font-bold text-base mb-4">
                      Message from Brand
                    </h3>

                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-sm text-foreground/80 flex flex-col justify-center text-center">
                      <p className="italic text-muted-foreground">
                        No message provided yet.
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground mt-3">
                    Sent on{" "}
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(selectedItem.order.createdAt))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-base">Brand Attachments</h3>
                    <span className="text-xs text-muted-foreground font-semibold">
                      0 files
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center text-center p-4 border border-dashed border-border/60 rounded-lg bg-slate-50/50">
                    <p className="text-sm text-muted-foreground">
                      No attachments provided.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF9FF] rounded-lg border border-[#4318FF]/10 p-6 shadow-sm mt-4">
              <h3 className="font-bold text-base mb-6">What happens next?</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      1. Accept the order
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Review the brief and accept if you want to work on this
                      project.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Truck className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      2. Product shipped
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Brand will ship the product to your address.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileVideo className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      3. Create & deliver
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Create amazing content and submit for review.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Wallet className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      4. Get paid
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Once approved, you'll receive your payout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
