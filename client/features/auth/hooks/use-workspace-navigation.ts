"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { canUseWorkspaceRole } from "@/features/auth/lib/workspace-defaulting";
import { pathAfterWorkspaceSelection } from "@/features/auth/lib/post-auth-destination";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "./use-me-query";

export type GoWorkspaceOptions = {
  redirectIfCurrent?: boolean;
  targetHref?: string | null;
};

const LAST_PATH_STORAGE_PREFIX = "ugc:last-workspace-path:";

function pathPrefixForWorkspaceRole(role: WorkspaceRole): string {
  return role === "CREATOR" ? "/creator" : "/brand";
}

function workspaceRoleFromPath(
  pathname: string,
): Extract<WorkspaceRole, "CREATOR" | "BRAND"> | null {
  if (pathname === "/brand" || pathname.startsWith("/brand/")) return "BRAND";
  if (pathname === "/creator" || pathname.startsWith("/creator/")) {
    return "CREATOR";
  }
  return null;
}

function lastPathStorageKey(role: WorkspaceRole): string {
  return `${LAST_PATH_STORAGE_PREFIX}${role}`;
}

function saveLastPathForWorkspaceRole(role: WorkspaceRole, href: string): void {
  try {
    sessionStorage.setItem(lastPathStorageKey(role), href);
  } catch {}
}

export function readLastPathForWorkspaceRole(role: WorkspaceRole): string | null {
  try {
    const raw = sessionStorage.getItem(lastPathStorageKey(role));
    if (!raw?.trim() || !raw.startsWith("/") || raw.startsWith("//")) {
      return null;
    }
    const pathOnly = raw.split("?")[0] ?? raw;
    const prefix = pathPrefixForWorkspaceRole(role);
    return pathOnly.startsWith(prefix) ? raw : null;
  } catch {
    return null;
  }
}

function normalizeQueryString(raw: string): string {
  const params = new URLSearchParams(raw);
  const keys = [...new Set([...params.keys()])].sort();
  const out = new URLSearchParams();
  for (const k of keys) {
    for (const v of [...params.getAll(k)].sort()) {
      out.append(k, v);
    }
  }
  return out.toString();
}

function destinationPathAndQuery(destHref: string): {
  path: string;
  query: string;
} {
  const q = destHref.indexOf("?");
  const path = (q === -1 ? destHref : destHref.slice(0, q)).split("#")[0] ?? "";
  const queryPart = q === -1 ? "" : (destHref.slice(q + 1).split("#")[0] ?? "");
  return { path, query: normalizeQueryString(queryPart) };
}

function isAlreadyAtDestination(
  pathname: string,
  search: string,
  destHref: string,
): boolean {
  const { path, query: destQuery } = destinationPathAndQuery(destHref);
  const currentQuery = normalizeQueryString(search);
  return pathname === path && currentQuery === destQuery;
}

function readCurrentSearchString(): string {
  if (typeof window === "undefined") return "";
  return window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : window.location.search;
}

function fallbackPathForWorkspaceRole(role: WorkspaceRole): string {
  return role === "BRAND" ? "/brand/dashboard" : "/creator/dashboard";
}

export function useWorkspaceNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [switchingWorkspaceRole, setSwitchingWorkspaceRole] =
    useState<WorkspaceRole | null>(null);

  useEffect(() => {
    setSwitchingWorkspaceRole(null);
  }, [pathname]);

  const goWorkspace = async (
    role: WorkspaceRole,
    options?: GoWorkspaceOptions,
  ) => {
    const current = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);
    const currentRole = workspaceRoleFromPath(pathname);
    const sameWorkspace = currentRole === role;
    const currentSearch = readCurrentSearchString();
    const fullCurrent = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;

    if (currentRole && !sameWorkspace) {
      const prefix = pathPrefixForWorkspaceRole(currentRole);
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        saveLastPathForWorkspaceRole(currentRole, fullCurrent);
      }
    }

    const remembered = readLastPathForWorkspaceRole(role);
    const preferredTarget = options?.targetHref?.trim() || null;
    const callbackUrl = preferredTarget
      ? preferredTarget
      : options?.redirectIfCurrent && sameWorkspace
        ? null
        : remembered;

    if (role === "BRAND" && current?.brandAccessRevoked) {
      toast.error("Your brand access has been removed by admin.");
      return;
    }

    if (current && (!current.roles.includes(role) || !canUseWorkspaceRole(current, role))) {
      toast.error(`Could not continue as ${role.toLowerCase()}.`);
      return;
    }

    const dest = current
      ? pathAfterWorkspaceSelection(current, role, callbackUrl, {
          promptIncompleteProfileOnboarding: false,
        })
      : callbackUrl ?? fallbackPathForWorkspaceRole(role);

    if (!isAlreadyAtDestination(pathname, currentSearch, dest)) {
      setSwitchingWorkspaceRole(role);
      beginClientNavigation();
      startTransition(() => {
        router.push(dest);
      });
    }
  };

  return {
    goWorkspace,
    isSwitchingWorkspace: switchingWorkspaceRole !== null,
    switchingWorkspaceRole,
  };
}
