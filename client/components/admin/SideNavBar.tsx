"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarUserMenu } from "@/components/dashboard/sidebar/sidebar-user-menu";

export default function SideNavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", icon: "dashboard", label: "Overview", match: (p: string) => p === "/admin" },
    { href: "/admin/approvals", icon: "verified_user", label: "Creator Approval", match: (p: string) => p?.includes("/approvals") },
    { href: "#", icon: "group", label: "User Management", match: () => false },
    { href: "#", icon: "assessment", label: "Reports", match: () => false },
    { href: "/admin/settings", icon: "settings", label: "Settings", match: (p: string) => p === "/admin/settings" },
  ];

  return (
    <aside className="flex flex-col fixed left-0 top-0 h-full py-8 bg-background w-64 font-headline tracking-tight z-50">
      <div className="px-6 mb-10">
        <span className="text-xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">COLLABRY</span>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Marketplace Controller</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = item.match(pathname || "");
          const baseClasses = "flex items-center px-6 py-3 space-x-3 transition-all duration-300 group border-l-[3px]";
          const activeClasses = "text-primary border-primary bg-linear-to-r from-primary/10 to-transparent font-bold scale-[0.98] active:scale-95";
          const inactiveClasses = "text-muted-foreground border-transparent hover:bg-linear-to-r hover:from-primary/10 hover:to-transparent hover:text-foreground";
          
          return (
            <Link 
              key={item.label} 
              href={item.href} 
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 mt-auto">
        <SidebarUserMenu desktopCollapsed={false} />
      </div>
    </aside>
  );
}
