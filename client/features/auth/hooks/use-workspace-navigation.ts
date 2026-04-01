"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  beginClientNavigation,
  completeClientNavigation,
} from "@/lib/client-navigation-state";
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
  searchParams: URLSearchParams,
  destHref: string,
): boolean {
  const { path, query: destQuery } = destinationPathAndQuery(destHref);
  const currentQuery = normalizeQueryString(searchParams.toString());
  return pathname === path && currentQuery === destQuery;
}

export function useWorkspaceNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const switchState = useWorkspaceSwitchState();

  const goWorkspace = async (
    role: WorkspaceRole,
    options?: GoWorkspaceOptions,
  ) => {
    const current = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);
    const currentRole = current?.activeRole ?? current?.primaryRole ?? null;
    
    const sameWorkspace = currentRole === role;

    const fullCurrent = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;

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

    const clearSwitchingStateSoon = () => {
      window.setTimeout(() => {
        clearWorkspaceSwitchState();
      }, 250);
    };

    if (sameWorkspace) {
      if (current) {
        const dest = pathAfterWorkspaceSelection(current, role, callbackUrl, {
          promptIncompleteProfileOnboarding: false,
        });
        if (!isAlreadyAtDestination(pathname, searchParams, dest)) {
          showSwitchingState();
          beginClientNavigation();
          startTransition(() => {
            router.push(dest);
          });
          clearSwitchingStateSoon();
        }
      }
      return;
    }

    showSwitchingState();

    try {
      const next = await selectWorkspaceApi(role);
      queryClient.setQueryData(authMeQueryKey, next);
      const dest = pathAfterWorkspaceSelection(next, role, callbackUrl, {
        promptIncompleteProfileOnboarding: false,
      });
      if (!isAlreadyAtDestination(pathname, searchParams, dest)) {
        beginClientNavigation();
        startTransition(() => {
          router.push(dest);
        });
      } else {
        completeClientNavigation();
      }
    } catch {
      toast.error("Could not switch workspace. Try again.");
      completeClientNavigation();
      if (current) {
        startTransition(() => {
          router.replace(fullCurrent);
        });
      }
    } finally {
      clearSwitchingStateSoon();
    }
  };

  return { goWorkspace, isSwitchingWorkspace: switchState.isSwitching };
}
