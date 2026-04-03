import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CreatorSuggestionItem = {
  id: string;
  name: string;
};

export const creatorSuggestionListsQueryKeys = {
  categories: ["creator-suggestions", "categories"] as const,
  personaTags: ["creator-suggestions", "persona-tags"] as const,
  restrictions: ["creator-suggestions", "restrictions"] as const,
};

export async function fetchCreatorCategorySuggestions(): Promise<
  CreatorSuggestionItem[]
> {
  const { data } = await api.get<CreatorSuggestionItem[]>(
    ENDPOINTS.CREATORS.SUGGESTIONS_CATEGORIES,
  );
  return data;
}

export async function fetchCreatorPersonaTagSuggestions(): Promise<
  CreatorSuggestionItem[]
> {
  const { data } = await api.get<CreatorSuggestionItem[]>(
    ENDPOINTS.CREATORS.SUGGESTIONS_PERSONA_TAGS,
  );
  return data;
}

export async function fetchCreatorRestrictionSuggestions(): Promise<
  CreatorSuggestionItem[]
> {
  const { data } = await api.get<CreatorSuggestionItem[]>(
    ENDPOINTS.CREATORS.SUGGESTIONS_RESTRICTIONS,
  );
  return data;
}
