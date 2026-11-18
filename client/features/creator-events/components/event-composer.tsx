"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CREATOR_EVENT_MAX_LENGTH } from "../lib/constants";
import { useCreateEventMutation } from "../hooks/use-event-mutations";
import { EventDateFields, type EventDates } from "./event-date-fields";

const NO_DATES: EventDates = { startsOn: "", endsOn: "" };

interface EventComposerProps {
  /** Shown back to the creator as "Posting as {slug}". */
  publicSlug?: string | null;
}

export function EventComposer({ publicSlug }: EventComposerProps) {
  const [body, setBody] = useState("");
  const [dates, setDates] = useState<EventDates>(NO_DATES);
  const createEvent = useCreateEventMutation();

  const trimmed = body.trim();
  const over = trimmed.length > CREATOR_EVENT_MAX_LENGTH;
  // The server checks this too; catching it here means the creator sees it
  // while they are still looking at the two fields.
  const badRange = Boolean(
    dates.startsOn && dates.endsOn && dates.endsOn < dates.startsOn,
  );
  const canPost =
    trimmed.length > 0 && !over && !badRange && !createEvent.isPending;

  async function submit() {
    if (!canPost) return;
    await createEvent.mutateAsync({
      body: trimmed,
      startsOn: dates.startsOn || undefined,
      endsOn: dates.endsOn || undefined,
    });
    setBody("");
    setDates(NO_DATES);
  }

  return (
    <section className="overflow-hidden rounded-gc-lg border border-border bg-card shadow-pop">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gc-brand-soft px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-gc-brand" aria-hidden="true" />
          <p className="text-xs font-bold text-gc-tint-rose-ink">
            Goes live the moment you post — every brand on GoCollab sees it
          </p>
        </div>
        {publicSlug ? (
          <p className="text-xs font-semibold text-deep-pink">
            Posting as {publicSlug}
          </p>
        ) : null}
      </div>

      <div className="px-5 pt-5 pb-4 sm:px-6">
        <label
          htmlFor="event-body"
          className="mb-2 block text-[13px] font-bold text-gc-ink-soft"
        >
          What&rsquo;s happening?
        </label>
        <Textarea
          id="event-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-describedby="event-body-count"
          aria-invalid={over || undefined}
          placeholder="e.g. Travelling to Jaipur this week for a family wedding — happy to shoot festive and ethnic content while I'm there."
          className="min-h-28 resize-none rounded-gc-md border-border bg-muted px-4 py-3 text-[15px] leading-relaxed md:text-[15px]"
        />

        <div className="mt-4 border-t border-border/70 pt-4">
          <EventDateFields
            idPrefix="composer"
            value={dates}
            onChange={setDates}
            invalid={badRange}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-80 text-xs leading-relaxed text-gc-muted">
            Keep your real name, phone number and socials out of it — brands
            know you by your profile ID.
          </p>
          <div className="flex items-center gap-3.5">
            <span
              id="event-body-count"
              className={cn(
                "text-xs font-bold tabular-nums",
                over ? "text-deep-pink" : "text-gc-muted-soft",
              )}
            >
              {over
                ? `${trimmed.length} / ${CREATOR_EVENT_MAX_LENGTH} — ${
                    trimmed.length - CREATOR_EVENT_MAX_LENGTH
                  } over`
                : `${trimmed.length} / ${CREATOR_EVENT_MAX_LENGTH}`}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!canPost}
              className="inline-flex min-h-11 items-center rounded-full bg-gc-brand-hover px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:bg-gc-brand-muted disabled:hover:opacity-100"
            >
              {createEvent.isPending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
