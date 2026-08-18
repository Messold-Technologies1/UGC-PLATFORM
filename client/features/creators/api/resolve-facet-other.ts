import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorFacetDimension } from "./get-creator-facet-options";

export type ResolveFacetOtherPayload = {
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  text: string;
};

export type ResolveFacetOtherResponse = {
  action: "match" | "new" | "rejected" | "kept";
  option?: {
    dimension: CreatorFacetDimension;
    slug: string;
    label: string;
  };
  /** Normalized label to be added to the catalog on save (action = "new"). */
  label?: string;
  typedText: string;
  reason?: "inappropriate" | "invalid";
  message?: string;
};

/**
 * Ask the server to canonicalize a free-text "Other" facet value: map it to an
 * existing option, add it to the catalog as a new option, or reject it.
 */
export async function resolveCreatorFacetOther(
  payload: ResolveFacetOtherPayload,
): Promise<ResolveFacetOtherResponse> {
  const { data } = await api.post<ResolveFacetOtherResponse>(
    ENDPOINTS.CREATORS.RESOLVE_FACET_OTHER,
    payload,
  );
  return data;
}
