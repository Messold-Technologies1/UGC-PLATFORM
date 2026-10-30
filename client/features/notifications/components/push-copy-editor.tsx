"use client";

import { Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateIssue } from "../types";

/** What a lock screen shows before it cuts the body off. */
const BODY_BUDGET = 120;

/**
 * Per-event browser-notification copy.
 *
 * Both fields are optional, and that is the point: left blank, the title is
 * the email subject with its "— Go Collab" sign-off trimmed and the body is
 * the opening line of the plain-text part with its greeting dropped. That
 * derivation is why every event had usable push copy the day the channel was
 * switched on, and it stays the default.
 *
 * Fill them in where the email reads badly on a lock screen. A subject is
 * written for an inbox, where naming the sender is the convention and there
 * is room for a sentence; a notification has roughly forty characters of
 * title and two lines of body, read at a glance and often by whoever is
 * standing nearby.
 *
 * The preview underneath is rendered by the server through the same function
 * the sender uses, so a blank field shows its fallback rather than an empty
 * box — what you see is what would arrive.
 */
export function PushCopyEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
  preview,
  issues,
}: {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  /** Rendered by the server; null while the first preview is in flight. */
  preview: { title: string; body: string } | null;
  issues: TemplateIssue[];
}) {
  const titleIssues = issues.filter((i) => i.part === "pushTitle");
  const bodyIssues = issues.filter((i) => i.part === "pushBody");
  const overLength = body.trim().length > BODY_BUDGET;

  return (
    <section className="space-y-4 rounded-xl border p-5">
      <div>
        <h2 className="text-sm font-medium">Browser notification</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Leave either field empty to derive it from the email — the subject
          for the title, the opening line for the body. Fill one in where the
          email reads badly on a lock screen.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="push-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="push-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Derived from the subject"
        />
        {titleIssues.map((issue, i) => (
          <p key={i} className="text-sm text-red-600">
            {issue.message}
          </p>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="push-body" className="text-sm font-medium">
            Body
          </label>
          <span
            className={
              overLength
                ? "text-xs text-amber-600"
                : "text-xs text-muted-foreground"
            }
          >
            {body.trim().length}/{BODY_BUDGET}
          </span>
        </div>
        <Textarea
          id="push-body"
          rows={2}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Derived from the plain-text part"
        />
        {overLength ? (
          <p className="text-sm text-muted-foreground">
            Longer than {BODY_BUDGET} characters is trimmed when sent, on a
            word boundary.
          </p>
        ) : null}
        {bodyIssues.map((issue, i) => (
          <p key={i} className="text-sm text-red-600">
            {issue.message}
          </p>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          How it arrives
        </p>
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="size-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {preview?.title || "—"}
            </p>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {preview?.body || "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
