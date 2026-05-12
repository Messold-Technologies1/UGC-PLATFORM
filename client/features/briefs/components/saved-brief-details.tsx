"use client";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import NextImage from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Package,
  Send,
  Video,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetBriefQuery } from "@/features/briefs/hooks/use-get-brief-query";
import { useListBriefsQuery } from "@/features/briefs/hooks/use-list-briefs-query";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "N/A";
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
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

export function SavedBriefDetails({ briefId }: { briefId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isFromOrder = !!orderId;

  const { data: brief, isLoading, isError, error } = useGetBriefQuery(briefId);

  const { data: listBriefsData, isLoading: isLoadingBriefs } =
    useListBriefsQuery();
  const existingBriefs = listBriefsData?.items ?? [];

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const submitBriefMutation = useSubmitBriefMutation({
    onSuccess: () => {
      setIsConfirmOpen(false);
      router.push(`/brand/orders/${orderId}`);
    },
  });

  const isSubmitting = submitBriefMutation.isPending;

  function handleSubmitBrief() {
    if (!orderId) return;
    submitBriefMutation.mutate({ orderId, briefId });
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[480px] max-w-5xl items-center justify-center p-6 md:p-10">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !brief) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-10">
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
                  "The saved brief request did not return usable data."}
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/brand/briefs">
                  <ArrowLeft className="size-4" />
                  Back to briefs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`mx-auto p-6 md:p-10 ${isFromOrder ? "max-w-[1400px]" : "max-w-5xl"}`}
      >
      <div className={isFromOrder ? "flex gap-0 lg:items-start" : ""}>
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              {/* <Button asChild variant="ghost" className="w-fit px-0">
                <Link href="/brand/briefs">
                  <ArrowLeft className="size-4" />
                  Back to briefs
                </Link>
              </Button> */}
              <div>
                {/* <Badge variant="outline" className="mb-3 bg-background">
                  {formatEnumLabel(brief.contentType)}
                </Badge> */}
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {brief.productName || "Untitled Project"}
                </h1>
                {/* <p className="mt-2 text-muted-foreground">
                  {brief.brandName || "Brand Name"}
                </p> */}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-4" />
                <span>Created {formatDate(brief.createdAt)}</span>
              </div>
              {brief.updatedAt && brief.updatedAt !== brief.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  <span>Updated {formatDate(brief.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Brand Info Card */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ImageIcon className="size-5 text-primary" />
                  Brand
                </CardTitle>
                <CardDescription>
                  Brand identity and pronunciation details.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <DetailRow label="Brand Name" value={brief.brandName} />
                <DetailRow label="Industry" value={brief.industry} />
                {brief.brandLogoUrl ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Brand Logo
                    </p>
                    <NextImage
                      src={brief.brandLogoUrl}
                      alt={`${brief.brandName || "Brand"} logo`}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-lg border border-border/40 object-contain bg-muted/20 p-1"
                      unoptimized
                    />
                  </div>
                ) : (
                  <DetailRow label="Brand Logo" value={null} />
                )}
                {brief.brandPronunciationAudioUrl ? (
                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Volume2 className="size-3" />
                      Brand Pronunciation Audio
                    </p>
                    <audio
                      controls
                      src={brief.brandPronunciationAudioUrl}
                      className="w-full max-w-md h-10"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  <DetailRow label="Pronunciation Audio" value={null} />
                )}
              </CardContent>
            </Card>

            {/* Product Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="size-5 text-primary" />
                  Product
                </CardTitle>
                <CardDescription>
                  Core product details saved with this brief.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Video className="size-5 text-primary" />
                  Creative
                </CardTitle>
                <CardDescription>Format, tone, and shoot setting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <DetailRow
                  label="Duration"
                  value={formatEnumLabel(brief.durationBucket)}
                />
                <DetailRow
                  label="Tone"
                  value={formatEnumLabel(brief.toneStyle)}
                />
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="size-5 text-primary" />
                References and Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        className="flex items-center gap-2 rounded-xl border border-border/40 bg-background p-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
                      >
                        <ExternalLink className="size-4" />
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
                  Final notes
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {brief.finalNotes || "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          {isFromOrder && (
            <div className="flex justify-end">
              <Button
                onClick={() => setIsConfirmOpen(true)}
                disabled={isSubmitting}
                className="rounded-xl font-bold px-8 py-3 shadow-sm transition-all hover:opacity-90 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 size-4" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    Submit This Brief
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {isFromOrder && (
          <div className="hidden lg:flex items-start ml-auto">
            {/* Vertical separator */}
            <div className="flex items-start justify-center pt-10 px-6">
              <Separator orientation="vertical" className="h-64 bg-border/50" />
            </div>

            {/* Existing briefs panel — sticky on the right */}
            <div className="w-[340px] shrink-0">
              <div className="sticky top-8 space-y-5">
                <div>
                  <h3 className="text-lg font-bold">Existing Briefs</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reference your previous campaign briefs.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                  {isLoadingBriefs ? (
                    <div className="flex justify-center p-8">
                      <Spinner className="size-6" />
                    </div>
                  ) : existingBriefs.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No existing briefs found.
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
                      {existingBriefs.map((b) => (
                        <div
                          key={b.id}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 group ${b.id === briefId ? "bg-muted/40" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate">
                                {b.brandName || "Untitled Brief"}
                              </span>
                              {/* {b.contentType && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] uppercase"
                                >
                                  {formatEnumLabel(b.contentType)}
                                </Badge>
                              )} */}
                            </div>
                            {b.productName && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {b.productName}
                              </p>
                            )}
                          </div>
                          {b.id !== briefId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 size-8 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                router.push(
                                  `/brand/briefs/${b.id}?orderId=${orderId}`,
                                )
                              }
                              aria-label={`View brief ${b.brandName || b.id}`}
                            >
                              <ArrowRight className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Confirmation dialog for brief submission */}
      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (isSubmitting) return;
          setIsConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Brief to Order</DialogTitle>
            <DialogDescription>
              You are about to submit this brief to the order. This will start
              the delivery timeline and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {brief.productName || "Untitled Project"}
            </p>
            {brief.contentType && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {formatEnumLabel(brief.contentType)}
              </Badge>
            )}
            {brief.brandName && (
              <p className="text-xs text-muted-foreground">
                {brief.brandName}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitBrief}
              disabled={isSubmitting}
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 size-4" aria-hidden />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Confirm & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
