import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";

export async function selectWorkspaceApi(
  role: WorkspaceRole,
  setPrimary?: boolean,
): Promise<AuthUser> {
  const { data } = await api.post<{ user: AuthUser }>(ENDPOINTS.AUTH.WORKSPACE, {
    role,
    ...(setPrimary !== undefined ? { setPrimary } : {}),
  });
  return data.user;
}
