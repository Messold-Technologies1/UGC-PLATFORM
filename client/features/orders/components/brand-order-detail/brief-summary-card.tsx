"use client";

import Link from "next/link";
import {
  ArrowRight,
  Box,
  Clock3,
  ExternalLink,
  Link2,
  LocateFixed,
  MessageSquareQuote,
  Package,
  Sparkles,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import {
  formatContentType,
  formatDuration,
  formatLocation,
  formatTone,
} from "@/features/briefs/lib/format-enums";
import type { OrderBriefPayload } from "../../api/get-order-brief";
import type { OrderDetailsPublic } from "../../api/types";

interface BriefSummaryCardProps {
  order: OrderDetailsPublic;
  brief?: OrderBriefPayload | null;
  briefId?: string | null;
  /**
   * Destination for the "View Full Brief" button. Defaults to the brand brief
   * page; the creator order view passes its own read-only brief route.
   */
  briefHref?: string | null;
}

function formatSubmittedDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function splitIndustry(value?: string | null) {
  if (!value) return [];
  return value
    .split(/[,/|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueCompact(values: Array<string | null | undefined>, limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function formatList(
  values: string[] | null | undefined,
  formatter: (value: string) => string,
  fallback: string,
) {
  if (!values || values.length === 0) return fallback;
  return values.map(formatter).join(", ");
}

function trimPreview(text?: string | null, max = 200) {
  const value = text?.trim();
  if (!value) return null;
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
}

function Metric({
  icon: Icon,
  accentClass,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  accentClass: string;
  label: string;
  value: string;
  href?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-1 sm:px-2">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", accentClass)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{value}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export function BriefSummaryCard({
  order,
  brief,
  briefId,
  briefHref,
}: Readonly<BriefSummaryCardProps>) {
  if (!brief) return null;

  const fullBriefHref = briefHref ?? (briefId ? `/brand/briefs/${briefId}` : null);

  const isProductBrief = brief.isProduct ?? true;
  const offerLabels = getBriefOfferLabels(isProductBrief);
  const submittedOn = formatSubmittedDate(order.briefSubmittedAt ?? brief.createdAt);
  const title = isProductBrief ? "Product Brief" : "Service Brief";
  const primaryName = brief.productName?.trim() || order.packageNameSnapshot;
  const description =
    brief.productDescription?.trim() ||
    brief.finalNotes?.trim() ||
    brief.keyNoteToInclude?.trim() ||
    "No summary added yet.";
  const contentType = formatList(
    brief.contentType ?? [],
    formatContentType,
    "Creator decides",
  );
  const duration = formatDuration(brief.durationBucket ?? "SEC_45_60");
  const tone = formatList(brief.toneStyle ?? [], formatTone, "Creator decides");
  const location = brief.shootLocationKind
    ? formatLocation(brief.shootLocationKind)
    : null;
  const pageUrl = brief.productPageUrl?.trim() || null;
  const pageLabel = isProductBrief ? "Product URL" : "Service URL";
  const imageUrl = brief.productImage?.url ?? null;
  const scriptSummary = formatBriefScript(brief.script);
  const scriptPreview = trimPreview(
    scriptSummary?.text || brief.keyNoteToInclude || brief.finalNotes,
  );
  const chips = uniqueCompact(
    [
      ...splitIndustry(brief.industry),
      brief.toneStyle?.[0] ? formatTone(brief.toneStyle[0]) : null,
    ],
    3,
  );

  const theme = {
    iconWrap: "bg-[#E11D48]/10 text-[#E11D48]",
    button: "bg-[#E11D48] text-white hover:bg-[#c81e3a]",
    chip: "bg-[#E11D48]/10 text-[#E11D48]",
    metricIcon: "bg-[#E11D48]/10 text-[#E11D48]",
    fallbackCard: "from-[#FFF1F5] to-[#FFE4EC] text-[#E11D48]",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", theme.iconWrap)}>
                  {isProductBrief ? <Package className="size-5" /> : <Box className="size-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {title}
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Submitted
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {submittedOn ? `Submitted on ${submittedOn}` : "Submitted"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 lg:items-end">
                {fullBriefHref ? (
                  <Link
                    href={fullBriefHref}
                    className={cn(
                      "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-colors",
                      theme.button,
                    )}
                  >
                    View Full Brief
                    <ArrowRight className="size-4" />
                  </Link>
                ) : null}
                <p className="text-xs text-muted-foreground lg:text-right">
                  See complete details, script, references and more.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {isProductBrief ? (
                  imageUrl ? (
                    <div className="size-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted">
                      <img
                        src={imageUrl}
                        alt={primaryName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder-product.png";
                        }}
                      />
                    </div>
                  ) : (
                    <div className={cn("flex size-24 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br", theme.fallbackCard)}>
                      <Package className="size-9" />
                    </div>
                  )
                ) : null}

                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-semibold text-foreground sm:text-xl">
                    {primaryName}
                  </h4>
                  <p className="mt-1.5 max-w-full text-[13px] leading-6 text-muted-foreground">
                    {description}
                  </p>

                  {chips.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", theme.chip)}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {scriptPreview ? (
                <div className="w-full rounded-2xl bg-[#FFF5F8] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E11D48]/10 text-[#E11D48]">
                      <MessageSquareQuote className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] leading-6 text-foreground line-clamp-2">
                        {scriptPreview}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="h-px bg-linear-to-r from-transparent via-border/70 to-transparent" />

            <div
              className={cn(
                "grid gap-3 md:gap-0",
                location ? "md:grid-cols-5" : "md:grid-cols-4",
              )}
            >
              <div className="md:border-r md:border-border/60">
                <Metric
                  icon={Link2}
                  accentClass={theme.metricIcon}
                  label={pageLabel}
                  value={pageUrl ?? "Not provided"}
                  href={pageUrl}
                />
              </div>

              <div className="md:border-r md:border-border/60">
                <Metric
                  icon={Video}
                  accentClass={theme.metricIcon}
                  label="Content Type"
                  value={contentType}
                />
              </div>

              <div className="md:border-r md:border-border/60">
                <Metric
                  icon={Clock3}
                  accentClass={theme.metricIcon}
                  label="Duration"
                  value={duration}
                />
              </div>

              <div className="md:border-r md:border-border/60">
                <Metric
                  icon={Sparkles}
                  accentClass={theme.metricIcon}
                  label="Tone"
                  value={tone}
                />
              </div>

              {location ? (
                <div className="flex items-center px-1 py-1 sm:px-2">
                  <Metric
                    icon={LocateFixed}
                    accentClass={cn(
                      theme.metricIcon,
                      isProductBrief
                        ? "shadow-[0_0_0_6px_rgba(244,114,182,0.08)]"
                        : "shadow-[0_0_0_6px_rgba(110,66,255,0.08)]",
                    )}
                    label="Shoot Location"
                    value={location}
                  />
                </div>
              ) : null}
            </div>
          </div>
    </div>
  );
}
