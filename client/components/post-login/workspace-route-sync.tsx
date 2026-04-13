"use client";

import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";
import { canUseWorkspaceRole } from "@/features/auth/lib/workspace-defaulting";
import { useAuth } from "@/providers/auth-provider";

function workspaceSyncMessage(role: WorkspaceRole) {
  return role === "BRAND"
    ? "Switching to brand workspace..."
    : "Switching to creator workspace...";
}

export function WorkspaceRouteSync({
  role,
}: {
  role: Extract<WorkspaceRole, "BRAND" | "CREATOR">;
}) {
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const shouldSync = useMemo(() => {
    if (!user) return false;
    if (!canUseWorkspaceRole(user, role)) return false;
    return user.activeRole !== role;
  }, [role, user]);

  useEffect(() => {
    if (isLoading || !user || !shouldSync) {
      return;
    }

    let cancelled = false;
    setIsSyncing(true);

    void selectWorkspaceApi(role)
      .then((nextUser) => {
        if (cancelled) return;
        queryClient.setQueryData<AuthUser | null>(authMeQueryKey, nextUser);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (role === "BRAND" && isAxiosError(error) && error.response?.status === 403) {
          toast.error("Your brand access has been removed by admin.");
          return;
        }
        toast.error(`Could not continue as ${role.toLowerCase()}. Try again.`);
      })
      .finally(() => {
        if (!cancelled) {
          setIsSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, queryClient, role, shouldSync, user]);

  if (!isSyncing) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-240 flex flex-col items-center justify-center gap-3 bg-background/65 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="size-9 text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        {workspaceSyncMessage(role)}
      </p>
    </div>
  );
}
