"use client";

import { useMemo } from "react";
import { Country } from "country-state-city";
import ReactSelect, {
  type FilterOptionOption,
} from "react-select";

export type CountryCodeOption = {
  /** ISO 3166-1 alpha-2 code, e.g. "IN", "US" */
  value: string;
  /** Country name, e.g. "India" */
  label: string;
  /** Calling code digits without "+", e.g. "91", "1" */
  dialCode: string;
  /** Emoji flag */
  flag: string;
};

function buildOptions(): CountryCodeOption[] {
  return Country.getAllCountries()
    .map((c) => ({
      value: c.isoCode,
      label: c.name,
      // Some territories carry codes like "1-684"; keep digits only for E.164.
      dialCode: (c.phonecode || "").replace(/\D/g, ""),
      flag: c.flag,
    }))
    .filter((c) => c.dialCode.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function filterByNameCodeOrIso(
  option: FilterOptionOption<CountryCodeOption>,
  rawInput: string,
): boolean {
  const query = rawInput.trim().toLowerCase();
  if (!query) return true;
  const { label, dialCode, value } = option.data;
  const digits = query.replace(/\D/g, "");
  return (
    label.toLowerCase().includes(query) ||
    value.toLowerCase().includes(query) ||
    (digits.length > 0 && dialCode.startsWith(digits))
  );
}

interface CountryCodeSelectProps {
  /** Selected country ISO code. */
  value: string;
  /** Called with the chosen ISO code and its calling-code digits. */
  onChange: (isoCode: string, dialCode: string) => void;
  disabled?: boolean;
  inputId?: string;
}

/**
 * Searchable country calling-code picker. Built on the country data the app
 * already ships (country-state-city) and the shared react-select dependency,
 * so no new package is added. The compact control shows "🇮🇳 +91"; the menu
 * lists the full country name and code and is searchable by name, ISO code, or
 * dial code.
 */
export function CountryCodeSelect({
  value,
  onChange,
  disabled,
  inputId,
}: CountryCodeSelectProps) {
  const options = useMemo(() => buildOptions(), []);
  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  return (
    <ReactSelect<CountryCodeOption>
      inputId={inputId}
      options={options}
      value={selected}
      isDisabled={disabled}
      isSearchable
      filterOption={filterByNameCodeOrIso}
      onChange={(option) => {
        if (option) onChange(option.value, option.dialCode);
      }}
      placeholder="Code"
      aria-label="Country calling code"
      formatOptionLabel={(option, { context }) =>
        context === "value" ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden>{option.flag}</span>
            <span>+{option.dialCode}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span aria-hidden>{option.flag}</span>
            <span className="truncate">{option.label}</span>
            <span className="ml-auto text-[#8b8489]">+{option.dialCode}</span>
          </span>
        )
      }
      components={{ IndicatorSeparator: () => null }}
      styles={{
        control: (base, state) => ({
          ...base,
          height: "42px",
          minHeight: "42px",
          width: "116px",
          borderRadius: "11px",
          backgroundColor: "#ffffff",
          borderColor: state.isFocused ? "#ef3e51" : "#e2e8f0",
          boxShadow: state.isFocused
            ? "0 0 0 3px rgba(239,62,81,0.13)"
            : "none",
          "&:hover": { borderColor: state.isFocused ? "#ef3e51" : "#c8c2c5" },
        }),
        valueContainer: (base) => ({ ...base, padding: "0 8px" }),
        singleValue: (base) => ({
          ...base,
          color: "#111111",
          fontSize: "15px",
          fontWeight: 500,
        }),
        dropdownIndicator: (base) => ({ ...base, padding: "6px" }),
        input: (base) => ({ ...base, margin: 0, padding: 0 }),
        menu: (base) => ({
          ...base,
          width: "280px",
          borderRadius: "11px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          zIndex: 9999,
        }),
        menuList: (base) => ({ ...base, maxHeight: "260px" }),
        option: (base, state) => ({
          ...base,
          fontSize: "14px",
          cursor: "pointer",
          backgroundColor: state.isSelected
            ? "#fdecee"
            : state.isFocused
              ? "#f4f1f1"
              : "transparent",
          color: "#111111",
        }),
      }}
    />
  );
}
