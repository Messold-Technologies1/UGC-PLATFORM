import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  creatorOrderDeliveriesQueryOptions,
  creatorDeliveriesQueryOptions,
  type CreatorDeliveryItem,
  type CreatorDeliveriesResponse,
  type GetCreatorDeliveriesParams,
} from "../api/get-creator-deliveries";

type UseGetCreatorDeliveriesQueryOptions = Omit<
  UseQueryOptions<CreatorDeliveriesResponse, Error>,
  "queryKey" | "queryFn"
>;

type CreatorOrderDeliveriesResponse = {
  items: CreatorDeliveryItem[];
};

type UseGetCreatorOrderDeliveriesQueryOptions = Omit<
  UseQueryOptions<CreatorOrderDeliveriesResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetCreatorDeliveriesQuery(
  params?: GetCreatorDeliveriesParams,
  options?: UseGetCreatorDeliveriesQueryOptions,
) {
  return useQuery({
    ...creatorDeliveriesQueryOptions(params),
    ...options,
  });
}

export function useGetCreatorOrderDeliveriesQuery(
  orderId: string,
  options?: UseGetCreatorOrderDeliveriesQueryOptions,
) {
  return useQuery({
    ...creatorOrderDeliveriesQueryOptions(orderId),
    ...options,
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}
