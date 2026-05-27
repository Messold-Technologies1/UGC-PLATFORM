import { useQuery } from "@tanstack/react-query";
import { getCreatorProfileClient } from "../api/get-creator-profile-client";

export const creatorProfileQueryKey = (id: string) => ["creators", "profile", id];

export function useCreatorProfileQuery(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: creatorProfileQueryKey(id),
    queryFn: () => getCreatorProfileClient(id),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60_000,
  });
}
