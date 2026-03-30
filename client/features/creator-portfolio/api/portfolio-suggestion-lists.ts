import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export const portfolioSuggestionListsQueryKeys = {
  industries: ["creator-portfolio-suggestions", "industries"] as const,
  tags: ["creator-portfolio-suggestions", "tags"] as const,
  languages: ["creator-portfolio-suggestions", "languages"] as const,
};

export async function fetchPortfolioIndustrySuggestions(): Promise<string[]> {
  const { data } = await api.get<string[]>(
    ENDPOINTS.CREATOR_PORTFOLIO.SUGGESTIONS_INDUSTRIES,
  );
  return data;
}

export async function fetchPortfolioTagSuggestions(): Promise<string[]> {
  const { data } = await api.get<string[]>(
    ENDPOINTS.CREATOR_PORTFOLIO.SUGGESTIONS_TAGS,
  );
  return data;
}

export async function fetchPortfolioLanguageSuggestions(): Promise<string[]> {
  const { data } = await api.get<string[]>(
    ENDPOINTS.CREATOR_PORTFOLIO.SUGGESTIONS_LANGUAGES,
  );
  return data;
}
