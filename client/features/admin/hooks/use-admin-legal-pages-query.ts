import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminLegalPages,
  fetchAdminLegalPageDetail,
  fetchLegalPageVersions,
  fetchLegalPageVersion,
} from "../api/legal-pages";

// ─── Query Keys ──────────────────────────────────────────────────

export const adminLegalPagesQueryKey = () =>
  ["admin", "legal-pages"] as const;

export const adminLegalPageDetailQueryKey = (slug: string) =>
  ["admin", "legal-pages", slug] as const;

export const adminLegalPageVersionsQueryKey = (slug: string) =>
  ["admin", "legal-pages", slug, "versions"] as const;

export const adminLegalPageVersionQueryKey = (slug: string, versionId: string) =>
  ["admin", "legal-pages", slug, "versions", versionId] as const;

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAdminLegalPageVersionQuery(slug: string, versionId: string | null) {
  return useQuery({
    queryKey: adminLegalPageVersionQueryKey(slug, versionId ?? ""),
    queryFn: () => fetchLegalPageVersion(slug, versionId!),
    enabled: !!versionId,
    staleTime: Infinity, // Versions are immutable
  });
}
