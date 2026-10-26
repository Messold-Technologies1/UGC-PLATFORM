"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Lightbulb, Sparkles, X } from "lucide-react";
import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import {
  PackageEditor,
  AddOnCatalogEditor,
} from "@/features/creators/components/creator-profile-update/package-and-addon-editors";
import { PackageEarningsBanner } from "@/features/creators/components/creator-profile-update/package-earnings-banner";
import type { PackageDraft, AddOnDraft } from "@/features/creators/hooks/creator-profile-form-utils";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

import { CwCard, CwFieldWarn } from "../wizard-ui";
import { WizardAccordionSection } from "./wizard-parts";

const FOLLOWER_START_PRICE_MAX = 10_000;

export type PricingStepProps = {
  disabled: boolean;
  /** Active Instagram follower count, when known. */
  instagramFollowers?: number | null;

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
    <div
      className="mb-3 flex items-start gap-3 rounded-xl border border-[color-mix(in_oklab,#0d9488_26%,transparent)] bg-[color-mix(in_oklab,#14b8a6_11%,var(--card))] px-3.5 py-3"
      role="note"
    >
      <Lightbulb size={18} aria-hidden className="mt-0.5 shrink-0 text-[#0f766e]" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold leading-snug text-[#134e4a]">
          Tip: Start low, grow fast 🚀
        </p>
        <p className="mt-1 text-[13px] leading-snug text-[#3f6561]">
          Want to get your first few orders faster? Keep your starting price as
          low as possible. Once you start getting regular orders, you can
          increase your price anytime.
        </p>
      </div>
      <button
        type="button"
        className="-mr-1.5 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-[#3f6561] hover:bg-[color-mix(in_oklab,#0f766e_12%,transparent)] hover:text-[#134e4a]"
        aria-label="Dismiss pricing tip"
        onClick={dismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** Shown only under 10k followers. Copy only — does not change the price. */
function FollowerStartPriceSuggestion() {
  return (
    <div
      className="mb-3 flex items-start gap-3 rounded-xl border border-[color-mix(in_oklab,var(--primary)_28%,transparent)] bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))] px-3.5 py-3"
      role="note"
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Sparkles size={15} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-primary">
          AI recommendation
        </p>
        <p className="mt-1 text-[13px] leading-snug text-foreground">
          You have under 10k followers, so start at{" "}
          <span className="font-semibold">₹500</span>. At this reach, a lower
          starting price brings in the first orders faster — raise it anytime
          once work starts coming in.
        </p>
      </div>
    </div>
  );
}

export function PricingStep({
  disabled,
  instagramFollowers = null,
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
    <CwCard
      className={cn(
        "max-[960px]:gap-3 max-[960px]:border-0 max-[960px]:bg-transparent max-[960px]:p-0 max-[960px]:shadow-none",
      )}
    >
      <PackageEarningsBanner
        packagePriceAmount={packageDraft.priceAmount}
        selectedAddOnSlugs={selectedAddOnSlugs}
        addOnDrafts={addOnDrafts}
      />

      <div className="flex flex-col gap-[26px] max-[960px]:gap-2.5">
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
            {instagramFollowers != null &&
            instagramFollowers < FOLLOWER_START_PRICE_MAX ? (
              <FollowerStartPriceSuggestion />
            ) : null}
          </PackageEditor>
          {extraCount > 0 && !addonsReviewed ? (
            <div className="mt-3.5 hidden rounded-xl border-[1.4px] border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_7%,var(--background))] p-3.5 max-[960px]:block">
              <p className="m-0 text-sm font-bold text-foreground">
                Review your add-ons
              </p>
              <p className="mt-1.5 text-[12.5px] leading-normal text-muted-foreground">
                {mandatoryCount} add-on{mandatoryCount === 1 ? " is" : "s are"}{" "}
                already on for every order. Open Add-ons to check prices
                {extrasLabel ? ` — and extras like ${extrasLabel}` : ""}.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex rounded-full border-[1.4px] border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] bg-white px-3.5 py-2 text-[13px] font-bold text-primary"
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
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.addOnPrices}
            </CwFieldWarn>
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
    </CwCard>
  );
}
