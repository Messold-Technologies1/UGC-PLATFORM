import type { Metadata } from "next";
import { DashboardSidebarBoundary } from "@/components/dashboard/sidebar-boundary";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";

export const metadata: Metadata = {
  title: {
    default: "Creator Dashboard",
    template: "%s — Creator | Collabry",
  },
  description: "Manage your portfolio, campaigns, and earnings.",
};

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh min-h-0 overflow-hidden">
      <DashboardSidebarBoundary />
      <main
        id="main-content"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
      >
        <PostLoginSetupShell role="creator">{children}</PostLoginSetupShell>
      </main>
    </div>
  );
}
