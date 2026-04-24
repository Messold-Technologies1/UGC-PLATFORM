import type { ReactNode } from "react";

export function BoneyardDashboardPreviewShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-0 flex min-h-0 overflow-hidden bg-background text-foreground">
      <div className="hidden w-64 shrink-0 border-r border-border/30 bg-background lg:block" />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function BoneyardAdminPreviewShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden fixed inset-y-0 left-0 w-64 border-r border-border/30 bg-background lg:block" />
      <main className="relative min-h-screen lg:ml-64">
        <div className="sticky top-0 z-40 h-16 border-b border-border/30 bg-background/80 backdrop-blur-md" />
        {children}
      </main>
    </div>
  );
}
