import {
  Bell,
  Building2,
  ChartBar,
  FileText,
  Link2,
  Package,
  Settings,
  Ticket,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  /** Shown as a small heading above the group in the sidebar. */
  label: string;
  items: AdminNavItem[];
};

/**
 * The admin destinations, grouped.
 *
 * Grouping is the point of the sidebar: eleven flat items overflowed the
 * navbar pill (Settings collided with the notification bell at common laptop
 * widths), and a flat list of eleven in a rail is no easier to scan. These
 * group by what an admin is actually doing — running the marketplace, keeping
 * the catalogue, talking to people, handling money.
 *
 * One source of truth: the navbar's mobile menu reads the same list, so an
 * item added here appears in both places.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Marketplace",
    items: [
      { href: "/admin/orderManagement", label: "Orders", icon: Package },
      { href: "/admin/creators", label: "Creators", icon: Users },
      { href: "/admin/brandManagement", label: "Brands", icon: Building2 },
      { href: "/admin/agencyBrandLinks", label: "Agency links", icon: Link2 },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/demo-videos", label: "Demo videos", icon: Video },
      { href: "/admin/legal", label: "Legal pages", icon: FileText },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/admin/search-insights",
        label: "Search insights",
        icon: ChartBar,
      },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/admin/coupons", label: "Coupons", icon: Ticket },
      { href: "/admin/refunds", label: "Refunds", icon: Wallet },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

/**
 * Settings (which creates admins), Coupons and Refunds are super-admin only.
 * Kept here beside the list it filters so the two cannot drift apart.
 */
const SUPER_ADMIN_ONLY = new Set([
  "/admin/settings",
  "/admin/coupons",
  "/admin/refunds",
]);

export function adminNavGroupsFor(canManageAdmins: boolean): AdminNavGroup[] {
  if (canManageAdmins) return ADMIN_NAV_GROUPS;
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !SUPER_ADMIN_ONLY.has(item.href)),
  })).filter((group) => group.items.length > 0);
}

/** Flat list, for the navbar's mobile menu. */
export function adminNavItemsFor(canManageAdmins: boolean): AdminNavItem[] {
  return adminNavGroupsFor(canManageAdmins).flatMap((group) => group.items);
}

/** Active when it is the page, or an ancestor of it (detail routes). */
export function isAdminNavItemActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
