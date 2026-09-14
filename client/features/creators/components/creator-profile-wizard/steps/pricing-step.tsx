"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Lightbulb, X } from "lucide-react";
import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import {
  PackageEditor,
  AddOnCatalogEditor,
} from "@/features/creators/components/creator-profile-update/package-and-addon-editors";
import { PackageEarningsBanner } from "@/features/creators/components/creator-profile-update/package-earnings-banner";
import type { PackageDraft, AddOnDraft } from "@/features/creators/hooks/creator-profile-form-utils";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import { WizardAccordionSection } from "./wizard-parts";
import { useAuth } from "@/providers/auth-provider";

export type PricingStepProps = {
  disabled: boolean;

  packageDraft: PackageDraft;
  onPackageChange: (draft: PackageDraft) => void;
  packageErrors: {
    priceAmount?: string;
    deliveryDays?: string;
    videoLengthSeconds?: string;
  };

  addOnOptions: CreatorAddOnOption[];
  selectedAddOnSlugs: string[];
  addOnDrafts: Record<string, AddOnDraft>;
  unmatchedNames: string[];
  addOnsLoading: boolean;
  addOnsError: boolean;
  onAddOnsRetry: () => void;
  onToggleAddOn: (option: CreatorAddOnOption) => void;
  onAddOnDraftChange: (slug: string, patch: Partial<AddOnDraft>) => void;
  defaultsConfirmed: boolean;
  onDefaultsConfirmedChange: (confirmed: boolean) => void;
  errors?: {
    defaultsConfirmed?: string;
    addOnPrices?: string;
  };
  addonsReviewed?: boolean;
  onAddonsReviewed?: () => void;
};

type PricingSectionId = "package" | "addons";

const START_LOW_TIP_KEY = "ugc:pricing-start-low-tip-dismissed";

function startLowTipStorageKey(userId: string) {
  return `${START_LOW_TIP_KEY}:${userId}`;
}

function StartLowGrowFastTip() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      // Old installs stored a single browser-wide flag. Ignore it so a new
      // account still sees the tip after another profile dismissed it.
      window.localStorage.removeItem(START_LOW_TIP_KEY);
      if (window.localStorage.getItem(startLowTipStorageKey(user.id)) !== "1") {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(true);
    }
  }, [user?.id]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    if (!user?.id) return;
    try {
      window.localStorage.setItem(startLowTipStorageKey(user.id), "1");
    } catch {
      // ignore quota / private mode
    }
  }

  return (
    <div className="cw-price-tip" role="note">
      <Lightbulb size={18} aria-hidden className="cw-price-tip-icon" />
      <div className="cw-price-tip-copy">
        <p className="cw-price-tip-title">Tip: Start low, grow fast 🚀</p>
        <p className="cw-price-tip-text">
          Want to get your first few orders faster? Keep your starting price as
          low as possible. Once you start getting regular orders, you can
          increase your price anytime.
        </p>
      </div>
      <button
        type="button"
        className="cw-price-tip-close"
        aria-label="Dismiss pricing tip"
        onClick={dismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function PricingStep({
  disabled,
  packageDraft,
  onPackageChange,
  packageErrors,
  addOnOptions,
  selectedAddOnSlugs,
  addOnDrafts,
  unmatchedNames,
  addOnsLoading,
  addOnsError,
  onAddOnsRetry,
  onToggleAddOn,
  onAddOnDraftChange,
  defaultsConfirmed,
  onDefaultsConfirmedChange,
  addonsReviewed = true,
  onAddonsReviewed,
  errors = {},
}: PricingStepProps) {
  const packageComplete =
    Boolean(packageDraft.priceAmount.trim()) &&
    Boolean(packageDraft.deliveryDays.trim()) &&
    defaultsConfirmed;
  const mandatoryCount = addOnOptions.filter((option) => option.mandatory).length;
  const extraAddOns = addOnOptions.filter(
    (option) => !option.mandatory && !selectedAddOnSlugs.includes(option.slug),
  );
  const extraCount = extraAddOns.length;
  const addOnSummary =
    extraCount > 0
      ? `${selectedAddOnSlugs.length} selected · ${extraCount} extra to review`
      : selectedAddOnSlugs.length > 0
        ? `${selectedAddOnSlugs.length} selected`
        : undefined;
  const extrasLabel = extraAddOns.map((option) => option.name).join(" or ");
  const packageSummary = [
    packageDraft.priceAmount.trim()
      ? `₹${packageDraft.priceAmount}`
      : null,
    packageDraft.deliveryDays.trim()
      ? `${packageDraft.deliveryDays} days`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const firstError: PricingSectionId | null = errors.defaultsConfirmed
    ? "package"
    : errors.addOnPrices
      ? "addons"
      : null;

  const [openId, setOpenId] = useState<PricingSectionId | "closed" | null>(
    null,
  );
  const fallback: PricingSectionId = firstError ?? "package";
  const open = openId === "closed" ? null : (openId ?? fallback);

  function toggleSection(id: string) {
    setOpenId((current) => {
      const resolved = current === "closed" ? null : (current ?? fallback);
      const next = resolved === id ? "closed" : (id as PricingSectionId);
      if (next === "addons") onAddonsReviewed?.();
      return next;
    });
  }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 961px)");
    function sync(matches: boolean) {
      if (matches) onAddonsReviewed?.();
    }
    sync(desktop.matches);
    const onChange = (event: MediaQueryListEvent) => sync(event.matches);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [onAddonsReviewed]);

  useEffect(() => {
    if (!firstError) return;
    setOpenId(firstError);
    if (firstError === "addons") onAddonsReviewed?.();
  }, [firstError, onAddonsReviewed]);

  return (
    <div className="cw-card">
      <PackageEarningsBanner
        packagePriceAmount={packageDraft.priceAmount}
        selectedAddOnSlugs={selectedAddOnSlugs}
        addOnDrafts={addOnDrafts}
      />

      <div className="cw-acc-stack">
        <WizardAccordionSection
          id="package"
          title="Your package"
          required
          complete={packageComplete}
          summary={packageSummary || undefined}
          open={open === "package"}
          onOpen={toggleSection}
        >
          <PackageEditor
            draft={packageDraft}
            disabled={disabled}
            onChange={onPackageChange}
            errors={packageErrors}
            defaultsConfirmed={defaultsConfirmed}
            onDefaultsConfirmedChange={onDefaultsConfirmedChange}
            defaultsConfirmedError={errors.defaultsConfirmed}
          >
            <StartLowGrowFastTip />
          </PackageEditor>
          {extraCount > 0 && !addonsReviewed ? (
            <div className="cw-addon-nudge">
              <p className="cw-addon-nudge-title">Review your add-ons</p>
              <p className="cw-addon-nudge-copy">
                {mandatoryCount} add-on{mandatoryCount === 1 ? " is" : "s are"}{" "}
                already on for every order. Open Add-ons to check prices
                {extrasLabel ? ` — and extras like ${extrasLabel}` : ""}.
              </p>
              <button
                type="button"
                className="cw-addon-nudge-btn"
                onClick={() => {
                  setOpenId("addons");
                  onAddonsReviewed?.();
                }}
              >
                Review add-ons
              </button>
            </div>
          ) : null}
        </WizardAccordionSection>

        <WizardAccordionSection
          id="addons"
          title="Add-ons"
          complete={
            !addOnsLoading &&
            extraCount === 0 &&
            selectedAddOnSlugs.length > 0 &&
            !errors.addOnPrices
          }
          summary={addOnSummary}
          open={open === "addons"}
          onOpen={toggleSection}
        >
          <CatalogStatus
            loading={addOnsLoading}
            error={addOnsError}
            label="add-on options"
            onRetry={onAddOnsRetry}
          />

          {errors.addOnPrices ? (
            <p className="cw-field-warn">
              <AlertTriangle size={13} aria-hidden />
              {errors.addOnPrices}
            </p>
          ) : null}

          {!addOnsLoading && !addOnsError ? (
            <AddOnCatalogEditor
              options={addOnOptions}
              selectedSlugs={selectedAddOnSlugs}
              drafts={addOnDrafts}
              unmatchedNames={unmatchedNames}
              disabled={disabled}
              onToggle={onToggleAddOn}
              onDraftChange={onAddOnDraftChange}
            />
          ) : null}
        </WizardAccordionSection>
      </div>
    </div>
  );
}
