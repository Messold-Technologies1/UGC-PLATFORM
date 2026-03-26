import type { Metadata } from "next";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";

export const metadata: Metadata = {
  title: {
    default: "Brand Dashboard",
    template: "%s — Brand | UGC Platform",
  },
  description: "Manage your campaigns, browse creators, and track performance.",
};

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh min-h-0 overflow-hidden">
      <DashboardSidebar />
      <main
        id="main-content"
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <PostLoginSetupShell role="brand">
          <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </PostLoginSetupShell>
      </main>
    </div>
  );
}
