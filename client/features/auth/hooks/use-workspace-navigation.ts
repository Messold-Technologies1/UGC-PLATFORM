"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import { pathAfterWorkspaceSelection } from "@/features/auth/lib/post-auth-destination";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "./use-me-query";

export function useWorkspaceNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const goWorkspace = async (role: WorkspaceRole) => {
    const current = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);
    if (current?.primaryRole === role) {
      return;
    }
    const from = pathname;

    if (current) {
      router.push(pathAfterWorkspaceSelection(current, role, null));
    }

    try {
      const next = await selectWorkspaceApi(role);
      queryClient.setQueryData(authMeQueryKey, next);
      if (!current) {
        router.push(pathAfterWorkspaceSelection(next, role, null));
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
