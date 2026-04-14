import { useQuery } from "@tanstack/react-query";
import {
  creatorProfileMeQueryKey,
  fetchCreatorProfileMe,
} from "../api/fetch-creator-profile-me";

type UseCreatorProfileMeQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
};

export function useCreatorProfileMeQuery(
  options?: UseCreatorProfileMeQueryOptions,
) {
  return useQuery({
    queryKey: creatorProfileMeQueryKey,
    queryFn: fetchCreatorProfileMe,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}
