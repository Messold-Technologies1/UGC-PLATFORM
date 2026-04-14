import { useQuery } from "@tanstack/react-query";
import {
  fetchPortfolioIndustrySuggestions,
  fetchPortfolioLanguageSuggestions,
  fetchPortfolioTagSuggestions,
  portfolioSuggestionListsQueryKeys,
} from "../api/portfolio-suggestion-lists";

type SuggestionQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
};

export function usePortfolioIndustrySuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: portfolioSuggestionListsQueryKeys.industries,
    queryFn: fetchPortfolioIndustrySuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}

export function usePortfolioTagSuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: portfolioSuggestionListsQueryKeys.tags,
    queryFn: fetchPortfolioTagSuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}

export function usePortfolioLanguageSuggestionsQuery(
  options?: SuggestionQueryOptions,
) {
  return useQuery({
    queryKey: portfolioSuggestionListsQueryKeys.languages,
    queryFn: fetchPortfolioLanguageSuggestions,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}
