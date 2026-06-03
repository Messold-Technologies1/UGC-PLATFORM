import { useQuery } from "@tanstack/react-query";
import {
  creatorSuggestionListsQueryKeys,
  fetchCreatorCategorySuggestions,
  fetchCreatorPersonaTagSuggestions,
  fetchCreatorRestrictionSuggestions,
} from "../api/creator-suggestion-lists";
import {
  creatorAddOnOptionsQueryKey,
  getCreatorAddOnOptions,
} from "../api/get-creator-add-on-options";
import {
  creatorFacetOptionsQueryKey,
  getCreatorFacetOptions,
} from "../api/get-creator-facet-options";

const TWENTY_FOUR_HOURS = 24 * 60 * 60_000;

type SuggestionQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export function useCreatorCategorySuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: creatorSuggestionListsQueryKeys.categories,
    queryFn: fetchCreatorCategorySuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? TWENTY_FOUR_HOURS,
    gcTime: options?.gcTime,
  });
}

export function useCreatorPersonaTagSuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: creatorSuggestionListsQueryKeys.personaTags,
    queryFn: fetchCreatorPersonaTagSuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? TWENTY_FOUR_HOURS,
  });
}

export function useCreatorRestrictionSuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: creatorSuggestionListsQueryKeys.restrictions,
    queryFn: fetchCreatorRestrictionSuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? TWENTY_FOUR_HOURS,
  });
}

export function useCreatorFacetOptionsQuery(options?: SuggestionQueryOptions) {
  return useQuery({
    queryKey: creatorFacetOptionsQueryKey,
    queryFn: getCreatorFacetOptions,
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? TWENTY_FOUR_HOURS,
  });
}

export function useCreatorAddOnOptionsQuery(options?: SuggestionQueryOptions) {
  return useQuery({
    queryKey: creatorAddOnOptionsQueryKey,
    queryFn: getCreatorAddOnOptions,
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? TWENTY_FOUR_HOURS,
  });
}
