import { useQuery } from "@tanstack/react-query";
import type { PortfolioVideoApi } from "../api/types";
import {
  fetchPublicPortfolioVideosByCreatorId,
  publicPortfolioVideosByCreatorQueryKey,
} from "../api/list-public-portfolio-videos";

type UsePublicPortfolioVideosQueryOptions = {
  enabled?: boolean;
  initialData?: PortfolioVideoApi[];
  placeholderData?: PortfolioVideoApi[];
  staleTime?: number;
};

export function usePublicPortfolioVideosQuery(
  creatorId: string,
  options?: UsePublicPortfolioVideosQueryOptions,
) {
  return useQuery({
    queryKey: publicPortfolioVideosByCreatorQueryKey(creatorId),
    queryFn: () => fetchPublicPortfolioVideosByCreatorId(creatorId),
    enabled: options?.enabled,
    initialData: options?.initialData,
    placeholderData: options?.placeholderData,
    staleTime: options?.staleTime,
  });
}
