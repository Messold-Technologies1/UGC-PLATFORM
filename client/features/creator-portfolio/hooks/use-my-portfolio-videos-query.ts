import { useQuery } from "@tanstack/react-query";
import {
  listMyPortfolioVideos,
  portfolioMyVideosQueryKey,
} from "../api/list-my-portfolio-videos";

type UseMyPortfolioVideosQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
};

export function useMyPortfolioVideosQuery(
  options?: UseMyPortfolioVideosQueryOptions,
) {
  return useQuery({
    queryKey: portfolioMyVideosQueryKey,
    queryFn: listMyPortfolioVideos,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}
