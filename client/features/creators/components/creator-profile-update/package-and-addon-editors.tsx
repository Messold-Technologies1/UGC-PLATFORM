"use client";

import { Check } from "lucide-react";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";

import {
  PACKAGE_NAME,
  PACKAGE_DEFAULT_MAX_REVISIONS,
  PACKAGE_MAX_DELIVERY_DAYS,
  PACKAGE_MAX_VIDEO_LENGTH_SECONDS,
  PACKAGE_MIN_DELIVERY_DAYS,
  normalizeWholeNumberInput,
  type PackageDraft,
  type AddOnDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";

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
    label: "Package name",
    value: PACKAGE_NAME,
    note: "Every creator starts with the same Standard package.",
  },
  {
    label: "Deliverable",
    value: "1 edited video + raw files, 1080p min",
    note: "Send the finished edit and the original raw clips. The video must be at least 1080p.",
  },
  {
    label: "Video length",
    value: `Up to ${PACKAGE_MAX_VIDEO_LENGTH_SECONDS} seconds`,
    note: "Keep the final cut within this length.",
  },
  {
    label: "Revisions",
    value: `${PACKAGE_DEFAULT_MAX_REVISIONS} rounds`,
    note: "Brands can request this many changes after delivery.",
  },
  {
    label: "Basic editing",
    value: "Always included",
    note: "Cut, captions and cleanup are part of the package — still send the raw footage with it.",
  },
];

export function PackageEditor({
  draft,
  disabled,
  onChange,
  errors,
  defaultsConfirmed,
  onDefaultsConfirmedChange,
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
}) {
  return (
    <div className="pe-pkg">
      <div className="pe-grid pe-grid-2">
        <div className="pe-field">
          <label htmlFor="packagePriceAmount">Price (₹)</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
                fontSize: 13.5,
                pointerEvents: "none",
              }}
            >
              ₹
            </span>
            <input
              id="packagePriceAmount"
              className="pe-input"
              style={{ paddingLeft: 30 }}
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
            <p
              className="pe-help text-destructive"
              style={{ color: "var(--destructive)" }}
            >
              {errors.priceAmount}
            </p>
          ) : null}
        </div>

        <div className="pe-field">
          <label htmlFor="packageDeliveryDays">Delivery (days)</label>
          <input
            id="packageDeliveryDays"
            className="pe-input"
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
          {errors?.deliveryDays && (
            <p
              className="pe-help text-destructive"
              style={{ color: "var(--destructive)" }}
            >
              {errors.deliveryDays}
            </p>
          )}
        </div>
      </div>

      <div className="pe-defaults">
        <div className="pe-defaults-head">
          <p className="pe-defaults-label">What&apos;s included</p>
          <span className="pe-help">
            Fixed for every Standard order. Brands see these on your package —
            confirm you can deliver them.
          </span>
        </div>
        <ul className="pe-defaults-list">
          {PACKAGE_DEFAULTS.map((item) => (
            <li key={item.label} className="pe-defaults-item">
              <span className="pe-defaults-check" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
              <div className="pe-defaults-copy">
                <div className="pe-defaults-row">
                  <span className="pe-defaults-k">{item.label}</span>
                  <span className="pe-defaults-v">{item.value}</span>
                </div>
                <p className="pe-defaults-note">{item.note}</p>
              </div>
            </li>
          ))}
        </ul>
        {onDefaultsConfirmedChange ? (
          <label
            className="cw-confirm"
            data-checked={Boolean(defaultsConfirmed)}
            data-disabled={disabled}
          >
            <input
              type="checkbox"
              className="cw-confirm-box"
              checked={Boolean(defaultsConfirmed)}
              disabled={disabled}
              onChange={(e) => onDefaultsConfirmedChange(e.target.checked)}
            />
            <span className="cw-confirm-tick" aria-hidden>
              <Check size={13} strokeWidth={3} />
            </span>
            <span className="cw-confirm-text">
              I can deliver all of the above on every order.{" "}
              <span className="cw-req">*</span>
            </span>
          </label>
        ) : null}
      </div>
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
      <div className="pe-field" style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 14, fontWeight: 700 }}>Add-ons</label>
        <span className="pe-help">
          Extras brands can add to your package. Required add-ons (marked *)
          are always offered and must be priced before you go live.
        </span>
      </div>

      {unmatchedNames.length ? (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(245, 158, 11, 0.3)",
            background: "rgba(245, 158, 11, 0.08)",
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--foreground)",
            marginBottom: 14,
          }}
        >
          These saved add-ons are no longer in the catalog and will not be
          resubmitted: {unmatchedNames.join(", ")}.
        </div>
      ) : null}

      {options.length ? (
        <div style={{ columns: "320px 2", columnGap: 16 }}>
          {options.map((option) => {
            const selected = selectedSlugs.includes(option.slug);
            const draft = drafts[option.slug] ?? {
              priceAmount: String(option.fixedPrice ?? option.minPrice ?? 0),
              description: "",
            };

            return (
              <div key={option.slug} className="pe-pkg" style={{ padding: 12, breakInside: "avoid", marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: selected ? 10 : 0,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={disabled || option.mandatory}
                      checked={selected}
                      onChange={() => onToggle(option)}
                      style={{ width: 16, height: 16 }}
                    />
                    {option.name}
                    {option.mandatory ? (
                      <span className="pe-req" aria-label="Required">
                        {" "}
                        *
                      </span>
                    ) : null}
                  </label>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.fixedPrice != null
                      ? `Fixed ₹${option.fixedPrice}`
                      : `Min ₹${option.minPrice ?? 0}`}
                  </span>
                </div>

                {selected ? (
                  <div className="pe-grid pe-grid-2">
                    <div className="pe-field">
                      <label htmlFor={`addon-price-${option.slug}`}>
                        Price
                      </label>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 13,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--muted-foreground)",
                            fontSize: 13.5,
                            pointerEvents: "none",
                          }}
                        >
                          ₹
                        </span>
                        <input
                          id={`addon-price-${option.slug}`}
                          className="pe-input"
                          style={{ paddingLeft: 30 }}
                          disabled={disabled || option.fixedPrice != null}
                          inputMode="numeric"
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
                    </div>
                    <div className="pe-field">
                      <label htmlFor={`addon-description-${option.slug}`}>
                        Description
                      </label>
                      <input
                        id={`addon-description-${option.slug}`}
                        className="pe-input"
                        disabled={disabled}
                        value={draft.description}
                        onChange={(e) =>
                          onDraftChange(option.slug, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            border: "1.4px dashed var(--border)",
            borderRadius: 12,
            padding: "18px 14px",
            textAlign: "center",
            fontSize: 13,
            color: "var(--muted-foreground)",
          }}
        >
          No add-ons configured.
        </div>
      )}
    </div>
  );
}
