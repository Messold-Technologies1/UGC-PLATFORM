"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";

import { SELECT_NONE } from "@/features/creators/hooks/creator-profile-form-utils";
import { cn } from "@/lib/utils";

export type CreatorProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  profileId?: string;
  adminMode?: boolean;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

export function SectionCard({
  id,
  icon: IconCmp,
  title,
  desc,
  headerNote,
  tourId,
  required = false,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  title?: string;
  desc?: string;
  headerNote?: string;
  tourId?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="scroll-mt-20 overflow-hidden rounded-[18px] border border-border bg-card shadow-[0_1px_2px_0_rgb(24_19_19/0.05)] max-[900px]:scroll-mt-[68px]"
      id={`pe-section-${id}`}
      data-tour={tourId}
    >
      {title ? (
        <div className="px-[18px] pt-4 pb-1 min-[901px]:px-[22px] min-[901px]:pt-[18px]">
          <h3 className="m-0 flex items-center gap-[9px] text-[16.5px]">
            <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-primary/11 text-primary">
              <IconCmp size={17} />
            </span>
            {title}
            {required ? (
              <span
                className="font-bold text-destructive"
                aria-label="required"
                title="Required to go live"
              >
                {" "}*
              </span>
            ) : null}
          </h3>
          {desc ? (
            <p className="mt-[5px] ml-[39px] text-[13px] text-muted-foreground">
              {desc}
            </p>
          ) : null}
          {headerNote ? (
            <p className="mt-1.5 text-[12.5px] leading-[1.45] text-muted-foreground">
              {headerNote}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-[18px] px-[18px] pt-3.5 pb-[18px] min-[901px]:px-[22px] min-[901px]:pt-4 min-[901px]:pb-[22px]">
        {children}
      </div>
    </section>
  );
}

export function PeSelectField({
  id,
  label,
  value,
  placeholder,
  disabled = false,
  options,
  allowClear = false,
  onChange,
  help,
  required = false,
  hideLabel = false,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  allowClear?: boolean;
  onChange: (value: string) => void;
  help?: string;
  required?: boolean;
  /** When true, omit the visible label (e.g. wizard wraps its own CwFieldLabel). */
  hideLabel?: boolean;
}) {
  const selectValue = value || (allowClear ? SELECT_NONE : "");

  return (
    <div className={cn("flex min-w-0 flex-col", hideLabel ? "gap-0" : "gap-[7px]")}>
      {hideLabel ? null : (
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-foreground"
        >
          {label}
          {required ? (
            <span
              className="font-bold text-destructive"
              aria-label="required"
              title="Required to go live"
            >
              {" "}*
            </span>
          ) : null}
        </label>
      )}
      <Select
        disabled={disabled}
        value={selectValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === SELECT_NONE ? "" : nextValue)
        }
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          className="h-[42px] rounded-[10px] border-[1.4px] text-[13.5px]"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear ? (
            <SelectItem value={SELECT_NONE}>Not specified</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help ? (
        <span className="text-[11.5px] text-muted-foreground">{help}</span>
      ) : null}
    </div>
  );
}

export function CatalogStatus({
  loading,
  error,
  label,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  label: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-[18px] py-3.5 text-[13.5px] text-muted-foreground">
        <Spinner className="size-4" aria-hidden />
        Loading {label}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive bg-card px-[18px] py-3.5 text-[13.5px] text-destructive">
        <span>Could not load {label}.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="ml-auto"
        >
          Retry
        </Button>
      </div>
    );
  }

  return null;
}
