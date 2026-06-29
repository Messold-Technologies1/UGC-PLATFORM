import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  brandOrderDeliveriesQueryOptions,
  type BrandOrderDeliveriesResponse,
} from "../api/get-brand-order-deliveries";

type UseGetBrandOrderDeliveriesQueryOptions = Omit<
  UseQueryOptions<BrandOrderDeliveriesResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetBrandOrderDeliveriesQuery(
  orderId: string,
  options?: UseGetBrandOrderDeliveriesQueryOptions,
) {
  return useQuery({
    ...brandOrderDeliveriesQueryOptions(orderId),
    ...options,
    enabled: Boolean(orderId) && (options?.enabled ?? true),
    refetchInterval: (query) => {
      if (options?.refetchInterval !== undefined) {
        return options.refetchInterval;
      }
      const items = query.state.data?.items ?? [];
      const latest = items.at(-1);
      const assets = latest?.assets ?? [];
      const previewGenerating =
        assets.length > 0 &&
        assets.some(
          (asset) =>
            asset.watermarked &&
            (!asset.url || asset.previewStatus === "pending"),
        );
      return previewGenerating ? 5_000 : false;
    },
  });
}
