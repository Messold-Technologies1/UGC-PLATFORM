"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar/navbar";

/**
 * Creator routes that render a full-bleed surface and must not show the
 * workspace navbar.
 *
 * The public-page preview has to look exactly like the live page — a second
 * dashboard bar above (or inside) it misrepresents what a brand will see. The
 * design studio frames that preview, so it stays out of the way too.
 */
const BARE_ROUTES = [
  "/creator/public-page-preview",
  "/creator/public-page-design",
];

/**
 * The workspace navbar, hidden on the routes above.
 *
 * `app/creator/layout.tsx` is a server component and cannot read the pathname,
 * so the decision lives here.
 */
export function CreatorNavbar() {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some((route) => pathname?.startsWith(route));
  if (isBare) return null;
  return <Navbar />;
}
