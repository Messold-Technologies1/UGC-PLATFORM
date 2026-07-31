// ─── Public Response Types ───────────────────────────────────────

export interface LegalSectionResponse {
  id: string;
  anchorId: string;
  title: string;
  tocLabel: string;
  content: string;
  sortOrder: number;
}

export interface LegalPageResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  effectiveDate: string;
  updatedAt: string;
  sections: LegalSectionResponse[];
}

// ─── Admin Response Types ────────────────────────────────────────

export type LegalDraftStatus = "DRAFT" | "IN_REVIEW";

export interface LegalPageDraftResponse {
  id: string;
  status: LegalDraftStatus;
  title: string;
  description: string;
  effectiveDate: string;
  sections: DraftSectionData[];
  changeNote: string | null;
  createdBy: string;
  createdByEmail?: string;
  reviewNote: string | null;
  restoredFromVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftSectionData {
  anchorId: string;
  title: string;
  tocLabel: string;
  content: string;
  sortOrder: number;
}

export interface AdminLegalPageListItem {
  id: string;
  slug: string;
  title: string;
  effectiveDate: string;
  sectionCount: number;
  updatedAt: string;
  draftStatus: LegalDraftStatus | null;
}

export interface AdminLegalPageListResponse {
  pages: AdminLegalPageListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminLegalPageDetailResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  effectiveDate: string;
  updatedAt: string;
  sections: LegalSectionResponse[];
  draft: LegalPageDraftResponse | null;
}

// ─── Admin Input Types ───────────────────────────────────────────

export interface SaveDraftInput {
  title: string;
  description: string;
  effectiveDate: string;
  sections: DraftSectionData[];
  changeNote?: string;
}

export interface CreateLegalPageInput {
  slug: string;
  title: string;
  description: string;
  effectiveDate: string;
  sections?: DraftSectionData[];
}

export type LegalImportFormat = "html" | "markdown" | "docx";

export interface ImportDraftInput {
  format: LegalImportFormat;
  content: string;
  title?: string;
  description?: string;
  effectiveDate?: string;
  changeNote?: string;
}

export interface RejectDraftInput {
  reviewNote?: string;
}

// ─── Version History Types ───────────────────────────────────────

export interface LegalPageVersionListItem {
  id: string;
  changedBy: string;
  changedByEmail?: string;
  changeNote: string | null;
  restoredFromVersionId?: string;
  createdAt: string;
}

export interface LegalPageVersionListResponse {
  versions: LegalPageVersionListItem[];
}

export interface LegalPageVersionDetail {
  id: string;
  pageId: string;
  snapshot: {
    title: string;
    description: string;
    effectiveDate: string;
    sections: DraftSectionData[];
  };
  changedBy: string;
  changedByEmail?: string;
  changeNote: string | null;
  restoredFromVersionId?: string;
  createdAt: string;
}
