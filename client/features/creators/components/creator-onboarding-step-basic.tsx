"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { cn } from "@/lib/utils";
import type { CreatorProfileFormState } from "@/features/creators/hooks/use-creator-profile-form-state";
import { SELECT_NONE } from "@/features/creators/hooks/use-creator-profile-form-state";

type Props = { form: CreatorProfileFormState };

export function CreatorOnboardingStepBasic({ form }: Props) {
  const inputClass =
    "h-11 rounded-lg border-gray-200 bg-white text-sm shadow-sm focus-visible:border-purple-400 focus-visible:ring-purple-400/20";

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label
          htmlFor="onb-displayName"
          className="text-sm font-medium text-gray-700"
        >
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="onb-displayName"
          className={inputClass}
          disabled={form.pending}
          value={form.displayName}
          onChange={(e) => form.setDisplayName(e.target.value)}
          required
          autoComplete="name"
          placeholder="Enter your full name"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <PhoneVerificationField
          idPrefix="onb-creator"
          disabled={form.pending}
          onVerifiedChange={form.setPhoneVerified}
          onVerified={() => void form.refreshUser()}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">
          Where are you based? <span className="text-red-500">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <OnbSelectField
            id="onb-country"
            value={form.countryCode}
            placeholder="Country"
            disabled={form.pending}
            options={form.countries.map((c) => ({
              value: c.isoCode,
              label: c.name,
            }))}
            onChange={(v) => {
              form.setCountryCode(v);
              form.setStateCode("");
              form.setCity("");
            }}
          />
          <OnbSelectField
            id="onb-state"
            value={form.stateCode}
            placeholder={form.countryCode ? "State" : "Select country"}
            disabled={
              form.pending || !form.countryCode || form.states.length === 0
            }
            options={form.states.map((s) => ({
              value: s.isoCode,
              label: s.name,
            }))}
            onChange={(v) => {
              form.setStateCode(v);
              form.setCity("");
            }}
          />
          <OnbSelectField
            id="onb-city"
            value={form.city}
            placeholder={form.stateCode ? "City" : "Select state"}
            disabled={
              form.pending || !form.stateCode || form.cities.length === 0
            }
            options={form.cities.map((c) => ({ value: c.name, label: c.name }))}
            onChange={form.setCity}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">
          What&apos;s your content category?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <CategoryMultiSelect
          options={form.facetOptionsByDimension?.CONTENT_CATEGORY ?? []}
          selected={form.selectedFacets?.CONTENT_CATEGORY ?? []}
          disabled={form.pending || form.facetOptionsQuery.isLoading}
          onToggle={(slug) => form.toggleFacet("CONTENT_CATEGORY", slug)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onb-bio" className="text-sm font-medium text-gray-700">
          Tell us about yourself <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="onb-bio"
          disabled={form.pending}
          value={form.bio}
          onChange={(e) => form.setBio(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Write a short bio about yourself, your content and what brands should know about you..."
          className="resize-y rounded-lg border-gray-200 bg-white shadow-sm focus-visible:border-purple-400 focus-visible:ring-purple-400/20"
        />
        <p className="text-xs text-gray-400">
          {form.bio.length}/500 characters
        </p>
      </div>
    </div>
  );
}

function OnbSelectField({
  id,
  value,
  placeholder,
  disabled = false,
  options,
  allowClear = false,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  allowClear?: boolean;
  onChange: (value: string) => void;
}) {
  const selectValue = value || (allowClear ? SELECT_NONE : "");

  return (
    <Select
      disabled={disabled}
      value={selectValue}
      onValueChange={(v) => onChange(v === SELECT_NONE ? "" : v)}
    >
      <SelectTrigger
        id={id}
        className="h-11 rounded-lg border-gray-200 bg-white shadow-sm"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear ? (
          <SelectItem value={SELECT_NONE}>Not specified</SelectItem>
        ) : null}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CategoryMultiSelect({
  options,
  selected,
  disabled,
  onToggle,
}: {
  options: Array<{ slug: string; label: string }>;
  selected: string[];
  disabled: boolean;
  onToggle: (slug: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const label =
    selected.length > 0
      ? options
          .filter((o) => selected.includes(o.slug))
          .map((o) => o.label)
          .join(", ")
      : "Select categories";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors",
          "border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50",
          disabled && "pointer-events-none opacity-50",
          isOpen && "border-purple-400 ring-2 ring-purple-100",
        )}
      >
        <span className="flex-1 truncate text-left">
          {selected.length > 0 ? (
            <>
              <span className="truncate">{label}</span>
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-100 px-1.5 text-xs font-semibold text-purple-600">
                {selected.length}
              </span>
            </>
          ) : (
            <span className="text-gray-400">Select categories</span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-[240px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {options.length ? (
            <div className="flex flex-col gap-0.5">
              {options.map((opt) => (
                <label
                  key={opt.slug}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-purple-50 transition-colors"
                >
                  <Checkbox
                    disabled={disabled}
                    checked={selected.includes(opt.slug)}
                    onCheckedChange={() => onToggle(opt.slug)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="px-2 py-3 text-xs text-gray-400">
              No categories available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
