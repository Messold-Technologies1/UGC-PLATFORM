import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { BriefFieldOptionsResponse } from "./types";

export const briefFieldOptionsQueryKey = [
  "briefs",
  "field-options",
] as const;

export async function getBriefFieldOptions(): Promise<BriefFieldOptionsResponse> {
  const { data } = await api.get<BriefFieldOptionsResponse>(
    ENDPOINTS.BRIEFS.FIELD_OPTIONS,
  );
  return data;
}
