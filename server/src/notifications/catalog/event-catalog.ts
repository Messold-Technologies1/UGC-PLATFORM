import type { EventDefinition } from './define-events';
import { orderEvents } from './order.events';
import { EVENTS_NOT_IN_CATALOG, profileEvents } from './profile.events';

/**
 * The notification event catalog.
 *
 * Code owns this list; the admin owns everything downstream — which templates
 * each event uses, which channels, at what offsets, and whether it runs at all.
 * Adding a genuinely new moment is one entry here plus one `emit()` call.
 *
 * Keys deliberately match the legacy EmailTemplateKey values, so a template
 * carries its name across the migration and the WhatsApp name stays derivable
 * as the key with '-' replaced by '_'.
 */
export const NOTIFICATION_EVENTS = {
  ...orderEvents,
  ...profileEvents,
} satisfies Record<string, EventDefinition>;

export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS;

/**
 * The same catalog widened to the shared shape. `satisfies` above keeps each
 * entry's literal type for key inference, which also means optional fields like
 * `alwaysSend` are absent from members that omit them — so anything iterating
 * the catalog uses this view instead.
 */
export const NOTIFICATION_EVENTS_BY_KEY: Record<string, EventDefinition> =
  NOTIFICATION_EVENTS;

export const NOTIFICATION_EVENT_KEYS = Object.keys(
  NOTIFICATION_EVENTS,
) as NotificationEventKey[];

export function getEventDefinition(key: string): EventDefinition | null {
  return (NOTIFICATION_EVENTS as Record<string, EventDefinition>)[key] ?? null;
}

/** The WhatsApp template name an event defaults to, per the existing convention. */
export function defaultWhatsAppTemplateName(key: string): string {
  return key.replace(/-/g, '_');
}

export { EVENTS_NOT_IN_CATALOG };
