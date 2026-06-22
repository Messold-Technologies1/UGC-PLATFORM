"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";

const dashboardMainColumnClass =
  "w-full max-w-none px-4 pb-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

const dashboardContentClass: Record<PostAuthRole, string> = {
  creator: dashboardMainColumnClass,
  brand: "w-full max-w-none",
  admin: dashboardMainColumnClass,
};

export function PostLoginSetupShell({
  role,
  children,
}: {
  role: PostAuthRole;
  children: ReactNode;
}) {
  const pathname = usePathname();
  let contentClass = dashboardContentClass[role];
  
  if (role === "creator" && pathname?.startsWith("/creator/messages")) {
    contentClass = "w-full max-w-none";
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background text-foreground">
      <div data-tour="dashboard-content" className={contentClass}>
        {children}
      </div>
    </div>
  );
}
