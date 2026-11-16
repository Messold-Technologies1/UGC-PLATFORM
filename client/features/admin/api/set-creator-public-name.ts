import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorPublicNameResultDto } from "../types";

/**
 * Show or hide a creator's real name on their public profile page.
 *
 * Revealing also mints the URL the page is served from, out of the creator's
 * own profile name. Hiding returns the page to the anonymous niche headline on
 * its opaque slug.
 */
export async function setCreatorPublicName(
  id: string,
  reveal: boolean,
): Promise<AdminCreatorPublicNameResultDto> {
  const { data } = await api.patch<AdminCreatorPublicNameResultDto>(
    ENDPOINTS.ADMIN.CREATORS.PUBLIC_NAME(id),
    { reveal },
  );
  return data;
}
