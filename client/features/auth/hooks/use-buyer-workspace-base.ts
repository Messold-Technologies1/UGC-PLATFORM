"use client";

import { usePathname } from "next/navigation";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";
import {
  buyerWorkspaceBaseForUser,
  buyerWorkspaceHref,
  type BuyerWorkspaceBase,
} from "@/features/auth/lib/buyer-workspace-path";

/** Safe on public pages (no AuthProvider) — uses the shared me query. */
export function useBuyerWorkspaceBase(): BuyerWorkspaceBase {
  const pathname = usePathname();
  const { data: user = null } = useMeQuery();
  return buyerWorkspaceBaseForUser(pathname, user);
}

export function useBuyerWorkspaceHref(path: string): string {
  const base = useBuyerWorkspaceBase();
  return buyerWorkspaceHref(base, path);
}
