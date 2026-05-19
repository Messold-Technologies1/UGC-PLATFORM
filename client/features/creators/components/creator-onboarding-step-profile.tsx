"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileIntroVideoField } from "@/features/creators/components/creator-profile-intro-video-field";
import { cn } from "@/lib/utils";
import type { CreatorProfileFormState } from "@/features/creators/hooks/use-creator-profile-form-state";
import {
  facetSections,
  fluencyOptions,
  genderOptions,
  contentVolumeOptions,
  normalizeWholeNumberInput,
  SELECT_NONE,
  INTRO_VIDEO_ACCEPT,
} from "@/features/creators/hooks/use-creator-profile-form-state";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";
import type {
  CreatorLanguageFluency,
  CreatorGender,
  CreatorContentVolumeBucket,
} from "@/features/creators/api/create-creator-profile";

type Props = { form: CreatorProfileFormState };

export function CreatorOnboardingStepProfile({ form }: Props) {
  const inputClass =
    "h-11 rounded-lg border-gray-200 bg-white text-sm shadow-sm focus-visible:border-purple-400 focus-visible:ring-purple-400/20";

  if (form.facetOptionsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-500">
        <Spinner className="size-4" aria-hidden /> Loading profile options…
      </div>
    );
  }

  if (form.facetOptionsQuery.isError) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-red-600">Could not load profile options.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void form.facetOptionsQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const filteredFacetSections = facetSections.filter(
    (s) => s.dimension !== "CONTENT_CATEGORY",
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Gender</Label>
          <OnbSelectField
            id="onb-gender"
            value={form.gender}
            placeholder="Select gender"
            disabled={form.pending}
            options={genderOptions}
            onChange={(v) => form.setGender(v as CreatorGender)}
            allowClear
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="onb-dob"
            className="text-sm font-medium text-gray-700"
          >
            Date of birth
          </Label>
          <div className="relative">
            <Input
              id="onb-dob"
              type="date"
              className={cn(
                inputClass,
                "w-full appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
              )}
              disabled={form.pending}
              value={form.dateOfBirth}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => form.setDateOfBirth(e.target.value)}
            />
            <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            Content volume
          </Label>
          <OnbSelectField
            id="onb-contentVolume"
            value={form.contentVolume}
            placeholder="Select volume"
            disabled={form.pending}
            options={contentVolumeOptions}
            onChange={(v) =>
              form.setContentVolume(v as CreatorContentVolumeBucket)
            }
            allowClear
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="onb-collabCount"
            className="text-sm font-medium text-gray-700"
          >
            Collaboration count
          </Label>
          <Input
            id="onb-collabCount"
            className={inputClass}
            disabled={form.pending}
            value={form.collaborationCount}
            inputMode="numeric"
            onChange={(e) =>
              form.setCollaborationCount(
                normalizeWholeNumberInput(e.target.value),
              )
            }
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Profile attributes</p>
        <p className="text-xs text-gray-400">
          Select values that best describe your creator work.
        </p>
        <div className="flex flex-col gap-2">
          {filteredFacetSections.map((section) => {
            const options =
              form.facetOptionsByDimension[section.dimension] ?? [];
            const selected = form.selectedFacets[section.dimension] ?? [];
            return (
              <FacetDropdown
                key={section.dimension}
                dimension={section.dimension}
                label={section.label}
                options={options}
                selected={selected}
                disabled={form.pending}
                onToggle={(slug) => form.toggleFacet(section.dimension, slug)}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Languages</p>
        <LanguageSection
          options={form.facetOptionsByDimension.LANGUAGE ?? []}
          selected={form.languageDrafts}
          disabled={form.pending}
          onToggle={form.toggleLanguage}
          onFluencyChange={form.updateLanguageFluency}
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="onb-shipping"
          className="text-sm font-medium text-gray-700"
        >
          Shipping address
        </Label>
        <Textarea
          id="onb-shipping"
          disabled={form.pending}
          value={form.shippingAddress}
          onChange={(e) => form.setShippingAddress(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Address for receiving products"
          className="resize-y rounded-lg border-gray-200 bg-white shadow-sm"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div>
          <p className="text-sm font-medium text-gray-700">
            On-location / store shoots
          </p>
          <p className="text-xs text-gray-400">
            Enable if you offer on-location or in-store shoots.
          </p>
        </div>
        <Switch
          disabled={form.pending}
          checked={form.onLocationAvailable}
          onCheckedChange={form.setOnLocationAvailable}
        />
      </div>
      {form.onLocationAvailable && (
        <div className="max-w-xs space-y-1.5">
          <Label
            htmlFor="onb-travelRadius"
            className="text-sm font-medium text-gray-700"
          >
            Travel radius (km)
          </Label>
          <Input
            id="onb-travelRadius"
            type="number"
            min={0}
            className={inputClass}
            disabled={form.pending}
            value={form.travelRadius}
            onChange={(e) => form.setTravelRadius(e.target.value)}
            placeholder="0 if none"
          />
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-800">
          Contact & Social Links
        </p>

        <div className="space-y-1.5">
          <Label
            htmlFor="onb-contact-email"
            className="text-sm font-medium text-gray-700"
          >
            Contact Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="onb-contact-email"
            type="email"
            className={inputClass}
            disabled={form.pending}
            value={form.contactEmail}
            onChange={(e) => form.setContactEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="onb-instagram"
              className="text-sm font-medium text-gray-700"
            >
              Instagram URL
            </Label>
            <Input
              id="onb-instagram"
              className={inputClass}
              disabled={form.pending}
              value={form.instagramUrl}
              onChange={(e) => form.setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/you"
              inputMode="url"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="onb-youtube"
              className="text-sm font-medium text-gray-700"
            >
              YouTube URL
            </Label>
            <Input
              id="onb-youtube"
              className={inputClass}
              disabled={form.pending}
              value={form.youtubeUrl}
              onChange={(e) => form.setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@you"
              inputMode="url"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="onb-tiktok"
              className="text-sm font-medium text-gray-700"
            >
              TikTok URL
            </Label>
            <Input
              id="onb-tiktok"
              className={inputClass}
              disabled={form.pending}
              value={form.tiktokUrl}
              onChange={(e) => form.setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@you"
              inputMode="url"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="onb-snapchat"
              className="text-sm font-medium text-gray-700"
            >
              Snapchat URL
            </Label>
            <Input
              id="onb-snapchat"
              className={inputClass}
              disabled={form.pending}
              value={form.snapchatUrl}
              onChange={(e) => form.setSnapchatUrl(e.target.value)}
              placeholder="https://snapchat.com/add/you"
              inputMode="url"
            />
          </div>
        </div>
      </div>

      <CreatorProfileIntroVideoField
        videoPreviewUrl={form.introVideoPreviewUrl}
        accept={INTRO_VIDEO_ACCEPT}
        disabled={form.uploadingIntroVideo || form.pending}
        uploading={form.uploadingIntroVideo}
        hasPendingVideo={
          Boolean(form.pendingIntroVideoKey) || form.introVideoRemoved
        }
        hasExistingVideo={Boolean(form.introVideoPreviewUrl)}
        pendingActionLabel={form.introVideoRemoved ? "Undo remove" : undefined}
        fileInputRef={form.introVideoInputRef}
        onSelectFile={(file) => void form.handleIntroVideoSelected(file)}
        onDiscard={form.restoreInitialIntroVideo}
        onRemove={form.removeIntroVideo}
      />
    </div>
  );
}

function FacetDropdown({
  dimension,
  label,
  options,
  selected,
  disabled,
  onToggle,
}: {
  dimension: string;
  label: string;
  options: CreatorFacetOption[];
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

  return (
    <div ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
          "border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50",
          disabled && "pointer-events-none opacity-50",
          isOpen && "border-purple-300 ring-2 ring-purple-100",
        )}
      >
        <span className="font-medium">
          {label}
          {selected.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-100 px-1.5 text-xs font-semibold text-purple-600">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`panel-${dimension}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              {options.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {options.map((opt) => (
                    <label
                      key={opt.slug}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-purple-50"
                    >
                      <Checkbox
                        className="mt-0.5"
                        disabled={disabled}
                        checked={selected.includes(opt.slug)}
                        onCheckedChange={() => onToggle(opt.slug)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No options configured.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguageSection({
  options,
  selected,
  disabled,
  onToggle,
  onFluencyChange,
}: {
  options: CreatorFacetOption[];
  selected: { slug: string; fluency: CreatorLanguageFluency }[];
  disabled: boolean;
  onToggle: (slug: string) => void;
  onFluencyChange: (slug: string, fluency: CreatorLanguageFluency) => void;
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

  const bySlug = new Map(selected.map((r) => [r.slug, r]));

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between border-gray-200 bg-white shadow-sm"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          Languages {selected.length > 0 ? `(${selected.length})` : ""}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          {options.length ? (
            <div className="flex flex-col gap-3">
              {options.map((opt) => {
                const draft = bySlug.get(opt.slug);
                const checked = Boolean(draft);
                return (
                  <div
                    key={opt.slug}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        disabled={disabled}
                        checked={checked}
                        onCheckedChange={() => onToggle(opt.slug)}
                      />
                      <span>{opt.label}</span>
                    </label>
                    {checked && (
                      <RadioGroup
                        disabled={disabled}
                        value={draft?.fluency ?? "FLUENT"}
                        onValueChange={(v) =>
                          onFluencyChange(opt.slug, v as CreatorLanguageFluency)
                        }
                        className="flex flex-wrap items-center gap-4"
                      >
                        {fluencyOptions.map((item) => (
                          <label
                            key={item.value}
                            className={cn(
                              "flex items-center gap-2 text-sm cursor-pointer",
                              disabled && "opacity-50",
                            )}
                          >
                            <RadioGroupItem
                              value={item.value}
                              disabled={disabled}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No languages configured.</p>
          )}
        </div>
      )}
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
