"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorCardSkeleton } from "@/features/creators/components/creator-card";
import { CreatorListing } from "@/features/creators/components/creator-listing";
import {
  useCreatorsListQuery,
  type CreatorsListResult,
} from "@/features/creators/hooks/use-creators-list-query";

const PAGE = 1;
const LIMIT = 20;

export type BrandCreatorsBrowserProps = {
  initialData?: CreatorsListResult | null;
};

export function BrandCreatorsBrowser({
  initialData,
}: BrandCreatorsBrowserProps) {
  const { data, isPending, isError, error, refetch } = useCreatorsListQuery(
    PAGE,
    LIMIT,
    initialData ?? undefined,
  );

  if (isPending) {
    return (
      <div className="space-y-10" aria-busy="true" aria-label="Loading creators">
        <header className="space-y-3">
          <Skeleton className="h-12 w-full max-w-md md:h-14" />
          <Skeleton className="h-5 w-full max-w-2xl md:h-6" />
        </header>
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-36 rounded-full" />
              <Skeleton className="hidden h-8 w-px md:block" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-10 w-full flex-1 rounded-full md:min-w-0" />
          </div>
        </div>
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <CreatorCardSkeleton key={i} appearance="browse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card
        variant="dashedDestructive"
        className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-4 text-center"
      >
        <p className="text-sm font-medium text-foreground">
          Could not load creators
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-medium text-primary underline underline-offset-2"
        >
          Try again
        </button>
      </Card>
    );
  }

  return (
    <CreatorListing
      creators={data.creators}
      listMeta={{
        page: data.page,
        limit: data.limit,
        total: data.total,
      }}
    />
  );
}
