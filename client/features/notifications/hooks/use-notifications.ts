import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  backfillRow,
  createTemplate,
  fetchEvent,
  fetchEvents,
  fetchLogs,
  fetchTemplate,
  fetchTemplateVersions,
  fetchTemplates,
  previewTemplate,
  replaceSchedule,
  revertTemplate,
  saveTemplate,
  sweepEvent,
  updateEvent,
} from "../api/notifications-api";
import type { SaveTemplateInput, ScheduleRow } from "../types";

export const notificationKeys = {
  events: ["admin", "notifications", "events"] as const,
  event: (key: string) => ["admin", "notifications", "event", key] as const,
  templates: ["admin", "notifications", "templates"] as const,
  template: (id: string) => ["admin", "notifications", "template", id] as const,
  versions: (id: string) =>
    ["admin", "notifications", "template", id, "versions"] as const,
  logs: (filters: Record<string, string | undefined>) =>
    ["admin", "notifications", "logs", filters] as const,
};

export function useNotificationEventsQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.events,
    queryFn: fetchEvents,
    enabled,
  });
}

export function useNotificationEventQuery(key: string | null) {
  return useQuery({
    queryKey: notificationKeys.event(key ?? ""),
    queryFn: () => fetchEvent(key as string),
    enabled: Boolean(key),
  });
}

export function useUpdateEventMutation(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateEvent>[1]) =>
      updateEvent(key, payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: notificationKeys.events }),
        qc.invalidateQueries({ queryKey: notificationKeys.event(key) }),
      ]);
    },
  });
}

export function useReplaceScheduleMutation(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: ScheduleRow[]) => replaceSchedule(key, rows),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: notificationKeys.events }),
        qc.invalidateQueries({ queryKey: notificationKeys.event(key) }),
      ]);
    },
  });
}

export function useBackfillMutation(key: string) {
  return useMutation({
    mutationFn: (payload: Parameters<typeof backfillRow>[1]) =>
      backfillRow(key, payload),
  });
}

export function useSweepMutation(key: string) {
  return useMutation({
    mutationFn: (dryRun: boolean) => sweepEvent(key, dryRun),
  });
}

export function useTemplatesQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.templates,
    queryFn: fetchTemplates,
    enabled,
  });
}

export function useTemplateQuery(id: string | null) {
  return useQuery({
    queryKey: notificationKeys.template(id ?? ""),
    queryFn: () => fetchTemplate(id as string),
    enabled: Boolean(id),
  });
}

export function useSaveTemplateMutation(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveTemplateInput) =>
      id ? saveTemplate(id, payload) : createTemplate(payload),
    onSuccess: async (result) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: notificationKeys.templates }),
        qc.invalidateQueries({ queryKey: notificationKeys.template(result.id) }),
        qc.invalidateQueries({ queryKey: notificationKeys.versions(result.id) }),
      ]);
    },
  });
}

export function useTemplatePreviewMutation(id: string) {
  return useMutation({
    mutationFn: (eventKey?: string) => previewTemplate(id, eventKey),
  });
}

export function useTemplateVersionsQuery(id: string | null) {
  return useQuery({
    queryKey: notificationKeys.versions(id ?? ""),
    queryFn: () => fetchTemplateVersions(id as string),
    enabled: Boolean(id),
  });
}

export function useRevertTemplateMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => revertTemplate(id, version),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: notificationKeys.template(id) }),
        qc.invalidateQueries({ queryKey: notificationKeys.versions(id) }),
      ]);
    },
  });
}

export function useNotificationLogsQuery(filters: {
  eventKey?: string;
  status?: string;
  channel?: string;
}) {
  return useQuery({
    queryKey: notificationKeys.logs(filters),
    queryFn: () => fetchLogs(filters),
  });
}
