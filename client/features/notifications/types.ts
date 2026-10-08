export type NotificationChannel = "EMAIL" | "WHATSAPP";
export type NotificationRecipientRole = "CREATOR" | "BRAND" | "USER";

export type NotificationLogStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "SKIPPED"
  | "BOUNCED"
  | "COMPLAINED";

export interface TemplateRef {
  id: string;
  name: string;
}

export interface ScheduleRow {
  id?: string;
  /** 0 sends immediately. 30 = +30min, 1440 = +24h, 10080 = +7d. */
  offsetMinutes: number;
  channels: NotificationChannel[];
  templateOverrideId?: string | null;
  templateOverride?: TemplateRef | null;
  whatsappTemplateOverride?: string | null;
  isActive: boolean;
}

export interface NotificationEventSummary {
  key: string;
  label: string;
  description: string | null;
  recipient: NotificationRecipientRole;
  isActive: boolean;
  deprecated: boolean;
  /**
   * False means the event has no relevance check in code, so the API refuses a
   * row with an offset — a delayed send would notify people who already acted.
   */
  supportsDelay: boolean;
  alwaysSend: boolean;
  whatsappTemplateName: string;
  emailTemplate: TemplateRef | null;
  schedule: Pick<ScheduleRow, "offsetMinutes" | "channels" | "isActive">[];
  scheduleCount: number;
}

export interface VarSpec {
  type: "string" | "number" | "date" | "money" | "url";
  example: string;
}

export interface NotificationEventDetail extends Omit<
  NotificationEventSummary,
  "schedule" | "scheduleCount"
> {
  /** What this event's templates may interpolate. Drives the variable picker. */
  vars: Record<string, VarSpec>;
  emailTemplateId: string | null;
  schedule: ScheduleRow[];
  /**
   * True for events with no moment to emit from — a profile that simply sits
   * unfinished. Those can be sent to the entities that pre-date the system.
   */
  canSweep: boolean;
}

export interface SweepResult {
  scanned: number;
  /** Present on a preview. */
  wouldSend?: number;
  /** Present on a real run. */
  enqueued?: number;
  superseded?: number;
}

export interface NotificationTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  updatedAt: string;
  updatedByUserId: string | null;
  _count: { versions: number };
}

export interface NotificationTemplateDetail {
  id: string;
  name: string;
  description: string | null;
  subjectHbs: string;
  htmlHbs: string;
  /** Present when the body was written in the visual editor. */
  bodyDoc: EmailBodyDoc | null;
  textHbs: string | null;
  referencedVars: string[];
  isActive: boolean;
  version: number;
  updatedAt: string;
}

export interface SaveTemplateInput {
  name: string;
  description?: string | null;
  subjectHbs: string;
  /** Omitted when bodyDoc is sent: the server renders the HTML from it. */
  htmlHbs?: string;
  bodyDoc?: EmailBodyDoc;
  textHbs?: string | null;
  note?: string | null;
}

/**
 * The visual editor's document, as stored and as sent for preview.
 *
 * Deliberately loose: the server owns the schema and re-validates, so mirroring
 * every node type here would be a second definition to keep in step.
 */
export interface EmailBodyDoc {
  type: "doc";
  content?: Array<Record<string, unknown>>;
}

/** One reason a template cannot be saved. */
export interface TemplateIssue {
  part: "subject" | "html" | "text";
  kind:
    | "syntax"
    | "unknown-variable"
    | "unknown-helper"
    | "unknown-partial"
    | "empty-render";
  message: string;
}

export interface TemplatePreview {
  subject: string;
  html: string;
  text: string;
  /** "draft" when the preview rendered unsaved editor content. */
  source: "db" | "disk" | "draft";
  templateId: string | null;
  context: Record<string, string>;
  /** The plain-text template the HTML implies, for keeping the two in step. */
  derivedTextHbs: string;
}

/** Unsaved editor content, so the preview can show what is on screen. */
export interface TemplateDraft {
  subjectHbs: string;
  htmlHbs?: string;
  bodyDoc?: EmailBodyDoc;
  textHbs?: string | null;
}

export interface TemplateVersion {
  id: string;
  version: number;
  note: string | null;
  createdAt: string;
  createdByUserId: string | null;
}

export interface NotificationLogEntry {
  id: string;
  eventKey: string;
  entityId: string;
  occurrenceKey: string;
  offsetMinutes: number;
  channel: NotificationChannel;
  status: NotificationLogStatus;
  toAddress: string;
  renderedSubject: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  skippedReason: string | null;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
}

export interface NotificationLogPage {
  items: NotificationLogEntry[];
  nextCursor: string | null;
}

/** Offsets are stored as minutes; the editor shows a value plus a unit. */
export type OffsetUnit = "minutes" | "hours" | "days";

export function splitOffset(minutes: number): {
  value: number;
  unit: OffsetUnit;
} {
  if (minutes === 0) return { value: 0, unit: "minutes" };
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

export function toMinutes(value: number, unit: OffsetUnit): number {
  if (unit === "days") return value * 1440;
  if (unit === "hours") return value * 60;
  return value;
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) return "Immediately";
  const { value, unit } = splitOffset(minutes);
  const noun = value === 1 ? unit.replace(/s$/, "") : unit;
  return `After ${value} ${noun}`;
}
