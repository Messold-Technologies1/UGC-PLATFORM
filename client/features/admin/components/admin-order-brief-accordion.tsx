"use client";

import { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MapPin,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import type { OrderBriefPayload } from "@/features/orders/api/get-order-brief";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import {
  formatContentType,
  formatDuration,
  formatLocation,
  formatTone,
} from "@/features/briefs/lib/format-enums";
import { cn } from "@/lib/utils";
import type { AdminOrderDetailsDto } from "../types";

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value || "N/A"}</p>
    </div>
  );
}

function BriefDetails({
  brief,
  order,
}: {
  brief: OrderBriefPayload;
  order: AdminOrderDetailsDto;
}) {
  const offerLabels = getBriefOfferLabels(brief.isProduct ?? true);
  const scriptSummary = formatBriefScript(brief.script);
  const willShipProduct =
    brief.willShipPhysicalProductToCreator ??
    order.requiresPhysicalProductShipment;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Brand details
        </h4>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Brand name" value={brief.brandName} />
          <DetailRow label="Industry" value={brief.industry} />
          {brief.brandLogo?.url ? (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Brand logo
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brief.brandLogo.url}
                alt={brief.brandName ?? "Brand logo"}
                className="h-16 w-16 rounded-lg border border-border/50 bg-muted/20 object-contain p-1"
              />
            </div>
          ) : null}
          {brief.brandPronunciationAudio?.url ? (
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Volume2 className="h-3 w-3" />
                Brand pronunciation audio
              </p>
              <audio
                controls
                src={brief.brandPronunciationAudio.url}
                className="h-10 w-full max-w-md"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-border/50 pt-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {offerLabels.sectionInfoTitle}
        </h4>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label={offerLabels.name} value={brief.productName} />
          {brief.productPageUrl ? (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {offerLabels.pageLink}
              </p>
              <a
                href={brief.productPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                View page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <DetailRow label={offerLabels.pageLink} value={null} />
          )}
          <DetailRow
            label="Ship physical product"
            value={willShipProduct ? "Yes" : "No"}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Description
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {brief.productDescription || "N/A"}
          </p>
        </div>
      </section>

      <section className="space-y-4 border-t border-border/50 pt-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Creative needs
        </h4>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow
            label="Content type"
            value={brief.contentType?.map(formatContentType).join(", ")}
          />
          <DetailRow label="Duration" value={formatDuration(brief.durationBucket)} />
          <DetailRow
            label="Tone"
            value={brief.toneStyle?.map(formatTone).join(", ")}
          />
          <DetailRow
            label="Location"
            value={formatLocation(brief.shootLocationKind)}
          />
        </div>
        {brief.shootLocationAddress ? (
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Location address
            </p>
            <div className="flex max-w-md gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{brief.shootLocationAddress}</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-6 border-t border-border/50 pt-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          References &amp; notes
        </h4>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Key points
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {brief.keyNoteToInclude || "N/A"}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Call to action
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {brief.ctaNote || "N/A"}
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Reference links
          </p>
          {brief.referenceLinks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {brief.referenceLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-background p-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
                >
                  <Link2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No references added.</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Script
          </p>
          <p className="text-sm font-medium text-foreground">
            {scriptSummary?.label || "N/A"}
          </p>
          {scriptSummary?.text ? (
            <p className="whitespace-pre-wrap rounded-xl border border-border/50 bg-muted/30 p-4 text-sm leading-6 text-foreground/90">
              {scriptSummary.text}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Final notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {brief.finalNotes || "N/A"}
          </p>
        </div>
      </section>
    </div>
  );
}

export function AdminOrderBriefAccordion({
  orderId,
  order,
  className,
}: {
  orderId: string;
  order: AdminOrderDetailsDto;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const briefQuery = useGetOrderBriefQuery(orderId, { enabled: open });
  const submittedLabel = formatDate(order.briefSubmittedAt);

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-3xl border-border/50 shadow-sm dark:border-border/10 dark:bg-black/60",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 border-b border-border/50 bg-muted/30 px-8 py-6 text-left transition-colors hover:bg-muted/50 dark:border-border/10 dark:bg-card/20 dark:hover:bg-card/40"
      >
        <span className="flex items-center gap-2 font-headline text-xl font-bold text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Brief Submitted
          {order.hasBrief ? (
            <Badge className="ml-1 border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-600 shadow-none hover:bg-emerald-500/20">
              Submitted
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="ml-1 px-2.5 py-0.5 font-bold shadow-none"
            >
              Pending
            </Badge>
          )}
        </span>
        <span className="flex items-center gap-3 text-sm text-muted-foreground">
          {submittedLabel}
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open ? (
        <CardContent className="p-8">
          {!order.hasBrief ? (
            <p className="text-sm text-muted-foreground">
              No brief has been submitted for this order yet.
            </p>
          ) : briefQuery.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading brief…
            </div>
          ) : briefQuery.isError || !briefQuery.data?.brief ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {briefQuery.error?.message ||
                "Unable to load the brief for this order."}
            </div>
          ) : (
            <BriefDetails brief={briefQuery.data.brief} order={order} />
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
