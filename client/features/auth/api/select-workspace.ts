import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";

export async function selectWorkspaceApi(role: WorkspaceRole): Promise<AuthUser> {
  const { data } = await api.post<{ user: AuthUser }>(ENDPOINTS.AUTH.WORKSPACE, {
    role,
  });
  return data.user;
}
