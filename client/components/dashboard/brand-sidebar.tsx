"use client";

import { Building2, LayoutDashboard, Megaphone, Users, Settings } from "lucide-react";
import { DashboardSidebar, type NavItem } from "./sidebar";

const brandNav: NavItem[] = [
  { href: "/brand/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/brand/creators", label: "Browse Creators", icon: Users },
  { href: "/brand/settings", label: "Settings", icon: Settings },
];

export function BrandSidebar() {
  return <DashboardSidebar navItems={brandNav} role="brand" roleIcon={Building2} />;
}
