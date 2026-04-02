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
          "fixed inset-y-0 left-0 z-50 flex h-svh min-h-0 w-65 max-w-[85vw] shrink-0 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar transition-[transform] duration-300 ease-out",
          "lg:static lg:z-auto lg:h-full lg:max-w-none lg:translate-x-0",
        )}
        aria-busy="true"
        aria-label="Loading sidebar"
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div
            className="bg-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
            <div className={cn("h-3.5 w-24", sk)} />
            <div className={cn("h-3 w-32 max-w-full", sk)} />
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-hidden px-3 py-4">
          <p className="mb-2 px-3 text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
            Menu
          </p>
          <div className="space-y-1">
            {(["w-36", "w-32", "w-28", "w-24"] as const).map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                aria-hidden
              >
                <div className={cn("size-4 shrink-0 rounded", sk)} />
                <div className={cn("h-4 shrink-0 rounded", sk, w)} />
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 space-y-2 border-t border-sidebar-border p-3">
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            aria-hidden
          >
            <div className={cn("size-4 shrink-0 rounded", sk)} />
            <div className={cn("h-3 flex-1 max-w-22 rounded", sk)} />
            <div className={cn("size-4 shrink-0 rounded", sk)} />
          </div>
          <div className="mx-3 h-px shrink-0 bg-sidebar-border" aria-hidden />
          <div className={cn("h-10 w-full rounded-xl", sk)} />
          <div className={cn("h-10 w-full rounded-xl", sk)} />
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
