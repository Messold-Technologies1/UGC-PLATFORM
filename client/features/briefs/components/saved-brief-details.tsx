"use client";

import { remapBuyerHref } from "@/features/auth/lib/buyer-workspace-path";

import { useBuyerWorkspaceBase } from "@/features/auth/hooks/use-buyer-workspace-base";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import NextImage from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Send,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import {
  formatDuration,
  formatLocation,
  formatTone,
  formatContentType,
} from "../lib/format-enums";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";
import { SubmitBriefToOrdersDialog } from "@/features/briefs/components/submit-brief-to-orders-dialog";
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
  const workspaceBase = useBuyerWorkspaceBase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isFromOrder = !!orderId;

  const { data: brief, isLoading, isError, error } = useGetBriefQuery(briefId);

  // A copy made by editing one order's brief. It is not a reusable template,
  // so it is never offered up for submitting to other orders.
  const isOrderScopedCopy = !!brief?.orderScopedOrderId;

  const { data: listBriefsData, isLoading: isLoadingBriefs } =
    useListBriefsQuery();
  const existingBriefs = listBriefsData?.items ?? [];

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const submitBriefMutation = useSubmitBriefMutation({
    onSuccess: () => {
      setIsConfirmOpen(false);
      router.push(remapBuyerHref(`/brand/orders/${orderId}`, workspaceBase));
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
                <Link href={remapBuyerHref("/brand/briefs", workspaceBase)}>
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

  const scriptSummary = formatBriefScript(brief.script);
  const offerLabels = getBriefOfferLabels(brief.isProduct ?? true);

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 md:py-8 flex-1 flex flex-col min-w-0">
        <div className="mx-auto flex w-full flex-col items-stretch gap-4 pb-8 pt-0 md:flex-row md:items-start md:gap-6 md:pb-6">
          <section className="flex min-w-0 flex-[2] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-white shadow-sm dark:bg-card">
            <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <div className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-primary/12 text-primary">
                <FileText size={19} />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading m-0 text-[17px] font-extrabold tracking-tight text-foreground">
                  {brief.productName || "Untitled Project"}
                </h2>
                <div className="mt-0.5 text-[12.5px] font-medium text-muted-foreground">
                  Created on {formatDate(brief.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-[22px]">
              <div className="mb-[22px] border-b border-dashed border-border pb-[22px] last:mb-0 last:border-b-0 last:pb-1">
                <h3 className="font-heading mb-4 flex items-center gap-2.5 text-[13px] font-extrabold tracking-wide text-foreground">
                  <div className="grid size-[22px] shrink-0 place-items-center rounded-[7px] bg-foreground text-[11px] font-extrabold leading-none text-[#c6ff3d]">1</div>
                  Brand Details
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
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
                    <div className="space-y-2 md:col-span-2">
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
                </div>
              </div>

              <div className="mb-[22px] border-b border-dashed border-border pb-[22px] last:mb-0 last:border-b-0 last:pb-1">
                <h3 className="font-heading mb-4 flex items-center gap-2.5 text-[13px] font-extrabold tracking-wide text-foreground">
                  <div className="grid size-[22px] shrink-0 place-items-center rounded-[7px] bg-foreground text-[11px] font-extrabold leading-none text-[#c6ff3d]">2</div>
                  {offerLabels.sectionInfoTitle}
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <DetailRow
                    label={offerLabels.name}
                    value={brief.productName}
                  />
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
                        View Page
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  ) : (
                    <DetailRow label={offerLabels.pageLink} value={null} />
                  )}
                  {brief.isProduct !== false ? (
                    <>
                      <DetailRow
                        label="Ship physical product"
                        value={
                          brief.willShipPhysicalProductToCreator ? "Yes" : "No"
                        }
                      />
                      {brief.willShipPhysicalProductToCreator ? (
                        <DetailRow
                          label="Want product returned"
                          value={
                            brief.wantsPhysicalProductReturned ? "Yes" : "No"
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Description
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {brief.productDescription || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-[22px] border-b border-dashed border-border pb-[22px] last:mb-0 last:border-b-0 last:pb-1">
                <h3 className="font-heading mb-4 flex items-center gap-2.5 text-[13px] font-extrabold tracking-wide text-foreground">
                  <div className="grid size-[22px] shrink-0 place-items-center rounded-[7px] bg-foreground text-[11px] font-extrabold leading-none text-[#c6ff3d]">3</div>
                  Creative Needs
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <DetailRow
                    label="Duration"
                    value={formatDuration(brief.durationBucket)}
                  />
                  <DetailRow
                    label="Tone"
                    value={formatTone(brief.toneStyle?.[0])}
                  />
                  <DetailRow
                    label="Location"
                    value={formatLocation(brief.shootLocationKind)}
                  />
                  {brief.shootLocationAddress ? (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Location Address
                      </p>
                      <div className="flex gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-sm max-w-md">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{brief.shootLocationAddress}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mb-[22px] border-b border-dashed border-border pb-[22px] last:mb-0 last:border-b-0 last:pb-1">
                <h3 className="font-heading mb-4 flex items-center gap-2.5 text-[13px] font-extrabold tracking-wide text-foreground">
                  <div className="grid size-[22px] shrink-0 place-items-center rounded-[7px] bg-foreground text-[11px] font-extrabold leading-none text-[#c6ff3d]">4</div>
                  References & Notes
                </h3>
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
                        {brief.referenceLinks.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-border/40 bg-background p-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
                          >
                            <ExternalLink className="size-4 shrink-0" />
                            <span className="truncate">{link}</span>
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
                    <p className="text-sm font-medium text-foreground">
                      {scriptSummary?.label || "N/A"}
                    </p>
                    {scriptSummary?.text ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90 bg-muted/30 p-4 rounded-xl border border-border/40">
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
                </div>
              </div>
            </div>
          </section>

          {isFromOrder && (
            <section className="sticky top-6 flex max-h-[calc(100vh-120px)] min-w-[320px] flex-1 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-white shadow-sm dark:bg-card max-md:static max-md:max-h-none">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-primary/12 text-primary">
                  <Package size={19} />
                </div>
                <div>
                  <h2 className="font-heading m-0 text-[17px] font-extrabold tracking-tight text-foreground">Brief Review</h2>
                  <div className="mt-0.5 text-[12.5px] font-medium text-muted-foreground">Submit to order</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-[22px]">
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl font-bold px-8 py-3 shadow-sm transition-all hover:opacity-90 bg-emerald-600 hover:bg-emerald-700 text-white mb-8 h-12"
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

                <div>
                  <h3 className="font-heading mb-1 text-[13px] font-bold tracking-wide text-foreground">
                    Existing Briefs
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Reference your previous campaign briefs.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    {isLoadingBriefs ? (
                      <div className="flex justify-center p-8">
                        <Spinner className="size-6" />
                      </div>
                    ) : existingBriefs.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground border border-border/40 rounded-xl bg-muted/20">
                        No existing briefs found.
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
                        {existingBriefs.map((b) => (
                          <div
                            key={b.id}
                            className={`flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30 group ${b.id === briefId ? "bg-muted/40" : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold truncate">
                                  {b.brandName || "Untitled Brief"}
                                </span>
                              </div>
                              {b.productName && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {b.productName}
                                </p>
                              )}
                            </div>
                            {b.id !== briefId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 size-7 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  router.push(
                                    remapBuyerHref(`/brand/briefs/${b.id}?orderId=${orderId}`, workspaceBase),
                                  )
                                }
                                aria-label={`View brief ${b.brandName || b.id}`}
                              >
                                <ArrowRight className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!isFromOrder && !isOrderScopedCopy && (
            <section className="sticky top-6 flex max-h-[calc(100vh-120px)] min-w-[320px] flex-1 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-white shadow-sm dark:bg-card max-md:static max-md:max-h-none">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-primary/12 text-primary">
                  <Package size={19} />
                </div>
                <div>
                  <h2 className="font-heading m-0 text-[17px] font-extrabold tracking-tight text-foreground">Submit brief</h2>
                  <div className="mt-0.5 text-[12.5px] font-medium text-muted-foreground">Send to your orders</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-[22px]">
                <p className="text-xs text-muted-foreground mb-4">
                  Submit this brief to one or more orders that are awaiting a
                  brief.
                </p>
                <Button
                  onClick={() => setIsPickerOpen(true)}
                  className="w-full rounded-xl font-bold px-8 py-3 shadow-sm transition-all hover:opacity-90 bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                >
                  <Send className="mr-2 size-4" />
                  Submit this brief
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <SubmitBriefToOrdersDialog
        briefId={briefId}
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSubmitted={() => router.push(remapBuyerHref("/brand/orders", workspaceBase))}
      />

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
            {brief.contentType && brief.contentType.length > 0 && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {formatContentType(brief.contentType[0])}
              </Badge>
            )}
            {brief.brandName && (
              <p className="text-xs text-muted-foreground">{brief.brandName}</p>
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
