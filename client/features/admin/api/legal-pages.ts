import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminLegalPageListResponse,
  AdminLegalPageDetailResponse,
  LegalPageDraftResponse,
  LegalPageResponse,
  SaveDraftInput,
  CreateLegalPageInput,
  ImportDraftInput,
  RejectDraftInput,
  LegalPageVersionListResponse,
  LegalPageVersionDetail,
} from "../types";

// ─── Queries ─────────────────────────────────────────────────────

export async function fetchAdminLegalPages(): Promise<AdminLegalPageListResponse> {
  const { data } = await api.get<AdminLegalPageListResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.LIST,
  );
  return data;
}

export async function fetchAdminLegalPageDetail(
  slug: string,
): Promise<AdminLegalPageDetailResponse> {
  const { data } = await api.get<AdminLegalPageDetailResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.BY_SLUG(slug),
  );
  return data;
}

export async function fetchLegalPageDraftPreview(
  slug: string,
): Promise<LegalPageResponse> {
  const { data } = await api.get<LegalPageResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.PREVIEW(slug),
  );
  return data;
}

export async function fetchLegalPageVersions(
  slug: string,
): Promise<LegalPageVersionListResponse> {
  const { data } = await api.get<LegalPageVersionListResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.VERSIONS(slug),
  );
  return data;
}

export async function fetchLegalPageVersion(
  slug: string,
  versionId: string,
): Promise<LegalPageVersionDetail> {
  const { data } = await api.get<LegalPageVersionDetail>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.VERSION(slug, versionId),
  );
  return data;
}

// ─── Mutations ───────────────────────────────────────────────────

export async function createLegalPage(
  payload: CreateLegalPageInput,
): Promise<AdminLegalPageDetailResponse> {
  const { data } = await api.post<AdminLegalPageDetailResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.CREATE,
    payload,
  );
  return data;
}

export async function saveLegalPageDraft(
  slug: string,
  payload: SaveDraftInput,
): Promise<LegalPageDraftResponse> {
  const { data } = await api.put<LegalPageDraftResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.DRAFT(slug),
    payload,
  );
  return data;
}

export async function importLegalPageDraft(
  slug: string,
  payload: ImportDraftInput,
): Promise<LegalPageDraftResponse> {
  const { data } = await api.post<LegalPageDraftResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.IMPORT(slug),
    payload,
  );
  return data;
}

export async function submitLegalPageForReview(
  slug: string,
): Promise<LegalPageDraftResponse> {
  const { data } = await api.post<LegalPageDraftResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.SUBMIT_REVIEW(slug),
  );
  return data;
}

export async function publishLegalPageDraft(
  slug: string,
): Promise<AdminLegalPageDetailResponse> {
  const { data } = await api.post<AdminLegalPageDetailResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.PUBLISH(slug),
  );
  return data;
}

export async function rejectLegalPageDraft(
  slug: string,
  payload?: RejectDraftInput,
): Promise<LegalPageDraftResponse> {
  const { data } = await api.post<LegalPageDraftResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.REJECT_DRAFT(slug),
    payload,
  );
  return data;
}

export async function discardLegalPageDraft(slug: string): Promise<void> {
  await api.delete(ENDPOINTS.ADMIN.LEGAL_PAGES.DRAFT(slug));
}

export async function deleteLegalPage(slug: string): Promise<void> {
  await api.delete(ENDPOINTS.ADMIN.LEGAL_PAGES.BY_SLUG(slug));
}

export async function restoreLegalPageVersion(
  slug: string,
  versionId: string,
): Promise<LegalPageDraftResponse> {
  const { data } = await api.post<LegalPageDraftResponse>(
    ENDPOINTS.ADMIN.LEGAL_PAGES.RESTORE_VERSION(slug, versionId),
  );
  return data;
}
