"use client";

import { useState } from "react";

import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Volume2,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import { formatDuration, formatLocation, formatTone } from "@/features/briefs/lib/format-enums";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/features/orders/constants";
import {
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "@/features/orders/lib/creator-payout";
import { useGetCreatorOrderDetailsQuery } from "@/features/orders/hooks/use-get-creator-order-details-query";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useAcceptBriefMutation } from "@/features/orders/hooks/use-accept-brief-mutation";
import { useRejectBriefMutation } from "@/features/orders/hooks/use-reject-brief-mutation";
import { ReasonPromptDialog } from "@/features/orders/components/reason-prompt-dialog";
import { getCreatorOrdersPageHref } from "@/features/orders/components/creator-order-detail/creator-orders-tabs";
import styles from "@/features/briefs/components/brief-studio.module.css";

interface OrderBriefReviewProps {
  orderId: string;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
      <p className="text-sm font-medium leading-relaxed text-foreground">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

function BriefReviewSkeleton() {
  return (
    <div className="mx-auto w-full space-y-8 pb-10 pt-4 lg:pt-5">
      <Skeleton className="h-10 w-32 rounded-lg" />
      <div className={styles.studio}>
        <section className={cn(styles.panel, styles.leftPanel)}>
          <Skeleton className="h-48 w-full rounded-xl m-5" />
          <Skeleton className="h-64 w-full rounded-xl m-5" />
          <Skeleton className="h-72 w-full rounded-xl m-5" />
        </section>
        <section className={cn(styles.panel, styles.rightPanel)}>
          <Skeleton className="h-56 w-full rounded-xl m-5" />
          <Skeleton className="h-40 w-full rounded-xl m-5" />
        </section>
      </div>
    </div>
  );
}

export function OrderBriefReview({ orderId }: OrderBriefReviewProps) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetOrderBriefQuery(orderId);
  const { data: orderDetails } = useGetCreatorOrderDetailsQuery(orderId);
  const acceptBriefMutation = useAcceptBriefMutation({
    onSuccess: () => {
      router.push(getCreatorOrdersPageHref(orderId, "BRIEF_ACCEPTED"));
    },
  });

  const brief = data?.brief;
  const isAccepted = Boolean(data?.briefAcceptedAt);
  const order = orderDetails?.order;
  const brand = orderDetails?.brand;
  const ordersPageHref = getCreatorOrdersPageHref(
    orderId,
    isAccepted ? "BRIEF_ACCEPTED" : order?.status,
  );

  const expectedAmount = getCreatorPayoutFromOrderTotal(
    resolveOrderTotalInr({
      expectedAmountPaise: order?.expectedAmountPaise,
      priceAmountSnapshot: order?.priceAmountSnapshot,
    }),
  ).creatorEarnings;

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const rejectBriefMutation = useRejectBriefMutation({
    onSuccess: () => {
      setIsRejectOpen(false);
      router.push(getCreatorOrdersPageHref(orderId, order?.status));
    },
  });

  function handleAcceptBrief() {
    if (!brief || isAccepted || acceptBriefMutation.isPending) return;
    acceptBriefMutation.mutate({ orderId });
  }

  if (isLoading) {
    return <BriefReviewSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full pb-10 pt-4 lg:pt-5">
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Unable to load this brief
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {error?.message ||
                  "The order brief request did not return usable data."}
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={getCreatorOrdersPageHref(orderId, order?.status)}>
                  <ArrowLeft className="size-4" />
                  Back to order
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="mx-auto w-full pb-10 pt-4 lg:pt-5">
        <div className="rounded-3xl border border-border/50 bg-card p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                No brief submitted yet
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                The brand has not submitted a campaign brief for this order.
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={getCreatorOrdersPageHref(orderId, order?.status)}>
                  <ArrowLeft className="size-4" />
                  Back to order
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const brandLogoUrl = brief.brandLogo?.url ?? brand?.logoUrl;
  const productImageUrl = brief.productImage?.url;
  const isProductBrief = brief.isProduct ?? true;
  const offerLabels = getBriefOfferLabels(isProductBrief);
  const brandName = brief.brandName || brand?.brandName || "Brand";
  const pronunciationAudioUrl = brief.brandPronunciationAudio?.url;
  const scriptSummary = formatBriefScript(brief.script);
  const orderStatus = order?.status;
  const statusLabel = isAccepted
    ? "Brief accepted"
    : orderStatus
      ? STATUS_LABELS[orderStatus] || orderStatus
      : "Awaiting acceptance";

  return (
    <div className="mx-auto w-full space-y-8 pb-10 pt-4 lg:pt-5">
      <Button
        asChild
        variant="ghost"
        className="h-9 w-fit gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <Link href={ordersPageHref}>
          <ArrowLeft className="size-4" />
          Back to order
        </Link>
      </Button>

      {!isAccepted ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 text-sm font-medium text-amber-800">
           <Clock className="size-4 shrink-0 text-amber-500" />
           Review the full brief below, then accept to start this collaboration — or reject it with a reason.
        </div>
      ) : null}

      <div className={styles.studio} style={{ paddingTop: 0 }}>
        <section className={cn(styles.panel, styles.leftPanel)}>
          <div className={styles.panelHead}>
            <div className={styles.panelHeadIconPrimary} style={{ background: "transparent" }}>
              <Avatar className="size-full rounded-xl border border-pink/20 bg-pink/10">
                 <AvatarImage
                  src={productImageUrl || brandLogoUrl || undefined}
                  className="rounded-xl object-cover"
                 />
                 <AvatarFallback className="rounded-xl bg-transparent text-sm font-bold text-pink">
                  {getInitials(brandName)}
                 </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <h2 className={styles.panelHeadTitle}>
                {brief.productName || order?.packageNameSnapshot || "Project brief"}
              </h2>
              <div className={styles.panelHeadSub}>
                {brandName} · Submitted {formatDate(data.briefSubmittedAt)}
              </div>
            </div>
          </div>

          <div className={styles.panelBody}>
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>
                <div className={styles.formSectionNum}>1</div>
                Brand Details
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <DetailRow label="Brand name" value={brandName} />
                <DetailRow label="Industry" value={brief.industry} />
                {brandLogoUrl ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Brand logo
                    </p>
                    <NextImage
                      src={brandLogoUrl}
                      alt={`${brandName} logo`}
                      width={64}
                      height={64}
                      className="size-16 rounded-lg border border-border/40 bg-muted/20 object-contain p-1"
                      unoptimized
                    />
                  </div>
                ) : (
                  <DetailRow label="Brand logo" />
                )}
                {pronunciationAudioUrl ? (
                  <div className="space-y-2 md:col-span-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Volume2 className="size-3" />
                      Brand pronunciation
                    </p>
                    <audio
                      controls
                      src={pronunciationAudioUrl}
                      className="h-10 w-full max-w-md"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>
                <div className={styles.formSectionNum}>2</div>
                {offerLabels.reviewSectionTitle || "Product Info"}
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {isProductBrief && productImageUrl ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {offerLabels.image}
                    </p>
                    <NextImage
                      src={productImageUrl}
                      alt={brief.productName || offerLabels.image}
                      width={120}
                      height={120}
                      className="size-[120px] rounded-xl border border-border/40 bg-muted/20 object-cover"
                      unoptimized
                    />
                  </div>
                ) : isProductBrief ? (
                  <DetailRow label={offerLabels.image} />
                ) : null}

                <div className="flex flex-col gap-6">
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
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink hover:underline"
                        >
                          View Page
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    ) : (
                      <DetailRow label={offerLabels.pageLink} />
                    )}
                    {isProductBrief ? (
                    <DetailRow
                      label="Ship physical product"
                      value={brief.willShipPhysicalProductToCreator ? "Yes" : "No"}
                    />
                    ) : null}
                </div>
                
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {brief.productDescription || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>
                <div className={styles.formSectionNum}>3</div>
                Creative Needs
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <DetailRow
                  label="Duration"
                  value={brief.durationBucket ? formatDuration(brief.durationBucket) : "—"}
                />
                <DetailRow
                  label="Tone"
                  value={brief.toneStyle && brief.toneStyle.length > 0
                    ? (Array.isArray(brief.toneStyle) ? brief.toneStyle : [brief.toneStyle]).map(t => formatTone(t)).join(", ")
                    : "—"}
                />
                <DetailRow
                  label="Location"
                  value={brief.shootLocationKind ? formatLocation(brief.shootLocationKind) : "—"}
                />
                {brief.shootLocationAddress ? (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Location Address
                    </p>
                    <div className="flex gap-2.5 rounded-xl border border-pink/15 bg-pink/5 p-3.5 text-sm leading-relaxed text-foreground max-w-md">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-pink" />
                      <span>{brief.shootLocationAddress}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>
                <div className={styles.formSectionNum}>4</div>
                References & Notes
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Key points
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {brief.keyNoteToInclude || "—"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Call to action
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {brief.ctaNote || "—"}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Reference links
                  </p>
                  {brief.referenceLinks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {brief.referenceLinks.map((referenceLink) => (
                        <a
                          key={referenceLink}
                          href={referenceLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-border/40 bg-background px-3.5 py-3 text-sm font-medium text-pink transition-colors hover:bg-pink/5"
                        >
                          <ExternalLink className="size-4 shrink-0" />
                          <span className="truncate">{referenceLink}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No references added.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Script
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {scriptSummary?.label || "—"}
                  </p>
                  {scriptSummary?.text ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90 bg-muted/30 p-4 rounded-xl border border-border/40">
                      {scriptSummary.text}
                    </p>
                  ) : null}
                </div>

                <DetailRow label="Final notes" value={brief.finalNotes} />
              </div>
            </div>
          </div>
        </section>

        <section className={cn(styles.panel, styles.rightPanel)}>
          <div className={styles.panelHead}>
            <div className={styles.panelHeadIconGrape} style={{ background: "color-mix(in oklab, var(--pink) 14%, transparent)", color: "var(--pink)" }}>
               <Package size={19} />
            </div>
            <div>
              <h2 className={styles.panelHeadTitle}>Order Summary</h2>
              <div className={styles.panelHeadSub}>
                 {order?.packageNameSnapshot || "Not specified"}
              </div>
            </div>
          </div>
          
          <div className={styles.panelBody}>
            <div className="space-y-4 text-sm mb-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0",
                    isAccepted
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-pink/15 text-pink",
                  )}
                >
                  {statusLabel}
                </Badge>
              </div>
              
              {isProductBrief ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Physical product</span>
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  {brief.willShipPhysicalProductToCreator ? (
                    <>
                      <Truck className="size-3.5 text-pink" />
                      Yes
                    </>
                  ) : (
                    "No"
                  )}
                </span>
              </div>
              ) : null}
              {expectedAmount > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Est. payout</span>
                  <span className="font-bold text-foreground text-base">
                    {formatCurrency(expectedAmount)}
                  </span>
                </div>
              ) : null}
            </div>

            {!isAccepted ? (
              <div className="space-y-2.5">
                <Button
                  onClick={handleAcceptBrief}
                  disabled={
                    acceptBriefMutation.isPending || rejectBriefMutation.isPending
                  }
                  className="h-12 w-full rounded-xl bg-pink font-bold text-white shadow-sm hover:bg-pink/90"
                >
                  {acceptBriefMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 size-4" aria-hidden />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      Accept Brief
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={
                    acceptBriefMutation.isPending || rejectBriefMutation.isPending
                  }
                  className="h-11 w-full rounded-xl border-red-200 font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="mr-2 size-4" />
                  Reject Order
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-700">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Brief accepted
                  </div>
                  {data.briefAcceptedAt && (
                    <span className="text-xs font-medium opacity-80">
                      {formatDate(data.briefAcceptedAt)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-emerald-700/80">
                  You can track delivery progress from the order page.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 h-11 w-full rounded-xl border-emerald-500/30 bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  <Link href={ordersPageHref}>Go to order</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      <ReasonPromptDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Reject this order?"
        description="The brand will be notified that you've declined this order, along with your reason. This can't be undone."
        label="Reason for rejecting"
        placeholder="Let the brand know why you're rejecting this order…"
        confirmLabel="Reject Order"
        pendingLabel="Rejecting..."
        isPending={rejectBriefMutation.isPending}
        onConfirm={(note) => rejectBriefMutation.mutate({ orderId, note })}
      />
    </div>
  );
}
