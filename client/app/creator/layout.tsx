import type { Metadata } from "next";
import { DashboardSidebarBoundary } from "@/components/dashboard/sidebar";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";
import { requireCreatorWorkspace } from "@/lib/server-auth-guard";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "Creator Dashboard",
    template: "%s — Creator | Collabry",
  },
  description: "Manage your portfolio, campaigns, and earnings.",
};

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCreatorWorkspace("/creator/dashboard");

  return (
    <AuthenticatedAppProviders>
      <div className="fixed inset-0 z-0 flex min-h-0 overflow-hidden bg-background text-foreground">
        <DashboardSidebarBoundary />
        <main
          id="main-content"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background"
        >
          <PostLoginSetupShell role="creator">{children}</PostLoginSetupShell>
        </main>
      </div>
    </AuthenticatedAppProviders>
  );
}
