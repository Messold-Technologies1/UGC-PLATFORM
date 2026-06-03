import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  briefFieldOptionsQueryKey,
  getBriefFieldOptions,
} from "../api/get-brief-field-options";
import type { BriefFieldOptionsResponse } from "../api/types";

type UseBriefFieldOptionsQueryOptions = Omit<
  UseQueryOptions<BriefFieldOptionsResponse, Error>,
  "queryKey" | "queryFn"
>;

const TWENTY_FOUR_HOURS = 24 * 60 * 60_000;

export function useBriefFieldOptionsQuery(
  options?: UseBriefFieldOptionsQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: briefFieldOptionsQueryKey,
    queryFn: getBriefFieldOptions,
    staleTime: options?.staleTime ?? TWENTY_FOUR_HOURS,
  });
}
