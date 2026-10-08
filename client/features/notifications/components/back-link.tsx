"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * The way back out of a notifications page.
 *
 * Every screen under /admin/notifications gets one, pointing one level up: a
 * detail page returns to its list, and a list returns to the hub. Walking up
 * beats a browser-history "back" here, because an admin usually arrives at
 * these pages from a link in another tab or from the hub itself, and history
 * would send them somewhere that has nothing to do with notifications.
 */
export function NotificationsBackLink({
  href = "/admin/notifications",
  label = "Notifications",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
