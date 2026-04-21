import { useQuery } from "@tanstack/react-query";
import {
  creatorSuggestionListsQueryKeys,
  fetchCreatorCategorySuggestions,
  fetchCreatorPersonaTagSuggestions,
  fetchCreatorRestrictionSuggestions,
} from "../api/creator-suggestion-lists";

type SuggestionQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
};

export function useCreatorCategorySuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: creatorSuggestionListsQueryKeys.categories,
    queryFn: fetchCreatorCategorySuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}

export function useCreatorPersonaTagSuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: creatorSuggestionListsQueryKeys.personaTags,
    queryFn: fetchCreatorPersonaTagSuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}

export function useCreatorRestrictionSuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: creatorSuggestionListsQueryKeys.restrictions,
    queryFn: fetchCreatorRestrictionSuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}
