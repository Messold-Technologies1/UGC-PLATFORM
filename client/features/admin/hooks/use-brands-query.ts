import { useQuery } from "@tanstack/react-query";
import { fetchBrands } from "../api/fetch-brands";
import type { AdminBrandsQueryDto } from "../types";

export const brandsQueryKey = (query?: AdminBrandsQueryDto) => [
  "admin",
  "brands",
  query,
] as const;

export function useBrandsQuery(query?: AdminBrandsQueryDto) {
  return useQuery({
    queryKey: brandsQueryKey(query),
    queryFn: () => fetchBrands(query),
  });
}
