import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  brandOrderDeliveriesQueryOptions,
  type BrandOrderDeliveriesResponse,
} from "../api/get-brand-order-deliveries";
import { getLatestDeliveryPreviewState } from "../components/brand-order-detail/order-delivered/delivery-preview-preparing";

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
      const { previewGenerating } = getLatestDeliveryPreviewState(items);
      return previewGenerating ? 5_000 : false;
    },
  });
}
