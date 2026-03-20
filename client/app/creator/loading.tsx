export default function CreatorLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="mt-1.5 h-4 w-72 rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="size-9 rounded-xl bg-muted" />
            </div>
            <div className="mt-3 h-7 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-2xl border border-border bg-card" />
        <div className="h-48 rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}
