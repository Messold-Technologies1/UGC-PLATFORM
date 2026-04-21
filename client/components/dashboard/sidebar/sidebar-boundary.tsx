import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./sidebar";

const sk = cn(
  "rounded-md bg-muted/60 motion-safe:animate-pulse motion-reduce:opacity-90",
);

function DashboardSidebarFallback() {
  return (
    <>
      <div
        className={cn(
          "fixed left-3 top-3.5 z-50 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background shadow-sm lg:hidden",
          sk,
        )}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-svh min-h-0 w-64 max-w-[85vw] shrink-0 -translate-x-full flex-col bg-background transition-[transform] duration-300 ease-out",
          "lg:static lg:z-auto lg:h-full lg:max-w-none lg:translate-x-0",
        )}
        aria-busy="true"
        aria-label="Loading sidebar"
      >
        <div className="flex items-center gap-3 px-6 pb-8 pt-8">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10"
            aria-hidden
          >
            <div className={cn("size-4 rounded-sm", sk)} />
          </div>
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className={cn("h-4 w-28", sk)} />
            <div className={cn("h-2.5 w-24 max-w-full", sk)} />
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-hidden py-1">
          <div className="mx-6 mb-4 h-px bg-border/40" aria-hidden />
          <div className="space-y-1">
            {(["w-36", "w-32", "w-28", "w-24"] as const).map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-l-[3px] border-transparent px-6 py-3"
                aria-hidden
              >
                <div className={cn("size-4 shrink-0 rounded", sk)} />
                <div className={cn("h-4 shrink-0 rounded", sk, w)} />
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 space-y-2 border-t border-border/30 px-0 pb-3 pt-3">
          <div
            className="flex items-center gap-3 border-l-[3px] border-transparent px-6 py-3"
            aria-hidden
          >
            <div className={cn("size-4 shrink-0 rounded", sk)} />
            <div className={cn("h-3 flex-1 max-w-22 rounded", sk)} />
            <div className={cn("size-4 shrink-0 rounded", sk)} />
          </div>
          <div className="mx-6 h-px shrink-0 bg-border/40" aria-hidden />
          <div className="px-3">
            <div className={cn("h-10 w-full rounded-xl", sk)} />
          </div>
          <div className="px-3">
            <div className={cn("h-10 w-full rounded-xl", sk)} />
          </div>
        </div>
      </aside>
    </>
  );
}


export function DashboardSidebarBoundary() {
  return (
    <Suspense fallback={<DashboardSidebarFallback />}>
      <DashboardSidebar />
    </Suspense>
  );
}
