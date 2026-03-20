"use client";

import { DashboardSidebar, type NavItem } from "@/components/dashboard/sidebar";
import {
  Video,
  LayoutDashboard,
  Megaphone,
  Briefcase,
  Settings,
} from "lucide-react";

const creatorNav: NavItem[] = [
  { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/creator/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/creator/settings", label: "Settings", icon: Settings },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <DashboardSidebar navItems={creatorNav} role="creator" roleIcon={Video} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
