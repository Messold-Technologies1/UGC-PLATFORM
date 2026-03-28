import { Skeleton } from "@/components/ui/skeleton";

/** SSR-friendly placeholder while the featured creators chunk loads. */
export function FeaturedCreatorsLoading() {
  return (
    <section
      className="mx-auto max-w-site px-4 py-24 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading featured creators"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 max-w-full sm:h-10" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="hidden h-10 w-32 rounded-md sm:block" />
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-4/3 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-[70%]" />
                  <Skeleton className="h-3 w-[45%]" />
                </div>
                <Skeleton className="h-7 w-20 shrink-0 rounded-md" />
              </div>
              <Skeleton className="h-3 w-36" />
              <div className="flex flex-wrap gap-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
