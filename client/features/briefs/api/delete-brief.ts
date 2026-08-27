import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function deleteBrief(id: string): Promise<void> {
  await api.delete(ENDPOINTS.BRIEFS.DETAIL(id));
}
