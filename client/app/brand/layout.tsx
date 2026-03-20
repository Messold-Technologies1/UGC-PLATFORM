"use client";

import { DashboardSidebar, type NavItem } from "@/components/dashboard/sidebar";
import {
  Building2,
  LayoutDashboard,
  Megaphone,
  Users,
  Settings,
} from "lucide-react";

const brandNav: NavItem[] = [
  { href: "/brand/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/brand/creators", label: "Browse Creators", icon: Users },
  { href: "/brand/settings", label: "Settings", icon: Settings },
];

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <DashboardSidebar navItems={brandNav} role="brand" roleIcon={Building2} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
