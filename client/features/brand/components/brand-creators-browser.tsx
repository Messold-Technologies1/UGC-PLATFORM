"use client";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
      <Card
        variant="dashed"
        className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm">Loading creators…</p>
      </Card>
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
