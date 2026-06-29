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
    // Poll while any preview is still generating, then stop. A caller-supplied
    // refetchInterval (value or function) takes precedence.
    refetchInterval: (query) => {
      const override = options?.refetchInterval;
      if (override !== undefined) {
        return typeof override === "function" ? override(query) : override;
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
