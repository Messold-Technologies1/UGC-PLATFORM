import api from "@/lib/api";
import { creatorsByIdPath } from "@/lib/endpoints";
import type { CreatorProfileItemApi } from "./types";

export async function getCreatorProfileClient(
  id: string
): Promise<CreatorProfileItemApi> {
  const { data } = await api.get<CreatorProfileItemApi>(creatorsByIdPath(id));
  return data;
}
