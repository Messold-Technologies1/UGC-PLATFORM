"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  creatorsListQueryKey,
  fetchCreatorsList,
  useCreatorsListQuery,
} from "../hooks/use-creators-list-query";
import { CreatorCard } from "./creator-card";

const PAGE = 1;
const LIMIT = 4;
/** Matches `BrandCreatorsBrowser` so hover prefetch warms the browse page cache. */
const BROWSE_PAGE = 1;
const BROWSE_LIMIT = 20;

export function FeaturedCreators() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useCreatorsListQuery(
    PAGE,
    LIMIT,
  );

  const prefetchBrandCreatorsPage = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: creatorsListQueryKey(BROWSE_PAGE, BROWSE_LIMIT),
      queryFn: () =>
        fetchCreatorsList({ page: BROWSE_PAGE, limit: BROWSE_LIMIT }),
      staleTime: 30_000,
    });
  }, [queryClient]);

  return (
    <section className="mx-auto max-w-site px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Featured{" "}
            <span className="underline decoration-2 underline-offset-4">
              Creators
            </span>
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Top-rated creators ready to produce scroll-stopping content for your
            brand.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="hidden gap-1.5 sm:inline-flex"
        >
          <Link
            href="/brand/creators"
            prefetch
            onMouseEnter={prefetchBrandCreatorsPage}
            onFocus={prefetchBrandCreatorsPage}
          >
            Browse All
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {isPending ? (
        <Card
          variant="dashed"
          className="mt-10 flex min-h-[280px] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading creators…</p>
        </Card>
      ) : isError ? (
        <Card
          variant="dashedDestructive"
          className="mt-10 flex min-h-[280px] flex-col items-center justify-center gap-3 px-4 text-center"
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
      ) : data.creators.length === 0 ? (
        <Card
          variant="dashed"
          className="mt-10 flex min-h-[200px] flex-col items-center justify-center px-4 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No creators to show yet. Check back soon.
          </p>
          <Button asChild variant="outline" className="mt-4 gap-1.5">
            <Link
              href="/brand/creators"
              prefetch
              onMouseEnter={prefetchBrandCreatorsPage}
              onFocus={prefetchBrandCreatorsPage}
            >
              Browse creators
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.creators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              variant="featured"
            />
          ))}
        </div>
      )}

      <div className="mt-8 text-center sm:hidden">
        <Button asChild variant="outline" className="gap-1.5">
          <Link
            href="/brand/creators"
            prefetch
            onMouseEnter={prefetchBrandCreatorsPage}
            onFocus={prefetchBrandCreatorsPage}
          >
            Browse All Creators
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
