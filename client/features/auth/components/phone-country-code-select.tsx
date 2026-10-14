"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  findPhoneCountryByIso,
  getPhoneCountryOptions,
} from "@/features/auth/lib/phone-country-codes";

type PhoneCountryCodeSelectProps = {
  value: string;
  onValueChange: (isoCode: string) => void;
  disabled?: boolean;
  className?: string;
  /** Compact trigger for the signup phone row. */
  triggerClassName?: string;
  id?: string;
};

export function PhoneCountryCodeSelect({
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
  id,
}: PhoneCountryCodeSelectProps) {
  const options = useMemo(() => getPhoneCountryOptions(), []);
  const selected = findPhoneCountryByIso(value, options) ?? options[0];

  return (
    <Select
      value={selected?.isoCode ?? "IN"}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={
          selected
            ? `${selected.name} +${selected.dialCode}`
            : "Country calling code"
        }
        className={cn(
          "h-auto min-h-0 w-auto shrink-0 gap-1 rounded-none border-0 bg-[#faf4f6] px-2 py-0 shadow-none",
          "focus-visible:border-transparent focus-visible:ring-0",
          // Radix mirrors the full SelectItem text into SelectValue — hide it so
          // we only show the compact flag + code we render ourselves.
          "[&_[data-slot=select-value]]:hidden",
          "[&>svg.chevron]:size-3.5 [&>svg.chevron]:text-[#8B8489]",
          triggerClassName,
        )}
      >
        {selected ? (
          <span className="flex items-center gap-1 text-[13px] font-semibold text-[#8B8489]">
            <span aria-hidden>{selected.flag}</span>
            <span>+{selected.dialCode}</span>
          </span>
        ) : null}
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className={cn("max-h-72 min-w-[16rem]", className)}
        position="popper"
        align="start"
      >
        {options.map((option) => (
          <SelectItem key={option.isoCode} value={option.isoCode}>
            <span className="flex items-center gap-2">
              <span aria-hidden>{option.flag}</span>
              <span className="font-semibold tabular-nums">
                +{option.dialCode}
              </span>
              <span className="truncate text-muted-foreground">
                {option.name}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
