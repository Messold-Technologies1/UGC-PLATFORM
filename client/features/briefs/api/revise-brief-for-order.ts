import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Brief } from "./types";
import type { UpdateBriefPayload } from "./update-brief";

export interface ReviseBriefForOrderPayload extends UpdateBriefPayload {
  orderId: string;
}

/**
 * Edit the brief on an order and resubmit it, while the creator has not yet
 * accepted. The server applies the edit to a copy owned by this order — a
 * saved brief can sit on several orders, and only this one is being revised —
 * so the brief that comes back is that copy, not the brief that was sent in.
 */
export async function reviseBriefForOrder(
  id: string,
  payload: ReviseBriefForOrderPayload,
) {
  const { data } = await api.post<Brief>(
    ENDPOINTS.BRIEFS.REVISE_FOR_ORDER(id),
    payload,
  );
  return data;
}
