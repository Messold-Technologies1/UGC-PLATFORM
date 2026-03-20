import type { Metadata } from "next";
import { CreatorSidebar } from "@/components/dashboard/creator-sidebar";

export const metadata: Metadata = {
  title: {
    default: "Creator Dashboard",
    template: "%s — Creator | UGC Platform",
  },
  description: "Manage your portfolio, campaigns, and earnings.",
};

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <CreatorSidebar />
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
