"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronDown,
  Clock,
  Clapperboard,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  ScrollText,
  StickyNote,
  Volume2,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import {
  formatContentType,
  formatDuration,
  formatLocation,
  formatTone,
} from "@/features/briefs/lib/format-enums";
import { cn } from "@/lib/utils";
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
import type { OrderBriefPayload } from "@/features/orders/api/get-order-brief";

type BriefSectionId =
  | "brand"
  | "creative"
  | "script"
  | "references"
  | "notes";

function getBriefSections(isProductBrief: boolean) {
  return [
    {
      id: "brand" as const,
      label: isProductBrief ? "Brand & Product" : "Brand & Service",
      icon: FileText,
    },
    {
      id: "creative" as const,
      label: "Creative Requirements",
      icon: Clapperboard,
    },
    { id: "script" as const, label: "Script", icon: ScrollText },
    { id: "references" as const, label: "References", icon: Link2 },
    { id: "notes" as const, label: "Additional Notes", icon: StickyNote },
  ];
}

interface OrderBriefReviewProps {
  orderId: string;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
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

function asList(value?: string | string[] | null) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function joinFormatted(
  values: string[],
  format: (value: string) => string,
) {
  if (values.length === 0) return "—";
  return values.map(format).join(", ");
}

const CompactBriefCards = createContext(false);

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const compact = useContext(CompactBriefCards);

  return (
    <section
      className={cn(
        compact
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : "rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <h2
        className={cn(
          "font-bold tracking-tight text-foreground",
          compact ? "mb-4 text-sm" : "mb-5 text-base",
        )}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[min(180px,32%)_1fr] sm:items-start sm:gap-8">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium leading-relaxed text-foreground">
        {children ?? "—"}
      </dd>
    </div>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function BriefAccordionItem({
  label,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: typeof FileText;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon
            className={cn(
              "size-4 shrink-0",
              open ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "text-sm font-semibold",
              open ? "text-primary" : "text-foreground",
            )}
          >
            {label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border/50 px-4 py-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function BriefReviewSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="flex flex-col gap-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function BrandProductSection({
  brief,
  brandName,
  brandLogoUrl,
  productImageUrl,
}: {
  brief: OrderBriefPayload;
  brandName: string;
  brandLogoUrl?: string | null;
  productImageUrl?: string | null;
}) {
  const isProductBrief = brief.isProduct ?? true;
  const offerLabels = getBriefOfferLabels(isProductBrief);

  return (
    <div className="flex flex-col gap-5">
      <Card title="Brand Details">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="size-14 rounded-full border border-border/50">
              <AvatarImage
                src={brandLogoUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {getInitials(brandName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                {brandName}
              </p>
              {brief.industry ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  {brief.industry}
                </p>
              ) : null}
            </div>
          </div>

              <dl className="grid min-w-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-2 lg:max-w-md">
            <div>
              <dt className="text-sm text-muted-foreground">Industry</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {brief.industry?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Website</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">—</dd>
            </div>
          </dl>
        </div>

        {brief.brandPronunciationAudio?.url ? (
          <div className="mt-6 border-t border-border/50 pt-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Volume2 className="size-3.5" />
              Brand pronunciation
            </p>
            <audio
              controls
              src={brief.brandPronunciationAudio.url}
              className="h-10 w-full max-w-md"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        ) : null}
      </Card>

      <Card title={offerLabels.sectionTitle}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {productImageUrl ? (
            <NextImage
              src={productImageUrl}
              alt={brief.productName || offerLabels.image}
              width={112}
              height={112}
              className="size-28 shrink-0 rounded-xl border border-border/40 bg-muted/20 object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
              No image
            </div>
          )}

          <dl className="flex min-w-0 flex-1 flex-col gap-4">
            <Field label={offerLabels.name}>
              {brief.productName?.trim() || "—"}
            </Field>
            {isProductBrief ? (
              <Field label="Ship Physical Product">
                {brief.willShipPhysicalProductToCreator ? "Yes" : "No"}
              </Field>
            ) : null}
            {brief.productPageUrl ? (
              <Field label={offerLabels.pageLink}>
                <a
                  href={brief.productPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  View page
                  <ExternalLink className="size-3.5" />
                </a>
              </Field>
            ) : null}
            <Field label="Description">
              <p className="whitespace-pre-wrap">
                {brief.productDescription?.trim() || "—"}
              </p>
            </Field>
          </dl>
        </div>
      </Card>
    </div>
  );
}

function CreativeSection({ brief }: { brief: OrderBriefPayload }) {
  const tones = asList(brief.toneStyle);
  const contentTypes = asList(brief.contentType);

  return (
    <Card title="Creative Requirements">
      <dl className="flex flex-col gap-5">
        <Field label="Duration">
          {brief.durationBucket ? formatDuration(brief.durationBucket) : "—"}
        </Field>
        <Field label="Content type">
          {joinFormatted(contentTypes, formatContentType)}
        </Field>
        <Field label="Tone">{joinFormatted(tones, formatTone)}</Field>
        <Field label="Location">
          {brief.shootLocationKind
            ? formatLocation(brief.shootLocationKind)
            : "—"}
        </Field>
        {brief.shootLocationAddress ? (
          <Field label="Location address">
            <div className="flex gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{brief.shootLocationAddress}</span>
            </div>
          </Field>
        ) : null}
        <Field label="Key points">
          <p className="whitespace-pre-wrap">
            {brief.keyNoteToInclude?.trim() || "—"}
          </p>
        </Field>
        <Field label="Call to action">
          <p className="whitespace-pre-wrap">
            {brief.ctaNote?.trim() || "—"}
          </p>
        </Field>
      </dl>
    </Card>
  );
}

function ScriptSection({ brief }: { brief: OrderBriefPayload }) {
  const scriptSummary = formatBriefScript(brief.script);

  return (
    <Card title="Script">
      {scriptSummary?.label || scriptSummary?.text ? (
        <div className="space-y-3">
          {scriptSummary.label ? (
            <p className="text-sm font-semibold text-foreground">
              {scriptSummary.label}
            </p>
          ) : null}
          {scriptSummary.text ? (
            <p className="whitespace-pre-wrap rounded-xl border border-border/50 bg-muted/30 p-4 text-sm leading-7 text-foreground/90">
              {scriptSummary.text}
            </p>
          ) : (
            <EmptyCopy>No script text was provided.</EmptyCopy>
          )}
        </div>
      ) : (
        <EmptyCopy>No script was added to this brief.</EmptyCopy>
      )}
    </Card>
  );
}

function ReferencesSection({ brief }: { brief: OrderBriefPayload }) {
  return (
    <Card title="References">
      {brief.referenceLinks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {brief.referenceLinks.map((referenceLink) => (
            <a
              key={referenceLink}
              href={referenceLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border/40 bg-background px-3.5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              <ExternalLink className="size-4 shrink-0" />
              <span className="truncate">{referenceLink}</span>
            </a>
          ))}
        </div>
      ) : (
        <EmptyCopy>No references added.</EmptyCopy>
      )}
    </Card>
  );
}

function NotesSection({ brief }: { brief: OrderBriefPayload }) {
  return (
    <Card title="Additional Notes">
      {brief.finalNotes?.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {brief.finalNotes}
        </p>
      ) : (
        <EmptyCopy>No additional notes were added.</EmptyCopy>
      )}
    </Card>
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
  const orderHref = getCreatorOrdersPageHref(
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
  const [activeSection, setActiveSection] =
    useState<BriefSectionId>("brand");
  const [openAccordions, setOpenAccordions] = useState<BriefSectionId[]>(
    [],
  );
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
      <div className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
                <Link href={orderHref}>
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
      <div className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
                <Link href={orderHref}>
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
  const brandName = brief.brandName || brand?.brandName || "Brand";
  const orderStatus = order?.status;
  const isCancelled =
    orderStatus === "REJECTED" ||
    orderStatus === "REFUNDED" ||
    orderStatus === "CANCELLED_CREDITED";
  const canRespond = !isAccepted && !isCancelled;
  const durationLabel = brief.durationBucket
    ? formatDuration(brief.durationBucket)
    : "—";
  const locationLabel = brief.shootLocationKind
    ? formatLocation(brief.shootLocationKind)
    : "—";
  const headerImage = productImageUrl || brandLogoUrl;
  const busy =
    acceptBriefMutation.isPending || rejectBriefMutation.isPending;

  const stats = [
    {
      icon: Wallet,
      value: expectedAmount > 0 ? formatCurrency(expectedAmount) : "—",
      label: "Est. payout",
    },
    {
      icon: Clock,
      value: durationLabel,
      label: "Duration",
    },
    {
      icon: MapPin,
      value: locationLabel,
      label: "Location",
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/creator/orders"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Orders
        </Link>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:justify-end">
          {canRespond ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsRejectOpen(true)}
                disabled={busy}
                className="h-10 w-full rounded-full border-primary/40 px-4 font-semibold text-primary hover:bg-primary/5 hover:text-primary sm:h-9 sm:w-auto"
              >
                Reject Order
              </Button>
              <Button
                onClick={handleAcceptBrief}
                disabled={busy}
                className="h-10 w-full rounded-full bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-9 sm:w-auto"
              >
                {acceptBriefMutation.isPending ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    Accepting...
                  </>
                ) : (
                  "Accept Brief"
                )}
              </Button>
            </>
          ) : isAccepted ? (
            <Button
              asChild
              className="col-span-2 h-10 w-full rounded-full bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 sm:col-span-1 sm:h-9 sm:w-auto"
            >
              <Link href={orderHref}>Go to order</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            {headerImage ? (
              <NextImage
                src={headerImage}
                alt={brief.productName || brandName}
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-xl border border-border/40 bg-muted/20 object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-primary/10 text-sm font-bold text-primary">
                {getInitials(brandName)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                {brief.productName ||
                  order?.packageNameSnapshot ||
                  "Project brief"}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {brandName}
                <span className="mx-1.5">·</span>
                Submitted {formatDate(data.briefSubmittedAt)}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {isProductBrief ? "Product" : "Service"}
                </span>
                {brief.industry ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {brief.industry}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:min-w-120">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <stat.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 lg:hidden">
        {getBriefSections(isProductBrief).map((section) => {
          const isOpen = openAccordions.includes(section.id);
          return (
            <BriefAccordionItem
              key={section.id}
              label={section.label}
              icon={section.icon}
              open={isOpen}
              onToggle={() =>
                setOpenAccordions((prev) =>
                  prev.includes(section.id)
                    ? prev.filter((id) => id !== section.id)
                    : [...prev, section.id],
                )
              }
            >
              <CompactBriefCards.Provider value={true}>
                {section.id === "brand" ? (
                  <BrandProductSection
                    brief={brief}
                    brandName={brandName}
                    brandLogoUrl={brandLogoUrl}
                    productImageUrl={productImageUrl}
                  />
                ) : null}
                {section.id === "creative" ? (
                  <CreativeSection brief={brief} />
                ) : null}
                {section.id === "script" ? (
                  <ScriptSection brief={brief} />
                ) : null}
                {section.id === "references" ? (
                  <ReferencesSection brief={brief} />
                ) : null}
                {section.id === "notes" ? (
                  <NotesSection brief={brief} />
                ) : null}
              </CompactBriefCards.Provider>
            </BriefAccordionItem>
          );
        })}
      </div>

      <div className="hidden items-start gap-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Brief sections"
          className="rounded-2xl border border-border/60 bg-card p-2 shadow-sm lg:sticky lg:top-24"
        >
          <ul className="flex flex-col">
            {getBriefSections(isProductBrief).map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id} className="w-full">
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          {activeSection === "brand" ? (
            <BrandProductSection
              brief={brief}
              brandName={brandName}
              brandLogoUrl={brandLogoUrl}
              productImageUrl={productImageUrl}
            />
          ) : null}
          {activeSection === "creative" ? (
            <CreativeSection brief={brief} />
          ) : null}
          {activeSection === "script" ? <ScriptSection brief={brief} /> : null}
          {activeSection === "references" ? (
            <ReferencesSection brief={brief} />
          ) : null}
          {activeSection === "notes" ? <NotesSection brief={brief} /> : null}
        </div>
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
