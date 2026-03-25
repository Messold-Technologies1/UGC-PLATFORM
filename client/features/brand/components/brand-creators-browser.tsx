"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorCardSkeleton } from "@/features/creators/components/creator-card";
import { CreatorListing } from "@/features/creators/components/creator-listing";
import { useCreatorsListQuery } from "@/features/creators/hooks/use-creators-list-query";

const PAGE = 1;
const LIMIT = 20;

export function BrandCreatorsBrowser() {
  const { data, isPending, isError, error, refetch } = useCreatorsListQuery(
    PAGE,
    LIMIT,
  );

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading creators">
        <Skeleton className="h-4 w-52 max-w-full" />
        <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <Skeleton className="h-9 w-36 rounded-full" />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-9 w-full rounded-md sm:w-64" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        </div>
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <CreatorCardSkeleton key={i} />
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
