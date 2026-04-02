import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="space-y-10 pb-10">
      <DashboardPageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="hidden h-8 w-px md:block" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-10 w-full rounded-full md:max-w-md" />
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-border bg-card"
          >
            <Skeleton className="aspect-4/3 w-full rounded-none" />
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
              <Skeleton className="h-3.5 w-32" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-18 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </div>
          </div>
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
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-6"
          >
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
