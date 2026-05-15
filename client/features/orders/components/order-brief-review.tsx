"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Package,
  Video,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useAcceptBriefMutation } from "@/features/orders/hooks/use-accept-brief-mutation";

interface OrderBriefReviewProps {
  orderId: string;
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

function formatDate(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value || "N/A"}</p>
    </div>
  );
}

export function OrderBriefReview({ orderId }: OrderBriefReviewProps) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetOrderBriefQuery(orderId);
  const acceptBriefMutation = useAcceptBriefMutation({
    onSuccess: () => {
      router.push(`/creator/orders/${orderId}`);
    },
  });

  const brief = data?.brief;
  const isAccepted = Boolean(data?.briefAcceptedAt);

  function handleAcceptBrief() {
    if (!brief || isAccepted || acceptBriefMutation.isPending) return;
    acceptBriefMutation.mutate({ orderId });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border bg-card p-8">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
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
              <Link href={`/creator/orders/${orderId}`}>
                <ArrowLeft className="size-4" />
                Back to order
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="rounded-2xl border bg-card p-8">
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
              <Link href={`/creator/orders/${orderId}`}>
                <ArrowLeft className="size-4" />
                Back to order
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const brandLogoUrl = brief.brandLogo?.url;
  const pronunciationAudioUrl = brief.brandPronunciationAudio?.url;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          {/* <Button asChild variant="ghost" className="mb-4 w-fit px-0">
            <Link href={`/creator/orders/${orderId}`}>
              <ArrowLeft className="size-4" />
              Back to order
            </Link>
          </Button> */}
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit rounded-full">
              {isAccepted ? "Accepted" : "Awaiting acceptance"}
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {brief.productName || "Project Brief"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Submitted {formatDate(data.briefSubmittedAt)}
              {isAccepted
                ? ` - Accepted ${formatDate(data.briefAcceptedAt)}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <ImageIcon className="size-5 text-primary" />
          <h2 className="text-xl font-bold">Brand</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <DetailRow label="Brand name" value={brief.brandName} />
          <DetailRow label="Industry" value={brief.industry} />
          {brandLogoUrl ? (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Brand logo
              </p>
              <NextImage
                src={brandLogoUrl}
                alt={`${brief.brandName || "Brand"} logo`}
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
            <div className="space-y-2 md:col-span-3">
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
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <h2 className="text-xl font-bold">Product</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <DetailRow label="Product name" value={brief.productName} />
            <DetailRow label="Product page" value={brief.productPageUrl} />
            <DetailRow
              label="Ship physical product"
              value={brief.willShipPhysicalProductToCreator ? "Yes" : "No"}
            />
            <div className="space-y-1 md:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {brief.productDescription || "N/A"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Video className="size-5 text-primary" />
            <h2 className="text-xl font-bold">Creative</h2>
          </div>
          <div className="space-y-5">
            <DetailRow
              label="Duration"
              value={formatEnumLabel(brief.durationBucket)}
            />
            <DetailRow label="Tone" value={formatEnumLabel(brief.toneStyle)} />
            <DetailRow
              label="Location"
              value={formatEnumLabel(brief.shootLocationKind)}
            />
            {brief.shootLocationAddress ? (
              <div className="flex gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{brief.shootLocationAddress}</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <h2 className="text-xl font-bold">References and Notes</h2>
        </div>
        <div className="space-y-6">
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
                {brief.referenceLinks.map((referenceLink) => (
                  <a
                    key={referenceLink}
                    href={referenceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-border/40 bg-background p-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
                  >
                    <ExternalLink className="size-4" />
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
              Final notes
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {brief.finalNotes || "N/A"}
            </p>
          </div>
        </div>
      </section>

      {!isAccepted ? (
        <div className="flex justify-end">
          <Button
            onClick={handleAcceptBrief}
            disabled={acceptBriefMutation.isPending}
            className="rounded-xl font-bold shadow-sm"
          >
            {acceptBriefMutation.isPending ? (
              <>
                <Spinner className="size-4" aria-hidden />
                Accepting...
              </>
            ) : (
              <>Accept Brief</>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
