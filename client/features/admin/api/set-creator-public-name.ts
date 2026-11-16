import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorPublicNameResultDto } from "../types";

/**
 * Reveal a creator's real name on their public profile page, or clear it.
 *
 * Passing a name also mints the URL slug the page is served from. Passing null
 * returns the page to the anonymous niche headline on its opaque slug.
 */
export async function setCreatorPublicName(
  id: string,
  publicDisplayName: string | null,
): Promise<AdminCreatorPublicNameResultDto> {
  const { data } = await api.patch<AdminCreatorPublicNameResultDto>(
    ENDPOINTS.ADMIN.CREATORS.PUBLIC_NAME(id),
    { publicDisplayName },
  );
  return data;
}
