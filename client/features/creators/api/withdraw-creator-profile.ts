import api from "@/lib/api";
import { creatorsByIdPath } from "@/lib/endpoints";
import type { CreatorProfileItemApi } from "./types";

/**
 * Withdraw a submitted (Self complete / Awaiting review) profile back to
 * Building so the creator can edit and resubmit. Server enforces that only
 * those two non-listed states are withdrawable.
 */
export async function withdrawCreatorProfile(
  profileId: string,
): Promise<CreatorProfileItemApi> {
  const { data } = await api.patch<CreatorProfileItemApi>(
    `${creatorsByIdPath(profileId)}/withdraw`,
  );
  return data;
}
