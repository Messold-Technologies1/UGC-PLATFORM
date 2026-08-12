import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CreatorAddOnOption = {
  slug: string;
  name: string;
  sortOrder: number;
  /** Mandatory add-ons are pre-selected, can't be removed, and must be priced to go live. */
  mandatory: boolean;
  fixedPrice?: number | null;
  minPrice?: number | null;
  stepPrice?: number | null;
};

export type CreatorAddOnOptionsResponse = {
  options: CreatorAddOnOption[];
};

export const creatorAddOnOptionsQueryKey = [
  "creators",
  "add-on-options",
] as const;

export async function getCreatorAddOnOptions(): Promise<CreatorAddOnOptionsResponse> {
  const { data } = await api.get<CreatorAddOnOptionsResponse>(
    ENDPOINTS.CREATORS.ADD_ON_OPTIONS,
  );
  return data;
}
