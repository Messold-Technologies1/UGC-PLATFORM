"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EventDates {
  startsOn: string;
  endsOn: string;
}

interface EventDateFieldsProps {
  /** Unique per form, so the composer and an inline editor don't collide. */
  idPrefix: string;
  value: EventDates;
  onChange: (next: EventDates) => void;
  /** Set when the end date is before the start date. */
  invalid?: boolean;
  className?: string;
}

/**
 * The optional "when" on a post. Both ends are optional and independent:
 * plenty of posts are about nothing dated, and a creator who only knows when
 * they get back should be able to say just that.
 */
export function EventDateFields({
  idPrefix,
  value,
  onChange,
  invalid,
  className,
}: EventDateFieldsProps) {
  const hasAny = Boolean(value.startsOn || value.endsOn);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-36 flex-1">
          <label
            htmlFor={`${idPrefix}-starts`}
            className="mb-1.5 block text-[11px] font-bold text-gc-ink-soft"
          >
            Starts
          </label>
          <Input
            id={`${idPrefix}-starts`}
            type="date"
            value={value.startsOn}
            max={value.endsOn || undefined}
            onChange={(e) => onChange({ ...value, startsOn: e.target.value })}
            className="h-10 rounded-gc-sm"
          />
        </div>
        <div className="min-w-36 flex-1">
          <label
            htmlFor={`${idPrefix}-ends`}
            className="mb-1.5 block text-[11px] font-bold text-gc-ink-soft"
          >
            Ends
          </label>
          <Input
            id={`${idPrefix}-ends`}
            type="date"
            value={value.endsOn}
            min={value.startsOn || undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={`${idPrefix}-dates-hint`}
            onChange={(e) => onChange({ ...value, endsOn: e.target.value })}
            className="h-10 rounded-gc-sm"
          />
        </div>
        {hasAny ? (
          <button
            type="button"
            onClick={() => onChange({ startsOn: "", endsOn: "" })}
            className="h-10 shrink-0 rounded-full px-3 text-xs font-bold text-gc-muted hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      <p id={`${idPrefix}-dates-hint`} className="text-xs leading-relaxed">
        {invalid ? (
          <span className="font-semibold text-deep-pink">
            The end date can&rsquo;t be before the start date.
          </span>
        ) : (
          <span className="text-gc-muted">
            Optional. After the end date the post drops out of the brand feed —
            leave it blank for something that doesn&rsquo;t expire.
          </span>
        )}
      </p>
    </div>
  );
}
