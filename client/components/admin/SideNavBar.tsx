"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarUserMenu } from "@/components/dashboard/sidebar/sidebar-user-menu";

export default function SideNavBar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col fixed left-0 top-0 h-full py-8 bg-white dark:bg-[#0d0e12] w-64 border-r dark:border-r-0 font-headline tracking-tight z-50">
      <div className="px-6 mb-10">
        <span className="text-xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">COLLABRY</span>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Marketplace Controller</p>
      </div>
      <nav className="flex-1 space-y-1">
        <Link className={`flex items-center px-6 py-3 space-x-3 transition-all duration-300 group ${pathname === '/admin' ? 'text-sidebar-primary border-r-2 border-sidebar-primary font-bold scale-[0.98] active:scale-95' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`} href="/admin">
          <span className="material-symbols-outlined">dashboard</span>
          <span>Overview</span>
        </Link>
        <Link className={`flex items-center px-6 py-3 space-x-3 transition-all duration-300 group ${pathname?.includes('/approvals') ? 'text-sidebar-primary border-r-2 border-sidebar-primary font-bold scale-[0.98] active:scale-95' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`} href="/admin/approvals">
          <span className="material-symbols-outlined">verified_user</span>
          <span>Creator Approval</span>
        </Link>
        <a className="flex items-center px-6 py-3 space-x-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-300 group" href="#">
          <span className="material-symbols-outlined">group</span>
          <span>User Management</span>
        </a>
        <a className="flex items-center px-6 py-3 space-x-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-300 group" href="#">
          <span className="material-symbols-outlined">assessment</span>
          <span>Reports</span>
        </a>
        <a className="flex items-center px-6 py-3 space-x-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-300 group" href="#">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </a>
      </nav>
      <div className="px-3 mt-auto">
        <SidebarUserMenu desktopCollapsed={false} />
      </div>
    </aside>
  );
}
