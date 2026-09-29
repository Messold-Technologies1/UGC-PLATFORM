import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  NotificationEventDetail,
  NotificationEventSummary,
  NotificationLogPage,
  NotificationTemplateDetail,
  NotificationTemplateSummary,
  SaveTemplateInput,
  ScheduleRow,
  SweepResult,
  TemplateDraft,
  TemplatePreview,
  TemplateVersion,
} from "../types";

const N = ENDPOINTS.ADMIN.NOTIFICATIONS;

export async function fetchEvents(): Promise<NotificationEventSummary[]> {
  const { data } = await api.get<NotificationEventSummary[]>(N.EVENTS);
  return data;
}

export async function fetchEvent(key: string): Promise<NotificationEventDetail> {
  const { data } = await api.get<NotificationEventDetail>(N.EVENT(key));
  return data;
}

export async function updateEvent(
  key: string,
  payload: {
    isActive?: boolean;
    emailTemplateId?: string | null;
    whatsappTemplateName?: string | null;
  },
): Promise<NotificationEventDetail> {
  const { data } = await api.patch<NotificationEventDetail>(N.EVENT(key), payload);
  return data;
}

export async function replaceSchedule(
  key: string,
  rows: ScheduleRow[],
): Promise<NotificationEventDetail> {
  const { data } = await api.put<NotificationEventDetail>(N.EVENT_SCHEDULE(key), {
    rows: rows.map((row) => ({
      offsetMinutes: row.offsetMinutes,
      channels: row.channels,
      templateOverrideId: row.templateOverrideId ?? null,
      whatsappTemplateOverride: row.whatsappTemplateOverride ?? null,
      isActive: row.isActive,
    })),
  });
  return data;
}

export async function backfillRow(
  key: string,
  payload: { offsetMinutes: number; withinDays?: number; dryRun?: boolean },
): Promise<{ matched: number; enqueued: number }> {
  const { data } = await api.post<{ matched: number; enqueued: number }>(
    N.EVENT_BACKFILL(key),
    payload,
  );
  return data;
}

export async function sweepEvent(
  key: string,
  dryRun: boolean,
): Promise<SweepResult> {
  const { data } = await api.post<SweepResult>(
    N.EVENT_SWEEP(key),
    {},
    { params: { dryRun: String(dryRun) } },
  );
  return data;
}

export async function fetchTemplates(): Promise<NotificationTemplateSummary[]> {
  const { data } = await api.get<NotificationTemplateSummary[]>(N.TEMPLATES);
  return data;
}

export async function fetchTemplate(
  id: string,
): Promise<NotificationTemplateDetail> {
  const { data } = await api.get<NotificationTemplateDetail>(N.TEMPLATE(id));
  return data;
}

export async function saveTemplate(
  id: string,
  payload: SaveTemplateInput,
): Promise<{ id: string; version: number }> {
  const { data } = await api.put<{ id: string; version: number }>(
    N.TEMPLATE(id),
    payload,
  );
  return data;
}

export async function createTemplate(
  payload: SaveTemplateInput,
): Promise<{ id: string; version: number }> {
  const { data } = await api.post<{ id: string; version: number }>(
    N.TEMPLATES,
    payload,
  );
  return data;
}

export async function previewTemplate(
  id: string,
  eventKey?: string,
  draft?: TemplateDraft,
): Promise<TemplatePreview> {
  const { data } = await api.post<TemplatePreview>(N.TEMPLATE_PREVIEW(id), {
    eventKey,
    ...(draft ?? {}),
  });
  return data;
}

/** Renders draft content for a template with no row yet, for the create form. */
export async function previewDraftTemplate(payload: {
  name: string;
  eventKey?: string;
  subjectHbs: string;
  htmlHbs: string;
  textHbs?: string | null;
}): Promise<TemplatePreview> {
  const { data } = await api.post<TemplatePreview>(
    N.TEMPLATE_PREVIEW_DRAFT,
    payload,
  );
  return data;
}

/**
 * The plain-text template a block of HTML implies. Server-side so the editor
 * and the send path derive it exactly the same way.
 */
export async function deriveTemplateText(htmlHbs: string): Promise<string> {
  const { data } = await api.post<{ textHbs: string }>(
    N.TEMPLATE_DERIVE_TEXT,
    { htmlHbs },
  );
  return data.textHbs;
}

export async function fetchTemplateVersions(
  id: string,
): Promise<TemplateVersion[]> {
  const { data } = await api.get<TemplateVersion[]>(N.TEMPLATE_VERSIONS(id));
  return data;
}

export async function revertTemplate(
  id: string,
  version: number,
): Promise<{ id: string; version: number }> {
  const { data } = await api.post<{ id: string; version: number }>(
    N.TEMPLATE_REVERT(id, version),
  );
  return data;
}

export async function fetchLogs(params: {
  eventKey?: string;
  status?: string;
  channel?: string;
  cursor?: string;
}): Promise<NotificationLogPage> {
  const { data } = await api.get<NotificationLogPage>(N.LOGS, { params });
  return data;
}
