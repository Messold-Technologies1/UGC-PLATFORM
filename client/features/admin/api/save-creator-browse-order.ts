import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/**
 * Save the order the admin dragged the browse board into.
 *
 * `creatorIds` is the leading run of the board — from the first card through
 * the furthest position the drag touched. Each one's index becomes its
 * position for brands; everything past the run keeps the default newest-first
 * ordering.
 */
export async function saveCreatorBrowseOrder(
  creatorIds: string[],
): Promise<void> {
  await api.patch(ENDPOINTS.ADMIN.CREATORS.BROWSE_ORDER, { creatorIds });
}
