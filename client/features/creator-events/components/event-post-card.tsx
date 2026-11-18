"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarRange, EyeOff, MoreHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CreatorEventApi } from "../api/types";
import { CREATOR_EVENT_MAX_LENGTH } from "../lib/constants";
import { formatEventTime } from "../lib/format-event-time";
import { formatDateRange } from "../lib/format-date-range";
import { EventDateFields, type EventDates } from "./event-date-fields";
import {
  useDeleteEventMutation,
  useUpdateEventMutation,
} from "../hooks/use-event-mutations";

interface EventPostCardProps {
  event: CreatorEventApi;
}

type Mode = "view" | "editing" | "confirming-delete";

export function EventPostCard({ event }: EventPostCardProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(event.body);
  const [dates, setDates] = useState<EventDates>({
    startsOn: event.startsOn ?? "",
    endsOn: event.endsOn ?? "",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const updateEvent = useUpdateEventMutation();
  const deleteEvent = useDeleteEventMutation();

  // A menu that stays open after a click elsewhere reads as stuck, and on a
  // phone there is nowhere obvious to dismiss it from.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const trimmed = draft.trim();
  const over = trimmed.length > CREATOR_EVENT_MAX_LENGTH;
  const badRange = Boolean(
    dates.startsOn && dates.endsOn && dates.endsOn < dates.startsOn,
  );
  const dateRange = formatDateRange(event.startsOn, event.endsOn);

  async function save() {
    if (!trimmed || over || badRange) return;
    await updateEvent.mutateAsync({
      id: event.id,
      body: trimmed,
      // Empty string clears the stored date; the server tells the two apart.
      startsOn: dates.startsOn,
      endsOn: dates.endsOn,
    });
    setMode("view");
  }

  function cancelEdit() {
    setDraft(event.body);
    setDates({ startsOn: event.startsOn ?? "", endsOn: event.endsOn ?? "" });
    setMode("view");
  }

  async function remove() {
    await deleteEvent.mutateAsync(event.id);
    // No state reset: the row leaves the list when the query refetches.
  }

  if (mode === "confirming-delete") {
    return (
      <div
        role="group"
        aria-label="Delete post confirmation"
        className="rounded-gc-lg border border-border bg-card p-5 shadow-pop sm:px-6"
      >
        <h3 className="mb-2 text-base font-extrabold tracking-tight">
          Delete this post?
        </h3>
        <p className="mb-4 text-[13px] leading-relaxed text-gc-ink-muted">
          It will disappear from the brand feed straight away. This can&rsquo;t
          be undone.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-4 text-[13px] font-bold text-gc-ink-soft hover:bg-muted"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deleteEvent.isPending}
            className="inline-flex min-h-10 items-center rounded-full bg-deep-pink px-5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {deleteEvent.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "editing") {
    return (
      <article className="rounded-gc-lg border border-gc-brand bg-card p-5 sm:px-6">
        <label
          htmlFor={`edit-${event.id}`}
          className="mb-2 block text-[11px] font-extrabold text-gc-ink-soft"
        >
          Edit post
        </label>
        <Textarea
          id={`edit-${event.id}`}
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-invalid={over || undefined}
          className="resize-none rounded-gc-md border-border bg-muted px-3.5 py-3 text-sm leading-relaxed md:text-sm"
        />
        <EventDateFields
          idPrefix={`edit-${event.id}`}
          value={dates}
          onChange={setDates}
          invalid={badRange}
          className="mt-3 border-t border-border/70 pt-3"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-[11px] font-bold tabular-nums",
              over ? "text-deep-pink" : "text-gc-muted-soft",
            )}
          >
            {trimmed.length} / {CREATOR_EVENT_MAX_LENGTH}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3.5 text-[13px] font-bold text-gc-ink-soft hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!trimmed || over || badRange || updateEvent.isPending}
              className="inline-flex min-h-9 items-center rounded-full bg-gc-brand-hover px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:bg-gc-brand-muted"
            >
              {updateEvent.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-gc-lg border bg-card p-5 sm:px-6",
        event.hidden ? "border-gc-brand-muted" : "border-border",
      )}
    >
      {event.hidden ? (
        <div className="mb-3.5 flex items-start gap-2 rounded-gc-sm bg-gc-brand-soft px-3.5 py-2.5">
          <EyeOff
            className="mt-0.5 size-3.5 shrink-0 text-gc-tint-rose-ink"
            aria-hidden="true"
          />
          <p className="text-xs font-bold leading-relaxed text-gc-tint-rose-ink">
            Hidden by GoCollab — brands can&rsquo;t see this post.
            {event.hiddenReason ? ` ${event.hiddenReason}.` : ""}{" "}
            <Link href="/contact" className="text-deep-pink underline">
              Contact support
            </Link>
          </p>
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <time
            dateTime={event.createdAt}
            className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-gc-muted"
          >
            {formatEventTime(event.createdAt)}
          </time>
          {dateRange ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gc-brand-muted bg-gc-brand-soft px-3 py-1 text-xs font-extrabold text-deep-pink">
              <CalendarRange className="size-3" aria-hidden="true" />
              {dateRange}
            </span>
          ) : null}
          {event.editedAt ? (
            <span className="text-xs font-semibold text-gc-muted-soft">
              edited
            </span>
          ) : null}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-gc-muted-soft hover:bg-muted",
              menuOpen && "bg-muted text-foreground",
            )}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-20 w-38 rounded-gc-md border border-border bg-popover p-1.5 shadow-pop">
              <button
                type="button"
                onClick={() => {
                  setDraft(event.body);
                  setDates({
                    startsOn: event.startsOn ?? "",
                    endsOn: event.endsOn ?? "",
                  });
                  setMode("editing");
                  setMenuOpen(false);
                }}
                className="flex min-h-9 w-full items-center rounded-lg px-3 text-left text-[13px] font-semibold hover:bg-muted"
              >
                Edit post
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("confirming-delete");
                  setMenuOpen(false);
                }}
                className="flex min-h-9 w-full items-center rounded-lg px-3 text-left text-[13px] font-semibold text-deep-pink hover:bg-muted"
              >
                Delete post
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* pre-line: the creator's own line breaks are the only formatting a
          post has, and the body is a text node, so nothing in it is markup. */}
      <p
        className={cn(
          "whitespace-pre-line text-[15px] leading-relaxed",
          event.hidden ? "text-gc-ink-muted" : "text-foreground",
        )}
      >
        {event.body}
      </p>
    </article>
  );
}
