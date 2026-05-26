import api from "@/lib/api";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";

export async function updateCreatorProfileAdmin(
  id: string,
  payload: UpdateCreatorProfilePayload
): Promise<CreatorProfileItemApi> {
  const { data } = await api.patch<CreatorProfileItemApi>(
    `/api/admin/creators/${encodeURIComponent(id)}`,
    payload
  );
  return data;
}
