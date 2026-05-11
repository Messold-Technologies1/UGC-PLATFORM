"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Video,
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
import { Spinner } from "@/components/ui/spinner";
import { useGetBriefQuery } from "@/features/briefs/hooks/use-get-brief-query";

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
  const { data: brief, isLoading, isError, error } = useGetBriefQuery(briefId);

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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="w-fit px-0">
            <Link href="/brand/briefs">
              <ArrowLeft className="size-4" />
              Back to briefs
            </Link>
          </Button>
          <div>
            <Badge variant="outline" className="mb-3 bg-background">
              {formatEnumLabel(brief.contentType)}
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {brief.productName || "Untitled Project"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {brief.brandName || "Brand Name"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          <span>Created {formatDate(brief.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
            <DetailRow label="Industry" value={brief.industry} />
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
    </div>
  );
}
