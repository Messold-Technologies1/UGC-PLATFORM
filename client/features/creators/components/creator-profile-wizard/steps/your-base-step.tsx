"use client";

import { AlertTriangle, Check } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { PeSelectField } from "@/features/creators/components/creator-profile-update/shared-components";
import { LanguageMultiSelect } from "@/features/creators/components/creator-profile-update/language-multi-select";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";

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

  return (
    <div className="cw-card">
      <div className="cw-grid2">
        <div className="cw-field cw-select-field">
          <label htmlFor="cw-country" className="cw-fieldlabel">
            Country <span className="cw-req">*</span>
          </label>
          <PeSelectField
            id="cw-country"
            label="Country"
            value={countryCode}
            placeholder="Select country"
            disabled={disabled || adminMode}
            options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
            onChange={onCountryChange}
          />
        </div>

        <div className="cw-field cw-select-field">
          <label htmlFor="cw-state" className="cw-fieldlabel">
            State <span className="cw-req">*</span>
          </label>
          <PeSelectField
            id="cw-state"
            label="State"
            value={stateCode}
            placeholder={countryCode ? "Select state" : "Pick country first"}
            disabled={disabled || !countryCode || states.length === 0}
            options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
            onChange={onStateChange}
          />
        </div>

        <div className="cw-col-2 cw-field cw-select-field">
          <label htmlFor="cw-city" className="cw-fieldlabel">
            City <span className="cw-req">*</span>
          </label>
          <PeSelectField
            id="cw-city"
            label="City"
            value={city}
            placeholder={stateCode ? "Select city" : "Pick state first"}
            disabled={disabled || !stateCode || cities.length === 0}
            options={cities.map((row) => ({ value: row.name, label: row.name }))}
            onChange={onCityChange}
          />
          {errors.city ? (
            <p className="cw-field-warn">
              <AlertTriangle size={13} aria-hidden />
              {errors.city}
            </p>
          ) : null}
        </div>

        <div className="cw-col-2 cw-field">
          <label htmlFor="cw-shipping" className="cw-fieldlabel">
            Shipping Address <span className="cw-req">*</span>
          </label>
          <span className="cw-facet-help cw-shipping-hint">
            Brands send products to your home for unboxing &amp; review videos.
            This is only shared with a brand when they place an order with you
            — never shown publicly.
          </span>
          <textarea
            id="cw-shipping"
            className="cw-input cw-shipping-textarea"
            rows={3}
            value={shippingAddress}
            disabled={disabled}
            placeholder="Flat / house no., street, area, city, state, PIN code"
            autoComplete="street-address"
            onChange={(e) => onShippingAddressChange(e.target.value)}
          />
          {errors.shippingAddress ? (
            <p className="cw-field-warn">
              <AlertTriangle size={13} aria-hidden />
              {errors.shippingAddress}
            </p>
          ) : null}
        </div>
      </div>

      <div className="cw-hr" />

      <div className="cw-field cw-lang-block">
        <div className="cw-fieldlabel">
          Languages you can create in <span className="cw-req">*</span>
        </div>
        <span className="cw-facet-help">
          Pick every language you can confidently create videos in.
        </span>
        {languagesLoading ? (
          <div className="cw-lang-loading">
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
          <p className="cw-field-warn">
            <AlertTriangle size={13} aria-hidden />
            {errors.language}
          </p>
        ) : null}
      </div>

      <label
        className="cw-confirm"
        data-checked={languageConfirmed}
        data-disabled={disabled || selectedLanguageCount === 0}
      >
        <input
          type="checkbox"
          className="cw-confirm-box"
          checked={languageConfirmed}
          disabled={disabled || selectedLanguageCount === 0}
          onChange={(e) => onLanguageConfirmedChange(e.target.checked)}
        />
        <span className="cw-confirm-tick" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="cw-confirm-copy">
          <span className="cw-confirm-title">
            I can confidently create in these languages
          </span>
          <span className="cw-confirm-desc">
            Incorrect information may lead to cancellations, refunds and a
            lower creator score.
          </span>
        </span>
      </label>
      {errors.languageConfirmed ? (
        <p className="cw-field-warn">
          <AlertTriangle size={13} aria-hidden />
          {errors.languageConfirmed}
        </p>
      ) : null}
    </div>
  );
}
