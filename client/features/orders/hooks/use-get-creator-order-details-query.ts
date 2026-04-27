import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  creatorOrderDetailsQueryOptions,
  type CreatorOrderDetailsResponse,
} from "../api/get-creator-order-details";

type UseGetCreatorOrderDetailsQueryOptions = Omit<
  UseQueryOptions<CreatorOrderDetailsResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetCreatorOrderDetailsQuery(
  orderId: string,
  options?: UseGetCreatorOrderDetailsQueryOptions,
) {
  return useQuery({
    ...creatorOrderDetailsQueryOptions(orderId),
    ...options,
    enabled: Boolean(orderId) && (options?.enabled ?? true),
    refetchOnMount: options?.refetchOnMount ?? "always",
  });
}
