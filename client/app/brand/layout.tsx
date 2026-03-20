import type { Metadata } from "next";
import { BrandSidebar } from "@/components/dashboard/brand-sidebar";

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
    <div className="flex min-h-svh">
      <BrandSidebar />
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
