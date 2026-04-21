import { useQuery } from "@tanstack/react-query";
import {
  brandProfileStateQueryKey,
  fetchBrandProfileState,
} from "../api/fetch-brand-profile-state";

type UseBrandProfileStateQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  retry?: boolean;
};

export function useBrandProfileStateQuery(
  options?: UseBrandProfileStateQueryOptions,
) {
  return useQuery({
    queryKey: brandProfileStateQueryKey,
    queryFn: fetchBrandProfileState,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    retry: options?.retry,
  });
}
