import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminLegalPages,
  fetchAdminLegalPageDetail,
  fetchLegalPageVersions,
} from "../api/legal-pages";

// ─── Query Keys ──────────────────────────────────────────────────

export const adminLegalPagesQueryKey = () =>
  ["admin", "legal-pages"] as const;

export const adminLegalPageDetailQueryKey = (slug: string) =>
  ["admin", "legal-pages", slug] as const;

export const adminLegalPageVersionsQueryKey = (slug: string) =>
  ["admin", "legal-pages", slug, "versions"] as const;

// ─── Hooks ───────────────────────────────────────────────────────

export function useAdminLegalPagesQuery() {
  return useQuery({
    queryKey: adminLegalPagesQueryKey(),
    queryFn: fetchAdminLegalPages,
    staleTime: 30_000,
  });
}

export function useAdminLegalPageDetailQuery(slug: string) {
  return useQuery({
    queryKey: adminLegalPageDetailQueryKey(slug),
    queryFn: () => fetchAdminLegalPageDetail(slug),
    staleTime: 15_000,
    enabled: !!slug,
  });
}

export function useAdminLegalPageVersionsQuery(slug: string) {
  return useQuery({
    queryKey: adminLegalPageVersionsQueryKey(slug),
    queryFn: () => fetchLegalPageVersions(slug),
    staleTime: 60_000,
    enabled: !!slug,
  });
}
