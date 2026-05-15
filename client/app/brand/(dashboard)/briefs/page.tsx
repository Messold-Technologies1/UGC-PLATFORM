"use client";

import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  FileText,
  MapPin,
  Plus,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useListBriefsQuery } from "@/features/briefs/hooks/use-list-briefs-query";

function formatEnumLabel(value: string | string[] | null | undefined) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function BriefsPage() {
  const { data, isLoading, isError, error } = useListBriefsQuery();
  const briefs = data?.items ?? [];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            My Briefs
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your saved campaign briefs to reuse across orders.
          </p>
        </div>
        <Button
          asChild
          className="rounded-xl font-bold shadow-sm transition-all hover:opacity-90"
        >
          <Link href="/brand/briefs/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Brief
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border/40 bg-card p-6">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Unable to load briefs
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {error?.message ||
              "The saved briefs request did not return usable data."}
          </p>
        </div>
      ) : briefs.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 p-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <FileText className="size-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            No briefs found
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            You haven&apos;t created any briefs yet. Create a brief to provide
            detailed instructions to creators.
          </p>
          <Button asChild className="mt-6 rounded-xl font-bold">
            <Link href="/brand/briefs/create">Create your first brief</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {briefs.map((brief) => (
            <Card
              key={brief.id}
              interactive="subtle"
              className="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm"
            >
              <CardHeader className="border-b border-border/10 bg-muted/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-2 bg-background font-semibold text-[10px]"
                    >
                      {formatEnumLabel(brief.contentType)}
                    </Badge>
                    <Link
                      href={`/brand/briefs/${brief.id}`}
                      className="outline-none"
                    >
                      <CardTitle className="text-lg font-extrabold tracking-tight">
                        {brief.productName || "Untitled Project"}
                      </CardTitle>
                    </Link>
                    <p className="text-sm font-medium text-muted-foreground">
                      {brief.brandName || "Brand Name"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Video className="size-4 opacity-70" />
                    <span>
                      Duration: {formatEnumLabel(brief.durationBucket)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 opacity-70" />
                    <span className="line-clamp-1">
                      {formatEnumLabel(brief.shootLocationKind)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/10 p-5 bg-muted/10">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>{formatDate(brief.createdAt)}</span>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="font-semibold text-primary"
                  >
                    <Link href={`/brand/briefs/${brief.id}`}>View</Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
