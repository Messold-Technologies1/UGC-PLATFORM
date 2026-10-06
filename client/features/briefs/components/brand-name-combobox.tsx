"use client";

import { useMemo, useState } from "react";
import CreatableSelect from "react-select/creatable";
import type { ClassNamesConfig } from "react-select";
import { resolveExistingBrandName } from "@/features/agency/lib/unique-brand-names";
import { cn } from "@/lib/utils";

type BrandNameOption = {
  value: string;
  label: string;
};

type BrandNameComboboxProps = Readonly<{
  id?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
  disabled?: boolean;
}>;

const classNames: ClassNamesConfig<BrandNameOption, false> = {
  control: ({ isFocused }) =>
    cn(
      "flex min-h-8 rounded-lg border bg-white px-0 text-sm shadow-none transition-colors",
      isFocused ? "border-ring ring-3 ring-ring/50" : "border-input",
    ),
  valueContainer: () => "px-2.5 py-0",
  input: () => "m-0 p-0 text-sm text-foreground",
  placeholder: () => "text-muted-foreground text-sm",
  singleValue: () => "text-sm text-foreground",
  indicatorsContainer: () => "h-8",
  dropdownIndicator: () => "px-1.5 text-muted-foreground",
  clearIndicator: () => "px-1 text-muted-foreground hover:text-foreground",
  indicatorSeparator: () => "hidden",
  menu: () =>
    "mt-1 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg",
  menuList: () => "py-1",
  option: ({ isFocused, isSelected }) =>
    cn(
      "cursor-pointer px-2.5 py-1.5 text-sm",
      isSelected && "bg-accent text-accent-foreground",
      !isSelected && isFocused && "bg-muted",
    ),
  noOptionsMessage: () => "px-2.5 py-2 text-sm text-muted-foreground",
};

export function BrandNameCombobox({
  id,
  value,
  options,
  onChange,
  onBlur,
  invalid,
  placeholder = "Type or pick a brand",
  disabled,
}: BrandNameComboboxProps) {
  const [inputValue, setInputValue] = useState("");

  const selectOptions = useMemo<BrandNameOption[]>(
    () => options.map((name) => ({ value: name, label: name })),
    [options],
  );

  const selected = useMemo<BrandNameOption | null>(() => {
    const resolved = resolveExistingBrandName(value, options);
    return resolved ? { value: resolved, label: resolved } : null;
  }, [options, value]);

  const commit = (next: string) => {
    onChange(resolveExistingBrandName(next, options));
  };

  return (
    <CreatableSelect<BrandNameOption, false>
      unstyled
      inputId={id}
      instanceId={id ?? "brand-name"}
      isClearable
      isDisabled={disabled}
      options={selectOptions}
      value={inputValue ? null : selected}
      inputValue={inputValue}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      classNamePrefix="brand-name-select"
      classNames={classNames}
      menuPortalTarget={
        typeof document === "undefined" ? undefined : document.body
      }
      menuPosition="fixed"
      createOptionPosition="first"
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 60 }),
        control: (base) => ({
          ...base,
          minHeight: 32,
          ...(invalid ? { borderColor: "var(--destructive)" } : null),
        }),
      }}
      formatCreateLabel={(input) => `Use "${input.trim()}"`}
      noOptionsMessage={() => "Type a new brand name"}
      isValidNewOption={(input) => {
        const trimmed = input.trim();
        if (!trimmed) return false;
        return !options.some(
          (name) => name.toLowerCase() === trimmed.toLowerCase(),
        );
      }}
      onChange={(option) => {
        commit(option?.value ?? "");
        setInputValue("");
      }}
      onCreateOption={(input) => {
        commit(input);
        setInputValue("");
      }}
      onInputChange={(next, meta) => {
        if (meta.action !== "input-change") {
          setInputValue(next);
          return;
        }
        setInputValue(next);
        onChange(next);
      }}
      onBlur={() => {
        if (inputValue.trim()) {
          commit(inputValue);
          setInputValue("");
        } else if (value.trim()) {
          commit(value);
        }
        onBlur?.();
      }}
    />
  );
}
