import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function unfeatureCreator(id: string): Promise<void> {
  await api.delete(ENDPOINTS.ADMIN.CREATORS.FEATURE(id));
}
