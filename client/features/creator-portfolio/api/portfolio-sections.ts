import api from "@/lib/api";
import type { PortfolioSectionApi, PortfolioApiRequestOptions } from "./types";
import { ENDPOINTS } from "@/lib/endpoints";

export async function listMySections(
  opts?: PortfolioApiRequestOptions,
): Promise<PortfolioSectionApi[]> {
  const { data } = await api.get<PortfolioSectionApi[]>(
    ENDPOINTS.CREATOR_PORTFOLIO.SECTIONS_ME,
    { params: opts?.adminCreatorId ? { creatorId: opts.adminCreatorId } : {} },
  );
  return data;
}

export async function createSection(
  name: string,
  opts?: PortfolioApiRequestOptions,
): Promise<PortfolioSectionApi> {
  const { data } = await api.post<PortfolioSectionApi>(
    ENDPOINTS.CREATOR_PORTFOLIO.SECTIONS,
    { name, creatorId: opts?.adminCreatorId },
  );
  return data;
}

export async function updateSection(
  id: string,
  payload: { name?: string; position?: number },
  opts?: PortfolioApiRequestOptions,
): Promise<PortfolioSectionApi> {
  const { data } = await api.patch<PortfolioSectionApi>(
    ENDPOINTS.CREATOR_PORTFOLIO.SECTION_DETAIL(id),
    { ...payload, creatorId: opts?.adminCreatorId },
  );
  return data;
}

export async function deleteSection(
  id: string,
  opts?: PortfolioApiRequestOptions,
): Promise<void> {
  await api.delete(ENDPOINTS.CREATOR_PORTFOLIO.SECTION_DETAIL(id), {
    params: opts?.adminCreatorId ? { creatorId: opts.adminCreatorId } : {},
  });
}

export async function reorderSections(
  sections: { id: string; position: number }[],
  opts?: PortfolioApiRequestOptions,
): Promise<PortfolioSectionApi[]> {
  const { data } = await api.put<PortfolioSectionApi[]>(
    ENDPOINTS.CREATOR_PORTFOLIO.SECTIONS_REORDER,
    { sections, creatorId: opts?.adminCreatorId },
  );
  return data;
}

export async function addVideosToSection(
  sectionId: string,
  videos: { videoId: string; position?: number }[],
  opts?: PortfolioApiRequestOptions,
): Promise<PortfolioSectionApi> {
  const { data } = await api.post<PortfolioSectionApi>(
    ENDPOINTS.CREATOR_PORTFOLIO.SECTION_VIDEOS(sectionId),
    { videos, creatorId: opts?.adminCreatorId },
  );
  return data;
}

export async function removeVideoFromSection(
  sectionId: string,
  videoId: string,
  opts?: PortfolioApiRequestOptions,
): Promise<void> {
  await api.delete(
    ENDPOINTS.CREATOR_PORTFOLIO.SECTION_VIDEO_DETAIL(sectionId, videoId),
    {
      params: opts?.adminCreatorId ? { creatorId: opts.adminCreatorId } : {},
    },
  );
}
