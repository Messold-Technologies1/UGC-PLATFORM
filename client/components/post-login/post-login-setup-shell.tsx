"use client";

import { type ReactNode } from "react";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";

const dashboardMainColumnClass =
  "w-full max-w-none px-4 pb-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

const dashboardContentClass: Record<PostAuthRole, string> = {
  creator: dashboardMainColumnClass,
  brand: dashboardMainColumnClass,
  admin: dashboardMainColumnClass,
};

export function PostLoginSetupShell({
  role,
  children,
}: {
  role: PostAuthRole;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background text-foreground">
      <div data-tour="dashboard-content" className={dashboardContentClass[role]}>
        {children}
      </div>
    </div>
  );
}
