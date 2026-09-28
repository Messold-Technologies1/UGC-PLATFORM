import type { ConfigService } from '@nestjs/config';
import type { NotificationRecipientRole } from '@prisma/client';
import type { BrandAccessService } from '../../brand-access/brand-access.service';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * The notification event catalog's type layer.
 *
 * Code declares the events; the admin owns everything downstream of them —
 * templates, channels, timing and the on/off switch. Adding a genuinely new
 * moment is one entry here plus one `emit()` call at the point it happens;
 * everything after that deploy is configuration.
 *
 * See docs/NOTIFICATION_SYSTEM_PLAN.md §3.1.
 */

/** Declared variable types. Only used to label the admin variable picker. */
export type NotificationVarType =
  | 'string'
  | 'number'
  | 'date'
  | 'money'
  | 'url';

export type NotificationVarSpec = {
  type: NotificationVarType;
  /** Sample value; template validation renders against these before saving. */
  example: string;
};

/** Values a template may interpolate. Flat by design — no nested objects. */
export type TemplateVars = Record<string, string | number | boolean | null>;

/**
 * What `resolve()` hands back: who to address and what to render with.
 * `null` instead means the entity or recipient is gone (see {@link EventDefinition.resolve}).
 */
export type ResolvedRecipient = {
  /** The account, for the User.status gate and for log attribution. */
  userId: string | null;
  /** Gates the per-profile opt-in booleans. Omitted for `alwaysSend` events. */
  profileType?: 'creator' | 'brand';
  profileId?: string;
  email: string | null;
  phone: string | null;
  vars: TemplateVars;
};

/** Everything an event's hooks are given to do their work. */
export type EventContext = {
  prisma: PrismaService;
  config: ConfigService;
  /**
   * Resolves which account actually receives brand mail — the brand's own user,
   * or the owning agency's when the brand is agency-managed.
   */
  brandAccess: BrandAccessService;
  /** Frontend origin with no trailing slash, for building deep links. */
  frontendBaseUrl: string;
};

export type EventDefinition = {
  /** Human label for the admin events list. */
  label: string;
  description?: string;
  recipient: NotificationRecipientRole;
  /**
   * Bypasses the per-profile opt-in booleans. True ONLY on password-reset:
   * every other event respects the user's choice.
   */
  alwaysSend?: boolean;
  /** Shown in the admin variable picker; template validation checks against it. */
  vars: Record<string, NotificationVarSpec>;

  /**
   * Read the entity at SEND time and build the recipient + variables.
   *
   * Resolved per send rather than captured at emit time, so a reminder that
   * fires seven days later renders the current price, status and names instead
   * of a week-old snapshot.
   *
   * Returns `null` when the entity or its recipient no longer exists — the
   * step worker logs that as a skip. `| null` is in the signature so the case
   * cannot be quietly forgotten.
   */
  resolve: (
    ctx: EventContext,
    entityId: string,
  ) => Promise<ResolvedRecipient | null>;

  /**
   * Whether a *delayed* send is still warranted, re-checked when it fires.
   * Without it, a "+24h you haven't accepted the brief" row would happily
   * notify someone who accepted an hour ago.
   *
   * Consulted only for schedule rows with `offsetMinutes > 0`, so the ~30
   * send-immediately events omit it entirely. Its presence is what sets
   * `NotificationEvent.supportsDelay`, and its absence makes the admin API
   * refuse to save a delayed row for this event.
   *
   * For a delayed send that genuinely has no condition, opt in explicitly
   * with {@link ALWAYS_RELEVANT} rather than leaving this undefined.
   */
  stillRelevant?: (ctx: EventContext, entityId: string) => Promise<boolean>;
};

/**
 * Explicit opt-in for a delayed send with no exit condition. Spelled out so
 * that "this event can be scheduled late" is a deliberate, reviewable choice
 * rather than an oversight.
 */
export const ALWAYS_RELEVANT = (): Promise<boolean> => Promise.resolve(true);

/**
 * Identity function that pins each entry to {@link EventDefinition} while
 * keeping the literal key union — so `NotificationEventKey` stays exact and
 * `emit()` rejects a key that is not in the catalog.
 */
export function defineEvents<T extends Record<string, EventDefinition>>(
  events: T,
): T {
  return events;
}

/** True when a delayed schedule row may be configured for this event. */
export function supportsDelay(definition: EventDefinition): boolean {
  return typeof definition.stillRelevant === 'function';
}
