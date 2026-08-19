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
      className="pe-card"
      id={`pe-section-${id}`}
      data-tour={tourId}
    >
      {title ? (
        <div className="pe-card-head">
          <h3>
            <span className="pe-card-icon">
              <IconCmp size={17} />
            </span>
            {title}
            {required ? (
              <span className="pe-required" aria-label="required" title="Required to go live">
                {" "}*
              </span>
            ) : null}
          </h3>
          {desc ? <p>{desc}</p> : null}
          {headerNote ? (
            <p
              className="pe-card-head-note"
              style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.45 }}
            >
              {headerNote}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="pe-card-body">{children}</div>
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
}) {
  const selectValue = value || (allowClear ? SELECT_NONE : "");

  return (
    <div className="pe-field">
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="pe-required" aria-label="required" title="Required to go live">
            {" "}*
          </span>
        ) : null}
      </label>
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
      {help ? <span className="pe-help">{help}</span> : null}
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
      <div className="pe-status">
        <Spinner className="size-4" aria-hidden />
        Loading {label}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="pe-status pe-status-error">
        <span>Could not load {label}.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          style={{ marginLeft: "auto" }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return null;
}