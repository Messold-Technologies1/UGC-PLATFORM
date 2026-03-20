"use client";

import { Video, LayoutDashboard, Megaphone, Briefcase, Settings } from "lucide-react";
import { DashboardSidebar, type NavItem } from "./sidebar";

const creatorNav: NavItem[] = [
  { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/creator/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/creator/settings", label: "Settings", icon: Settings },
];

export function CreatorSidebar() {
  return <DashboardSidebar navItems={creatorNav} role="creator" roleIcon={Video} />;
}
