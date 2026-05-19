import api from "@/lib/api";
import { suggestedCreatorsPath } from "@/lib/endpoints";
import type {
  SuggestedCreatorListItemApi,
  SuggestedCreatorsResponse,
} from "./types";

export async function fetchSuggestedCreators(
  creatorId: string,
): Promise<SuggestedCreatorListItemApi[]> {
  const { data } = await api.get<SuggestedCreatorsResponse>(
    suggestedCreatorsPath(creatorId),
  );
  return data.items;
}
