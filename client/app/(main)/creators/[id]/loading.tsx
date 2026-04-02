import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorProfileLoading() {
  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Skeleton className="size-24 shrink-0 rounded-full sm:size-28" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
            <Skeleton className="mt-2 h-4 w-full max-w-xl" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-6 w-18 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-5">
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>
          <div className="hidden shrink-0 grid-cols-2 gap-3 sm:grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-muted/40 px-4 py-3"
              >
                <Skeleton className="h-6 w-16" />
                <Skeleton className="mt-2 h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex border-b border-border">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="mx-2 my-3 h-5 w-24" />
            ))}
          </div>
          <div className="mt-6 grid gap-2 justify-items-center sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-card"
              >
                <Skeleton className="h-[420px] w-full rounded-none sm:h-[460px]" />
              </div>
            ))}
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-80">
          <div className="rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
