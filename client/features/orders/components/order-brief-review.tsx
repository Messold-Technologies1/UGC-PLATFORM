"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Package,
  Sparkles,
  Truck,
  Video,
  Volume2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import { formatDuration, formatLocation, formatTone } from "@/features/briefs/lib/format-enums";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/features/orders/constants";
import { useGetCreatorOrderDetailsQuery } from "@/features/orders/hooks/use-get-creator-order-details-query";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useAcceptBriefMutation } from "@/features/orders/hooks/use-accept-brief-mutation";
import { getCreatorOrdersPageHref } from "@/features/orders/components/creator-order-detail/creator-orders-tabs";

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

function BriefField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium leading-relaxed text-foreground">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        className,
      )}
    >
      <CardHeader className="border-b border-border/40 bg-muted/20 px-5 py-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-pink/15 text-pink">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function BriefReviewSkeleton() {
  return (
    <div className="mx-auto w-full space-y-8 pb-10 pt-4 lg:pt-5">
      <Skeleton className="h-10 w-32 rounded-lg" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
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

  const expectedAmount = order?.expectedAmountPaise
    ? order.expectedAmountPaise / 100
    : order?.priceAmountSnapshot
      ? Number.parseFloat(order.priceAmountSnapshot)
      : 0;

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
              <FileText className="size-5" />
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

      <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-5 border-b border-border/40 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-12 shrink-0 rounded-lg border border-pink/20 bg-pink/10">
              <AvatarImage
                src={productImageUrl || brandLogoUrl || undefined}
                className="rounded-lg object-cover"
              />
              <AvatarFallback className="rounded-lg bg-transparent text-sm font-bold text-pink">
                {getInitials(brandName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold leading-none text-foreground sm:text-2xl">
                  {brief.productName || order?.packageNameSnapshot || "Project brief"}
                </h1>
                <Badge
                  variant="secondary"
                  className={cn(
                    "rounded-full border-0 px-2.5 py-0.5 text-[11px] font-bold",
                    isAccepted
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-pink/15 text-pink",
                  )}
                >
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {brandName}
                {order?.packageNameSnapshot
                  ? ` · ${order.packageNameSnapshot}`
                  : ""}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Submitted {formatDate(data.briefSubmittedAt)}
                </span>
                {isAccepted ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Accepted {formatDate(data.briefAcceptedAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {expectedAmount > 0 ? (
            <div className="flex shrink-0 flex-col items-start lg:items-end">
              <span className="text-xl font-bold leading-none text-foreground">
                {formatCurrency(expectedAmount)}
              </span>
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Est. payout
              </span>
            </div>
          ) : null}
        </div>

        {!isAccepted ? (
          <div className="flex flex-col gap-3 border-b border-amber-200/60 bg-amber-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <Clock className="size-4 shrink-0 text-amber-500" />
              Review the full brief below, then accept to start this collaboration.
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <SectionCard title="Brand" icon={Building2}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <BriefField label="Brand name" value={brandName} />
              <BriefField label="Industry" value={brief.industry} />
              {brandLogoUrl ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Brand logo
                  </p>
                  <NextImage
                    src={brandLogoUrl}
                    alt={`${brandName} logo`}
                    width={72}
                    height={72}
                    className="size-[72px] rounded-xl border border-border/40 bg-muted/20 object-contain p-1.5"
                    unoptimized
                  />
                </div>
              ) : (
                <BriefField label="Brand logo" />
              )}
            </div>
            {pronunciationAudioUrl ? (
              <>
                <Separator className="my-5" />
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <Volume2 className="size-3.5" />
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
              </>
            ) : null}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title={offerLabels.reviewSectionTitle} icon={Package}>
              <div className="space-y-5">
                {isProductBrief && productImageUrl ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
                  <BriefField label={offerLabels.image} />
                ) : null}
                <BriefField label={offerLabels.name} value={brief.productName} />
                {brief.productPageUrl ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {offerLabels.pageLink}
                    </p>
                    <a
                      href={brief.productPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink hover:underline"
                    >
                      {offerLabels.viewPage}
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                ) : (
                  <BriefField label={offerLabels.pageLink} />
                )}
                {isProductBrief ? (
                <BriefField
                  label="Ship physical product"
                  value={
                    brief.willShipPhysicalProductToCreator ? "Yes" : "No"
                  }
                />
                ) : null}
                <BriefField
                  label="Description"
                  value={brief.productDescription}
                />
              </div>
            </SectionCard>

            <SectionCard title="Creative" icon={Video}>
              <div className="space-y-5">
                <BriefField
                  label="Duration"
                  value={brief.durationBucket ? formatDuration(brief.durationBucket) : "—"}
                />
                <BriefField
                  label="Tone"
                  value={brief.toneStyle && brief.toneStyle.length > 0
                    ? (Array.isArray(brief.toneStyle) ? brief.toneStyle : [brief.toneStyle]).map(t => formatTone(t)).join(", ")
                    : "—"}
                />
                <BriefField
                  label="Location"
                  value={brief.shootLocationKind ? formatLocation(brief.shootLocationKind) : "—"}
                />
                {brief.shootLocationAddress ? (
                  <div className="flex gap-2.5 rounded-xl border border-pink/15 bg-pink/5 p-3.5 text-sm leading-relaxed text-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-pink" />
                    <span>{brief.shootLocationAddress}</span>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="References & notes" icon={FileText}>
            <div className="space-y-6">
              <BriefField label="Key points" value={brief.keyNoteToInclude} />
              <BriefField label="Call to action" value={brief.ctaNote} />

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Script
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {scriptSummary?.label || "—"}
                </p>
                {scriptSummary?.text ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                    {scriptSummary.text}
                  </p>
                ) : null}
              </div>

              <BriefField label="Final notes" value={brief.finalNotes} />
            </div>
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-4">
          <Card className="sticky top-24 overflow-hidden border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-5 py-4">
              <CardTitle className="text-base font-bold">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                <div className="size-11 shrink-0 overflow-hidden rounded-lg border border-pink/20 bg-pink/10">
                  {productImageUrl ? (
                    <NextImage
                      src={productImageUrl}
                      alt={brief.productName || "Product image"}
                      width={44}
                      height={44}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Avatar className="size-full rounded-lg border-0">
                      <AvatarImage
                        src={brandLogoUrl || undefined}
                        className="rounded-lg object-cover"
                      />
                      <AvatarFallback className="rounded-lg bg-transparent text-sm font-bold text-pink">
                        {getInitials(brandName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{brandName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order?.packageNameSnapshot || "UGC package"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-foreground">{statusLabel}</span>
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
                    <span className="font-bold text-foreground">
                      {formatCurrency(expectedAmount)}
                    </span>
                  </div>
                ) : null}
              </div>

              {!isAccepted ? (
                <>
                  <Separator />
                  <Button
                    onClick={handleAcceptBrief}
                    disabled={acceptBriefMutation.isPending}
                    className="h-11 w-full rounded-xl bg-pink font-bold text-white shadow-sm hover:bg-pink/90"
                  >
                    {acceptBriefMutation.isPending ? (
                      <>
                        <Spinner className="size-4" aria-hidden />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Accept brief
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <Sparkles className="size-4" />
                    Brief accepted
                  </div>
                  <p className="mt-1 text-emerald-700/80">
                    You can track delivery progress from the order page.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-4 h-10 w-full rounded-xl"
                  >
                    <Link href={ordersPageHref}>Go to order</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {orderStatus ? (
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold",
                    STATUS_COLORS[orderStatus],
                  )}
                >
                  {STATUS_LABELS[orderStatus] || orderStatus}
                </Badge>
                <span className="text-muted-foreground">
                  Current order status
                </span>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
