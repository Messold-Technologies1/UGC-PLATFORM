import { useQuery } from "@tanstack/react-query";
import {
  listAdminPortfolioVideos,
  portfolioAdminVideosQueryKey,
} from "../api/list-admin-portfolio-videos";

type UseAdminPortfolioVideosQueryOptions = {
  creatorId?: string;
  enabled?: boolean;
  staleTime?: number;
};

export function useAdminPortfolioVideosQuery(
  options?: UseAdminPortfolioVideosQueryOptions,
) {
  return useQuery({
    queryKey: portfolioAdminVideosQueryKey(options?.creatorId),
    queryFn: () => listAdminPortfolioVideos(options?.creatorId),
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
}
