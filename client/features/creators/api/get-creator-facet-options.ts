import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export const creatorFacetDimensions = [
  "CONTENT_FORMAT",
  "APPEARANCE",
  "CONTENT_STYLE",
  "CAPABILITY",
  "LIFE_STYLE",
  "OCCUPATION",
  "INTEREST",
  "CATEGORY_EXPERIENCE",
  "CAN_CREATE_WITH",
  "AI_CONTENT_PERMISSION",
  "LANGUAGE",
] as const;

export type CreatorFacetDimension = (typeof creatorFacetDimensions)[number];

export type CreatorFacetOption = {
  slug: string;
  label: string;
  sortOrder: number;
};

export type CreatorFacetOptionsResponse = {
  optionsByDimension: Partial<
    Record<CreatorFacetDimension, CreatorFacetOption[]>
  >;
};

export const creatorFacetOptionsQueryKey = [
  "creators",
  "facet-options",
] as const;

export async function getCreatorFacetOptions(): Promise<CreatorFacetOptionsResponse> {
  const { data } = await api.get<CreatorFacetOptionsResponse>(
    ENDPOINTS.CREATORS.FACET_OPTIONS,
  );
  return data;
}
