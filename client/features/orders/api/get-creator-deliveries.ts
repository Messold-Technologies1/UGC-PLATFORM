import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderDeliveryAsset } from "./get-brand-order-deliveries";

export interface CreatorDeliveryOrderSnapshot {
  id: string;
  status: string;
  brandName: string | null;
  brandLogoUrl?: string | null;
}

/**
 * Server-side state of the watermarked copy we generate from a submitted
 * delivery. Internal: the creator never sees these words, only what they mean
 * for whether she has anything left to do.
 */
export type DeliveryPreviewStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "dead";

export interface CreatorDeliveryItem {
  id: string;
  orderId: string;
  revisionNumber: number;
  assets: OrderDeliveryAsset[];
  note?: string | null;
  createdAt: string;
  previewStatus?: DeliveryPreviewStatus | string | null;
  order: CreatorDeliveryOrderSnapshot;
}

/**
 * The delivery is in our hands and the creator has nothing left to do.
 *
 * `failed` belongs here with `pending`/`processing`. Her file is already in
 * storage — the submit wrote the keys of objects uploaded before the request —
 * so a watermark run failing is our pipeline owing a retry, not a problem with
 * her upload, and the retry paths are already on it. Re-uploading the same
 * video would not fix a broken encode; it would just cost her the data again.
 * So the uploader stays locked and she is never told.
 */
export function isDeliveryBeingProcessed(
  delivery: Pick<CreatorDeliveryItem, "previewStatus">,
): boolean {
  return (
    delivery.previewStatus === "pending" ||
    delivery.previewStatus === "processing" ||
    delivery.previewStatus === "failed"
  );
}

/**
 * The one state where she genuinely has to act. `dead` is terminal: the retry
 * budget is spent, so nothing is coming back for this file. The order cannot
 * reach DELIVERED and the brand will never see anything until a different file
 * is submitted, and she is the only one who can supply it — so the uploader
 * reopens here, with copy that says so.
 */
export function isDeliveryUnprocessable(
  delivery: Pick<CreatorDeliveryItem, "previewStatus">,
): boolean {
  return delivery.previewStatus === "dead";
}

export interface CreatorDeliveriesResponse {
  items: CreatorDeliveryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetCreatorDeliveriesParams {
  page?: number;
  limit?: number;
}

export function creatorDeliveriesQueryKey(
  params?: GetCreatorDeliveriesParams,
) {
  return [
    "orders",
    "creator",
    "deliveries",
    params?.page ?? 1,
    params?.limit ?? 20,
  ] as const;
}

export function creatorOrderDeliveriesQueryKey(orderId: string) {
  return ["orders", "creator", orderId, "deliveries"] as const;
}

export async function getCreatorDeliveries(
  params?: GetCreatorDeliveriesParams,
) {
  const { data } = await api.get<CreatorDeliveriesResponse>(
    ENDPOINTS.ORDERS.CREATOR_DELIVERIES,
    { params },
  );
  return data;
}

export async function getCreatorOrderDeliveries(orderId: string) {
  const limit = 50;
  let page = 1;
  const items: CreatorDeliveryItem[] = [];

  while (true) {
    const data = await getCreatorDeliveries({ page, limit });
    items.push(...data.items);

    if (page * data.limit >= data.total || data.items.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    items: items
      .filter((item) => item.orderId === orderId)
      .sort((a, b) => {
        if (a.revisionNumber !== b.revisionNumber) {
          return a.revisionNumber - b.revisionNumber;
        }

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
  };
}

export function creatorDeliveriesQueryOptions(
  params?: GetCreatorDeliveriesParams,
) {
  return {
    queryKey: creatorDeliveriesQueryKey(params),
    queryFn: () => getCreatorDeliveries(params),
  };
}

export function creatorOrderDeliveriesQueryOptions(orderId: string) {
  return {
    queryKey: creatorOrderDeliveriesQueryKey(orderId),
    queryFn: () => getCreatorOrderDeliveries(orderId),
  };
}
