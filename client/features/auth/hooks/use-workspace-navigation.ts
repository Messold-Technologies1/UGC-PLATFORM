"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import { pathAfterWorkspaceSelection } from "@/features/auth/lib/post-auth-destination";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "./use-me-query";

export type GoWorkspaceOptions = {
  redirectIfCurrent?: boolean;
};

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

function destinationPathAndQuery(destHref: string): { path: string; query: string } {
  const q = destHref.indexOf("?");
  const path = (q === -1 ? destHref : destHref.slice(0, q)).split("#")[0] ?? "";
  const queryPart =
    q === -1 ? "" : (destHref.slice(q + 1).split("#")[0] ?? "");
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

  const goWorkspace = async (
    role: WorkspaceRole,
    options?: GoWorkspaceOptions,
  ) => {
    const current = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);
    const sameWorkspace = current?.primaryRole === role;

    if (sameWorkspace && !options?.redirectIfCurrent) {
      return;
    }

    const from = pathname;

    if (current) {
      const dest = pathAfterWorkspaceSelection(current, role, null);
      if (!isAlreadyAtDestination(pathname, searchParams, dest)) {
        router.push(dest);
      }
    }

    if (sameWorkspace) {
      return;
    }

    try {
      const next = await selectWorkspaceApi(role);
      queryClient.setQueryData(authMeQueryKey, next);
      if (!current) {
        const dest = pathAfterWorkspaceSelection(next, role, null);
        if (!isAlreadyAtDestination(pathname, searchParams, dest)) {
          router.push(dest);
        }
      }
    } catch {
      toast.error("Could not switch workspace. Try again.");
      if (current) {
        router.replace(from);
      }
    }
  };

  return { goWorkspace };
}
