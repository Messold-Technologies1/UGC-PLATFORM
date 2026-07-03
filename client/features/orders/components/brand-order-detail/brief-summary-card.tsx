"use client";

import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Truck,
  Video,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import type { OrderBriefPayload } from "../../api/get-order-brief";
import type { OrderDetailsPublic } from "../../api/types";

interface BriefSummaryCardProps {
  order: OrderDetailsPublic;
  brief?: OrderBriefPayload | null;
  briefId?: string | null;
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

import { cn } from "@/lib/utils";

interface BriefFieldProps {
  icon?: React.ElementType;
  iconColor?: string;
  label: string;
  value?: string | null;
  children?: React.ReactNode;
  image?: string | null;
  imageFallbackIcon?: React.ElementType;
}

function BriefField({
  icon: Icon,
  iconColor,
  label,
  value,
  children,
  image,
  imageFallbackIcon: ImageFallbackIcon,
}: BriefFieldProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 dark:bg-slate-900/40 dark:border-slate-800 p-4 flex items-start gap-4 h-full transition-all hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
      {image ? (
        <div className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
          <img
            src={image}
            alt={label}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-product.png";
            }}
          />
        </div>
      ) : ImageFallbackIcon ? (
        <div className="size-16 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center">
          <ImageFallbackIcon className="size-7 text-muted-foreground/60" />
        </div>
      ) : Icon ? (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            iconColor,
          )}
        >
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-foreground leading-tight">
          {label}
        </p>
        {value && (
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-snug">
            {value}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function BriefSummaryCard({
  order,
  brief,
  briefId,
}: BriefSummaryCardProps) {
  const router = useRouter();

  const isProductBrief = brief?.isProduct ?? true;
  const offerLabels = getBriefOfferLabels(isProductBrief);
  const productName = brief?.productName ?? offerLabels.summaryDetails;
  const productDescription = brief?.productDescription ?? "";
  const contentTypes = brief?.contentType
    ? formatEnumLabel(brief.contentType)
    : "Product Demo";
    
  const durationBucketLabels: Record<string, string> = {
    SEC_0_15: "0 - 15 Seconds",
    SEC_15_30: "15 - 30 Seconds",
    SEC_30_45: "30 - 45 Seconds",
    SEC_45_60: "45 - 60 Seconds",
    SEC_60_100: "60 - 100 Seconds",
    NOT_SURE: "Not sure / Creator decides",
  };
  
  const durationBucket = brief?.durationBucket
    ? durationBucketLabels[brief.durationBucket] || formatEnumLabel(brief.durationBucket)
    : "Up to 60 seconds";
  const referenceLinks = brief?.referenceLinks ?? [];
  const willShipProduct =
    brief?.willShipPhysicalProductToCreator ??
    order.requiresPhysicalProductShipment;
  const scriptSummary = formatBriefScript(brief?.script);

  function handleViewFullBrief() {
    if (briefId) {
      router.push(`/brand/briefs/${briefId}`);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Brief Summary</h3>
        <Button
            variant="outline"
            className="rounded-xl border border-border/50 text-pink hover:bg-pink/5 hover:text-pink font-semibold gap-2"
            onClick={handleViewFullBrief}
            disabled={!briefId}
          >
            View Full Brief <ExternalLink className="size-4" />
          </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BriefField
          label={offerLabels.summaryDetails}
          value={productName}
          image={isProductBrief ? brief?.productImage?.url : undefined}
          imageFallbackIcon={Package}
        >
          {productDescription && (
            <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
              {productDescription}
            </p>
          )}
        </BriefField>

        <BriefField
          icon={Video}
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          label="Content Type"
          value={contentTypes}
        />

        <BriefField
          icon={ImageIcon}
          iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
          label="Video Length"
          value={durationBucket}
        />

        <BriefField
          icon={FileText}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          label="Script"
          value={scriptSummary?.label ?? "Not specified"}
        >
          {scriptSummary?.text ? (
            <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
              {scriptSummary.text}
            </p>
          ) : brief?.keyNoteToInclude ? (
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Key points provided
            </p>
          ) : null}
        </BriefField>

        <BriefField
          icon={Link2}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          label="References"
        >
          <p className="text-[13px] text-muted-foreground mt-1">
            {referenceLinks.length > 0
              ? `${referenceLinks.length} link${referenceLinks.length > 1 ? "s" : ""}, 0 files`
              : "No references"}
          </p>
          {referenceLinks.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {referenceLinks.slice(0, 3).map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-8 rounded-md bg-slate-200/50 border border-slate-300/50 flex items-center justify-center overflow-hidden hover:bg-slate-300/50 transition-colors"
                  title={link}
                >
                  <ExternalLink className="size-3 text-slate-500" />
                </a>
              ))}
              {referenceLinks.length > 3 && (
                <div 
                  className="size-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500"
                  title={`${referenceLinks.length - 3} more links`}
                >
                  +{referenceLinks.length - 3}
                </div>
              )}
            </div>
          )}
        </BriefField>

        <BriefField
          icon={Truck}
          iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          label="Shipping"
          value={
            willShipProduct
              ? "Product needs to be shipped"
              : "No shipping required"
          }
        >
          {willShipProduct && (
            <p
              className={cn(
                "text-[12px] font-bold mt-1.5",
                order.dispatchedAt
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-orange-500",
              )}
            >
              {order.dispatchedAt ? "Shipped" : "Not shipped yet"}
            </p>
          )}
        </BriefField>
      </div>
    </div>
  );
}
