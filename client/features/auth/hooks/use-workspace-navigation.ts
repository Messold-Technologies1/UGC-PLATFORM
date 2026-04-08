"use client";

import { startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import { pathAfterWorkspaceSelection } from "@/features/auth/lib/post-auth-destination";
import {
  clearWorkspaceSwitchState,
  setWorkspaceSwitchState,
  useWorkspaceSwitchState,
} from "@/features/auth/lib/workspace-switch-state";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "./use-me-query";

export type GoWorkspaceOptions = {
  redirectIfCurrent?: boolean;
  targetHref?: string | null;
  setPrimary?: boolean;
};

const LAST_PATH_STORAGE_PREFIX = "ugc:last-workspace-path:";

function pathPrefixForWorkspaceRole(role: WorkspaceRole): string {
  return role === "CREATOR" ? "/creator" : "/brand";
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

export function useWorkspaceNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const switchState = useWorkspaceSwitchState();

  const goWorkspace = async (
    role: WorkspaceRole,
    options?: GoWorkspaceOptions,
  ) => {
    const current = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);
    const currentRole = current?.activeRole ?? current?.primaryRole ?? null;
    
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

    const showSwitchingState = () => {
      setWorkspaceSwitchState({ isSwitching: true, targetRole: role });
    };

    if (sameWorkspace) {
      if (current) {
        const dest = pathAfterWorkspaceSelection(current, role, callbackUrl, {
          promptIncompleteProfileOnboarding: false,
        });
        if (!isAlreadyAtDestination(pathname, currentSearch, dest)) {
          showSwitchingState();
          startTransition(() => {
            router.push(dest);
          });
        }
      }
      return;
    }

    showSwitchingState();

    try {
      const next = await selectWorkspaceApi(role, options?.setPrimary);
      queryClient.setQueryData(authMeQueryKey, next);
      const dest = pathAfterWorkspaceSelection(next, role, callbackUrl, {
        promptIncompleteProfileOnboarding: false,
      });
      if (!isAlreadyAtDestination(pathname, currentSearch, dest)) {
        startTransition(() => {
          router.push(dest);
        });
      } else {
        clearWorkspaceSwitchState();
      }
    } catch {
      toast.error("Could not switch workspace. Try again.");
      clearWorkspaceSwitchState();
      if (current) {
        startTransition(() => {
          router.replace(fullCurrent);
        });
      }
    }
  };

  return { goWorkspace, isSwitchingWorkspace: switchState.isSwitching };
}
