"use client";

import { AlertTriangle, Check } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { PeSelectField } from "@/features/creators/components/creator-profile-update/shared-components";
import { LanguageMultiSelect } from "@/features/creators/components/creator-profile-update/language-multi-select";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";
import { cn } from "@/lib/utils";

import {
  CwCard,
  CwFacetHelp,
  CwField,
  CwFieldLabel,
  CwFieldWarn,
  CwGrid2,
  CwHr,
  CwReq,
  CwSelectField,
  CwTextarea,
} from "../wizard-ui";

export type YourBaseStepProps = {
  disabled: boolean;
  adminMode?: boolean;

  countryCode: string;
  countries: Array<{ isoCode: string; name: string }>;
  onCountryChange: (value: string) => void;
  stateCode: string;
  states: Array<{ isoCode: string; name: string }>;
  onStateChange: (value: string) => void;
  city: string;
  cities: Array<{ name: string }>;
  onCityChange: (value: string) => void;

  shippingAddress: string;
  onShippingAddressChange: (value: string) => void;

  languageOptions: CreatorFacetOption[];
  selectedLanguages: string[];
  languagesLoading: boolean;
  onToggleLanguage: (slug: string) => void;

  languageConfirmed: boolean;
  onLanguageConfirmedChange: (value: boolean) => void;
  errors?: {
    city?: string;
    shippingAddress?: string;
    language?: string;
    languageConfirmed?: string;
  };
};

export function YourBaseStep({
  disabled,
  adminMode = false,
  countryCode,
  countries,
  onCountryChange,
  stateCode,
  states,
  onStateChange,
  city,
  cities,
  onCityChange,
  shippingAddress,
  onShippingAddressChange,
  languageOptions,
  selectedLanguages,
  languagesLoading,
  onToggleLanguage,
  languageConfirmed,
  onLanguageConfirmedChange,
  errors = {},
}: YourBaseStepProps) {
  const selectedLanguageCount = selectedLanguages.length;
  const confirmDisabled = disabled || selectedLanguageCount === 0;

  return (
    <CwCard>
      <CwGrid2>
        <CwSelectField>
          <CwFieldLabel htmlFor="cw-country">
            Country <CwReq />
          </CwFieldLabel>
          <PeSelectField
            id="cw-country"
            label="Country"
            hideLabel
            value={countryCode}
            placeholder="Select country"
            disabled={disabled || adminMode}
            options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
            onChange={onCountryChange}
          />
        </CwSelectField>

        <CwSelectField>
          <CwFieldLabel htmlFor="cw-state">
            State <CwReq />
          </CwFieldLabel>
          <PeSelectField
            id="cw-state"
            label="State"
            hideLabel
            value={stateCode}
            placeholder={countryCode ? "Select state" : "Pick country first"}
            disabled={disabled || !countryCode || states.length === 0}
            options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
            onChange={onStateChange}
          />
        </CwSelectField>

        <CwSelectField className="col-span-2 max-[560px]:col-span-1">
          <CwFieldLabel htmlFor="cw-city">
            City <CwReq />
          </CwFieldLabel>
          <PeSelectField
            id="cw-city"
            label="City"
            hideLabel
            value={city}
            placeholder={stateCode ? "Select city" : "Pick state first"}
            disabled={disabled || !stateCode || cities.length === 0}
            options={cities.map((row) => ({ value: row.name, label: row.name }))}
            onChange={onCityChange}
          />
          {errors.city ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.city}
            </CwFieldWarn>
          ) : null}
        </CwSelectField>

        <CwField span2>
          <CwFieldLabel htmlFor="cw-shipping">
            Shipping Address <CwReq />
          </CwFieldLabel>
          <CwFacetHelp className="mb-1.5 block">
            Brands send products to your home for unboxing &amp; review videos.
            This is only shared with a brand when they place an order with you
            — never shown publicly.
          </CwFacetHelp>
          <CwTextarea
            id="cw-shipping"
            className="leading-normal"
            rows={3}
            value={shippingAddress}
            disabled={disabled}
            placeholder="Flat / house no., street, area, city, state, PIN code"
            autoComplete="street-address"
            onChange={(e) => onShippingAddressChange(e.target.value)}
          />
          {errors.shippingAddress ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.shippingAddress}
            </CwFieldWarn>
          ) : null}
        </CwField>
      </CwGrid2>

      <CwHr />

      <CwField>
        <CwFieldLabel>
          Languages you can create in <CwReq />
        </CwFieldLabel>
        <CwFacetHelp>
          Pick every language you can confidently create videos in.
        </CwFacetHelp>
        {languagesLoading ? (
          <div className="flex items-center gap-2 py-1.5 text-[13px] text-muted-foreground">
            <Spinner className="size-4" aria-hidden /> Loading languages…
          </div>
        ) : (
          <LanguageMultiSelect
            options={languageOptions}
            selected={selectedLanguages}
            disabled={disabled}
            onToggle={onToggleLanguage}
          />
        )}
        {errors.language ? (
          <CwFieldWarn>
            <AlertTriangle size={13} aria-hidden />
            {errors.language}
          </CwFieldWarn>
        ) : null}
      </CwField>

      <label
        className={cn(
          "flex cursor-pointer items-center gap-3.5 rounded-xl border-2 border-zinc-400 bg-white px-4.5 py-4 transition-[background,border-color]",
          languageConfirmed && "border-primary bg-primary/5",
          confirmDisabled && "cursor-not-allowed opacity-60",
        )}
        data-checked={languageConfirmed}
        data-disabled={confirmDisabled}
      >
        <input
          type="checkbox"
          className="pointer-events-none absolute opacity-0"
          checked={languageConfirmed}
          disabled={confirmDisabled}
          onChange={(e) => onLanguageConfirmedChange(e.target.checked)}
        />
        <span
          className={cn(
            "flex size-5.5 shrink-0 items-center justify-center rounded-md border-2 border-zinc-500 bg-white text-transparent transition-[background,border-color,color]",
            languageConfirmed &&
              "border-primary bg-primary text-primary-foreground",
          )}
          aria-hidden
        >
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.75">
          <span className="text-sm font-bold leading-snug text-foreground">
            I can confidently create in these languages
          </span>
          <span className="max-w-160 text-[13px] leading-snug text-muted-foreground">
            Incorrect information may lead to cancellations, refunds and a
            lower creator score.
          </span>
        </span>
      </label>
      {errors.languageConfirmed ? (
        <CwFieldWarn>
          <AlertTriangle size={13} aria-hidden />
          {errors.languageConfirmed}
        </CwFieldWarn>
      ) : null}
    </CwCard>
  );
}
