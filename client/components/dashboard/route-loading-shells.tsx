import { Skeleton } from "@/components/ui/skeleton";
import { CreatorCardSkeleton } from "@/features/creators/components/creator-card";

export function DashboardPageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function CreatorsBrowserLoadingShell() {
  return (
    <div
      className="space-y-10 pb-10"
      aria-busy="true"
      aria-label="Loading creators"
    >
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

export function PortfolioLoadingShell() {
  return (
    <div className="space-y-8">
      <DashboardPageHeaderSkeleton />
      <div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid justify-items-center gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="w-full max-w-75 overflow-hidden rounded-2xl border border-border bg-card"
          >
            <Skeleton className="h-105 w-full rounded-none sm:h-115" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccountProfileLoadingShell() {
  return (
    <div className="space-y-8">
      <DashboardPageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
            <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Skeleton className="h-4 w-20" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsProfileLoadingShell() {
  return (
    <div className="space-y-8">
      <DashboardPageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="mt-8 flex justify-end">
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function DashboardHomeLoadingShell() {
  return (
    <div className="space-y-8">
      <DashboardPageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-full max-w-sm" />
            <Skeleton className="mt-5 h-5 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-36" />
        <div className="mt-6 flex flex-col items-center justify-center py-8">
          <Skeleton className="size-12 rounded-2xl" />
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-full max-w-xs" />
        </div>
      </div>
    </div>
  );
}

export function CampaignsLoadingShell() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DashboardPageHeaderSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <Skeleton className="size-14 rounded-2xl" />
        <Skeleton className="mt-4 h-4 w-40" />
        <Skeleton className="mt-2 h-4 w-full max-w-xs" />
        <Skeleton className="mt-4 h-9 w-40 rounded-lg" />
      </div>
    </div>
  );
}

export function BriefFormLoadingShell() {
  return (
    <div className="space-y-8">
      <DashboardPageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="mt-8 flex justify-between gap-3">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioUploadLoadingShell() {
  return (
    <div className="space-y-8">
      <DashboardPageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreatorProfileLoadingShell() {
  return (
    <div
      className="w-full min-w-0"
      aria-busy="true"
      aria-label="Loading creator profile"
    >
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-8">
          {/* Profile Header Skeleton */}
          <div className="rounded-3xl border-0 bg-card p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch lg:gap-8">
              <div className="relative flex w-full shrink-0 flex-col items-center sm:w-56 lg:w-64">
                <Skeleton className="min-h-[240px] w-full rounded-2xl lg:min-h-[260px]" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="mt-4 h-4 w-32" />
                  <div className="mt-6 flex flex-wrap items-center gap-6 sm:gap-10">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-8" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col justify-center gap-5 border-l border-border/50 pl-8 lg:flex w-72 xl:w-80">
                  <div>
                    <Skeleton className="mb-2 h-3 w-16" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="mb-2 h-3 w-24" />
                    <div className="flex flex-wrap gap-1.5">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editor/Tabs Skeleton */}
          <div>
            <div className="flex gap-6 border-b border-border pb-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-4 h-10 w-full" />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <Skeleton className="mb-6 h-4 w-24" />
              <div className="space-y-6">
                <div className="flex gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
