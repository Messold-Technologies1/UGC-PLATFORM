import api from "@/lib/api";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";

/** Admin-side twin of `withdrawCreatorProfile` (same server transition). */
export async function withdrawCreatorProfileAdmin(
  id: string,
): Promise<CreatorProfileItemApi> {
  const { data } = await api.patch<CreatorProfileItemApi>(
    `/api/admin/creators/${encodeURIComponent(id)}/withdraw`,
  );
  return data;
}
