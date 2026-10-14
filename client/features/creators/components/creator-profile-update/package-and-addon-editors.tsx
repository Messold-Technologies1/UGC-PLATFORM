"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Check } from "lucide-react";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import { cn } from "@/lib/utils";

import {
  PACKAGE_DEFAULT_MAX_REVISIONS,
  PACKAGE_MAX_DELIVERY_DAYS,
  PACKAGE_MIN_DELIVERY_DAYS,
  addOnPriceError,
  normalizeWholeNumberInput,
  type PackageDraft,
  type AddOnDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";

import {
  CwConfirm,
  CwFieldWarn,
  CwReq,
} from "@/features/creators/components/creator-profile-wizard/wizard-ui";

export type CreatorProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  profileId?: string;
  adminMode?: boolean;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

const PACKAGE_DEFAULTS: Array<{ label: string; value: string; note: string }> = [
  {
    label: "Deliverable",
    value: "1 edited video + raw files, 1080p min",
    note: "Send the finished edit and the original raw clips. The video must be at least 1080p.",
  },
  {
    label: "Usage rights",
    value: "30 days",
    note: "Brands can use the delivered content for 30 days. They can extend it with the Usage Rights add-on.",
  },
  {
    label: "Revisions",
    value: `${PACKAGE_DEFAULT_MAX_REVISIONS} rounds`,
    note: "Brands can request this many changes after delivery.",
  },
  {
    label: "Proper editing",
    value: "High-quality edit",
    note: "Deliver a polished, brand-ready video — clean cuts, captions and cleanup. Raw footage is still included.",
  },
];

/** Extra guidance shown under specific add-ons, keyed by catalog slug. */
const ADDON_HINTS: Record<string, string> = {
  extra_revision:
    "Your package already includes 2 revision rounds. This add-on is for each extra revision a brand requests beyond that.",
  paid_ads_usage_30_days:
    "The package already includes 30 days of usage rights. This add-on extends usage by another 30 days after that term ends.",
  on_location_shoot:
    "Turn this on to attract brands that need you on site. Many orders need a quick local shoot — enabling travel helps you win more of them.",
};

/** Stronger warning shown for an add-on regardless of selection, keyed by catalog slug. */
const ADDON_WARNINGS: Record<string, string> = {
  on_location_shoot:
    "Only keep this on if you can genuinely travel to the brand's shoot location. Accepting an on-location order you can't reach leads to cancellations, refunds and a lower creator score.",
};

const fieldClass = "flex min-w-0 flex-col gap-[7px]";
const fieldLabelClass =
  "flex items-center gap-1.5 text-[12.5px] font-bold text-foreground";
const inputClass = cn(
  "h-[42px] w-full rounded-[10px] border-[1.4px] border-border bg-card px-[13px] text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow]",
  "placeholder:text-muted-foreground",
  "focus:border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
);
const helpClass = "text-[11.5px] text-muted-foreground";
const deliveryWarnClass = cn(
  "mt-2.5 mb-0 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5",
  "text-[11.5px] font-medium leading-[1.45]",
  "text-[color-mix(in_oklab,#b45309_82%,var(--foreground))]",
);
const pkgClass = "rounded-xl border-[1.4px] border-border p-3.5";

export function PackageEditor({
  draft,
  disabled,
  onChange,
  errors,
  defaultsConfirmed,
  onDefaultsConfirmedChange,
  defaultsConfirmedError,
  children,
}: {
  draft: PackageDraft;
  disabled: boolean;
  onChange: (draft: PackageDraft) => void;
  errors?: {
    priceAmount?: string;
    deliveryDays?: string;
    videoLengthSeconds?: string;
  };
  defaultsConfirmed?: boolean;
  onDefaultsConfirmedChange?: (confirmed: boolean) => void;
  defaultsConfirmedError?: string;
  children?: ReactNode;
}) {
  return (
    <div className={pkgClass}>
      {children}
      <div className="grid grid-cols-1 gap-4 min-[769px]:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="packagePriceAmount" className={fieldLabelClass}>
            Price (₹){" "}
            <span className="font-bold text-destructive" aria-label="Required">
              *
            </span>
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-[13.5px] text-muted-foreground"
              aria-hidden
            >
              ₹
            </span>
            <input
              id="packagePriceAmount"
              className={cn(inputClass, "pl-[30px]")}
              disabled={disabled}
              value={draft.priceAmount}
              inputMode="numeric"
              placeholder="500"
              onChange={(e) =>
                onChange({
                  ...draft,
                  priceAmount: normalizeWholeNumberInput(e.target.value),
                })
              }
              aria-invalid={!!errors?.priceAmount}
            />
          </div>
          {errors?.priceAmount ? (
            <p className={cn(helpClass, "text-destructive")}>
              {errors.priceAmount}
            </p>
          ) : null}
        </div>

        <div className={fieldClass}>
          <label htmlFor="packageDeliveryDays" className={fieldLabelClass}>
            Delivery (days){" "}
            <span className="font-bold text-destructive" aria-label="Required">
              *
            </span>
          </label>
          <input
            id="packageDeliveryDays"
            className={inputClass}
            disabled={disabled}
            value={draft.deliveryDays}
            inputMode="numeric"
            placeholder={String(PACKAGE_MIN_DELIVERY_DAYS)}
            onChange={(e) => {
              const val = normalizeWholeNumberInput(e.target.value);
              if (val && Number(val) > PACKAGE_MAX_DELIVERY_DAYS) {
                onChange({
                  ...draft,
                  deliveryDays: String(PACKAGE_MAX_DELIVERY_DAYS),
                });
                return;
              }
              onChange({ ...draft, deliveryDays: val });
            }}
            aria-invalid={!!errors?.deliveryDays}
          />
          {errors?.deliveryDays ? (
            <p className={cn(helpClass, "text-destructive")}>
              {errors.deliveryDays}
            </p>
          ) : null}
        </div>
      </div>

      <p className={deliveryWarnClass} role="note">
        Set a deadline you can actually meet. If you miss it, your creator score
        can drop and the brand may be refunded.
      </p>

      <div className="mt-[18px] flex flex-col gap-3 rounded-xl border border-border bg-muted p-4">
        <div className="flex flex-col gap-1">
          <p className="m-0 text-sm font-bold text-foreground">
            What&apos;s included
          </p>
          <span className={helpClass}>
            Fixed for every Standard order. Brands see these on your package —
            confirm you can deliver them.
          </span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {PACKAGE_DEFAULTS.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5">
              <span
                className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--p10,color-mix(in_oklab,var(--primary)_12%,transparent))] text-primary"
                aria-hidden
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-right text-[13px] font-bold text-foreground">
                    {item.value}
                  </span>
                </div>
                <p className="m-0 text-xs leading-[1.45] text-muted-foreground">
                  {item.note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {onDefaultsConfirmedChange ? (
        <>
          <CwConfirm
            checked={Boolean(defaultsConfirmed)}
            disabled={disabled}
            onToggle={() =>
              onDefaultsConfirmedChange(!Boolean(defaultsConfirmed))
            }
            className="mt-4"
            title={
              <>
                I can deliver all of the above on every order <CwReq />
              </>
            }
            description="These defaults apply to every package order you accept."
          />
          {defaultsConfirmedError ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {defaultsConfirmedError}
            </CwFieldWarn>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function AddOnCatalogEditor({
  options,
  selectedSlugs,
  drafts,
  unmatchedNames,
  disabled,
  onToggle,
  onDraftChange,
}: {
  options: CreatorAddOnOption[];
  selectedSlugs: string[];
  drafts: Record<string, AddOnDraft>;
  unmatchedNames: string[];
  disabled: boolean;
  onToggle: (option: CreatorAddOnOption) => void;
  onDraftChange: (slug: string, patch: Partial<AddOnDraft>) => void;
}) {
  return (
    <div>
      {/* Title lives in the accordion header on small screens. */}
      <div
        className={cn(fieldClass, "mb-3.5 max-[960px]:hidden")}
      >
        <label className="text-sm font-bold text-foreground">Add-ons</label>
        <span className={helpClass}>
          Extras brands can add to your package. Required add-ons (marked *)
          are always offered and must be priced before you go live.
        </span>
      </div>

      {unmatchedNames.length ? (
        <div
          className="mb-3.5 rounded-[10px] border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-2.5 text-xs text-foreground"
        >
          These saved add-ons are no longer in the catalog and will not be
          resubmitted: {unmatchedNames.join(", ")}.
        </div>
      ) : null}

      {options.length ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {options.map((option) => {
            const selected = selectedSlugs.includes(option.slug);
            const draft = drafts[option.slug] ?? {
              priceAmount: String(option.fixedPrice ?? option.minPrice ?? 0),
            };
            const hint = ADDON_HINTS[option.slug];
            const warning = ADDON_WARNINGS[option.slug];
            // Show the specific reason (min / step) inline once a value is typed,
            // instead of only the generic "add prices" banner.
            const priceError =
              selected && draft.priceAmount.trim() !== ""
                ? addOnPriceError(option, draft.priceAmount)
                : null;
            const stepPrice = option.stepPrice ?? 1;
            const priceRule =
              option.fixedPrice != null
                ? null
                : stepPrice > 1
                  ? `Min ₹${option.minPrice ?? 0}, in steps of ₹${stepPrice}`
                  : `Min ₹${option.minPrice ?? 0}`;

            return (
              <div
                key={option.slug}
                className={cn(
                  pkgClass,
                  "h-full p-3 transition-[background,border-color] duration-150",
                  "md:[&:nth-child(3):last-child]:col-span-full",
                  selected &&
                    "border-primary bg-[color-mix(in_oklab,var(--primary)_5%,transparent)]",
                )}
                data-selected={selected}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold text-foreground">
                    <input
                      type="checkbox"
                      className="absolute opacity-0 pointer-events-none"
                      disabled={disabled || option.mandatory}
                      checked={selected}
                      onChange={() => onToggle(option)}
                    />
                    <span
                      className={cn(
                        "flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 border-zinc-500 bg-white text-transparent transition-[background,border-color,color]",
                        selected &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-hidden
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {option.name}
                    {option.mandatory ? (
                      <span
                        className="font-bold text-destructive"
                        aria-label="Required"
                      >
                        {" "}
                        *
                      </span>
                    ) : null}
                  </label>
                  <span className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground">
                    {option.fixedPrice != null
                      ? `Fixed ₹${option.fixedPrice}`
                      : `Min ₹${option.minPrice ?? 0}`}
                  </span>
                </div>

                {hint ? (
                  <p className="mt-2 mb-0 text-[11.5px] font-normal leading-[1.45] text-[color-mix(in_oklab,var(--muted-foreground)_88%,transparent)]">
                    {hint}
                  </p>
                ) : null}

                {warning ? (
                  <p className={deliveryWarnClass} role="note">
                    {warning}
                  </p>
                ) : null}

                {selected ? (
                  <div className="mt-2.5">
                    <div className={fieldClass}>
                      <label
                        htmlFor={`addon-price-${option.slug}`}
                        className={fieldLabelClass}
                      >
                        Price
                      </label>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-[13.5px] text-muted-foreground"
                          aria-hidden
                        >
                          ₹
                        </span>
                        <input
                          id={`addon-price-${option.slug}`}
                          className={cn(inputClass, "pl-[30px]")}
                          disabled={disabled || option.fixedPrice != null}
                          inputMode="numeric"
                          aria-invalid={!!priceError}
                          value={draft.priceAmount}
                          onChange={(e) =>
                            onDraftChange(option.slug, {
                              priceAmount: normalizeWholeNumberInput(
                                e.target.value,
                              ),
                            })
                          }
                        />
                      </div>
                      {priceError ? (
                        <p
                          className={cn(
                            helpClass,
                            "flex items-center gap-[5px] text-destructive",
                          )}
                          role="alert"
                        >
                          <AlertTriangle size={12} aria-hidden />
                          {priceError}
                        </p>
                      ) : priceRule ? (
                        <p className={helpClass}>{priceRule}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border-[1.4px] border-dashed border-border px-3.5 py-[18px] text-center text-[13px] text-muted-foreground">
          No add-ons configured.
        </div>
      )}
    </div>
  );
}
