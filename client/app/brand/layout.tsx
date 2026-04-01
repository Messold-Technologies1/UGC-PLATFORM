import type { Metadata } from "next";
import { DashboardSidebarBoundary } from "@/components/dashboard/sidebar";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";
import { requireAuthenticatedUser } from "@/lib/server-auth-guard";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "Brand Dashboard",
    template: "%s — Brand | Collabry",
  },
  description: "Manage your campaigns, browse creators, and track performance.",
};

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthenticatedUser("/brand/dashboard");

  return (
    <AppProviders withAuth>
      <div className="fixed inset-0 z-0 flex min-h-0 overflow-hidden bg-background">
        <DashboardSidebarBoundary />
        <main
          id="main-content"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
        >
          <PostLoginSetupShell role="brand">{children}</PostLoginSetupShell>
        </main>
      </div>
    </AppProviders>
  );
}
