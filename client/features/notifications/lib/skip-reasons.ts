/**
 * Why a send was skipped, in words.
 *
 * The log stores the engine's own enum (`row_removed`, `not_relevant`). The
 * table used to print that with the underscores swapped for spaces, which told
 * an admin nothing: "Skipped: row removed" does not say which row, removed by
 * whom, or whether anything is wrong.
 *
 * Each entry says what happened and, where it matters, whether it is a problem.
 * The wording is taken from the gate that records it in
 * `notification-step.service.ts`, so these do not drift into being a guess at
 * what the code does.
 */
export type SkipReasonInfo = {
  /** Short label for the row. */
  label: string;
  /** One sentence on what actually happened. */
  detail: string;
  /**
   * Whether an admin should look into it.
   *
   * - `normal`   — the engine working as intended; nothing to do.
   * - `contact`  — the recipient cannot be reached on this channel.
   * - `attention`— something is off, or a decision an admin made is now biting.
   */
  tone: "normal" | "contact" | "attention";
};

export const SKIP_REASONS: Record<string, SkipReasonInfo> = {
  opted_out: {
    label: "Recipient opted out",
    detail:
      "They have this channel switched off in their notification settings. Only events marked always-send, such as password reset, ignore that.",
    tone: "normal",
  },
  suppressed: {
    label: "Address suppressed",
    detail:
      "The email address is on the SES suppression list after an earlier bounce or spam complaint. Sending again would cost sender reputation for every other email.",
    tone: "contact",
  },
  no_address: {
    label: "No email address",
    detail: "There is no email address on file for this recipient.",
    tone: "contact",
  },
  no_phone: {
    label: "No phone number",
    detail: "There is no phone number on file for this recipient.",
    tone: "contact",
  },
  no_push_subscription: {
    label: "Push never allowed",
    detail:
      "The account has not granted browser push on any device, or revoked it everywhere. Different from missing contact details — there is simply nothing registered to deliver to.",
    tone: "contact",
  },
  not_relevant: {
    label: "No longer needed",
    detail:
      "By the time this delayed send came due, what it was about had already been dealt with — the brief was accepted, the profile finished, the delivery reviewed. The reminder was dropped rather than nagging someone who had already acted.",
    tone: "normal",
  },
  event_inactive: {
    label: "Event switched off",
    detail:
      "The event was deactivated in admin, or removed from the catalog, between this send being queued and it coming due.",
    tone: "attention",
  },
  row_removed: {
    label: "Schedule row removed",
    detail:
      "This timing row was deleted or deactivated in admin after the send was queued. The job still came due, found no row to send for, and stopped.",
    tone: "attention",
  },
  entity_gone: {
    label: "Record not found",
    detail:
      "The order, profile or account this was about could not be read — deleted since, or the worker is pointed at a different database.",
    tone: "attention",
  },
  no_recipient: {
    label: "Nobody to send to",
    detail:
      "The event worked out who should receive this and the answer was nobody — no admin on duty, or the account behind it is gone.",
    tone: "normal",
  },
  user_inactive: {
    label: "Account inactive",
    detail: "The recipient's user account is not active.",
    tone: "normal",
  },
  superseded: {
    label: "Replaced by a later stage",
    detail:
      "A catch-up sweep found this profile already past several reminder stages. Only the latest was sent; the earlier ones were retired here so they could not arrive late and out of order.",
    tone: "normal",
  },
  sending_disabled: {
    label: "Shadow mode",
    detail:
      "NOTIFICATIONS_SENDING_ENABLED is off, so the engine resolved the recipient, rendered the message and recorded the decision without calling the provider. Nothing was sent, and nothing is wrong.",
    tone: "normal",
  },
};

/**
 * Falls back to the raw value rather than hiding it: a reason added to the
 * engine but not here should still be readable in the log, not blank.
 */
export function describeSkipReason(reason: string): SkipReasonInfo {
  return (
    SKIP_REASONS[reason] ?? {
      label: reason.replace(/_/g, " "),
      detail: "",
      tone: "normal",
    }
  );
}
