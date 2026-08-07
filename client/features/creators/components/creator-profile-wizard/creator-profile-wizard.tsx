"use client";

import "../creator-profile-update/profile-edit.css";
import "./creator-profile-wizard.css";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Flame,
  Lightbulb,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type {
  CreatorGender,
  CreatorProfileLanguagePayload,
} from "@/features/creators/api/create-creator-profile";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";

import { useCreatorProfileImage } from "@/features/creators/hooks/use-creator-profile-image";
import { useCreatorLocationForm } from "@/features/creators/hooks/use-creator-location-form";
import { useCreatorFacetsForm } from "@/features/creators/hooks/use-creator-facets-form";
import { useMyPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-my-portfolio-videos-query";
import { useSubmitCreatorProfileMutation } from "@/features/creators/hooks/use-creator-profile-form-mutation";
import { useAuth } from "@/providers/auth-provider";
import { getInitialCreatorName } from "@/features/creators/hooks/creator-profile-form-utils";

import {
  WIZARD_STEPS,
  computeProfileStrength,
  type WizardStepId,
} from "./wizard-config";
import { AboutYouStep } from "./steps/about-you-step";
import { ComingSoonStep } from "./steps/coming-soon-step";

export type CreatorProfileWizardProps = {
  profileId: string;
  initialProfile: CreatorProfileItemApi;
  onExit?: () => void;
};

// Facet dimensions that count toward a "has a niche" signal for the strength meter.
const NICHE_DIMENSIONS = new Set([
  "CONTENT_FORMAT",
  "CONTENT_CATEGORY",
  "CATEGORY_EXPERIENCE",
]);

export function CreatorProfileWizard({
  profileId,
  initialProfile,
  onExit,
}: CreatorProfileWizardProps) {
  const { user } = useAuth();

  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<WizardStepId>>(new Set());

  // ---- About you state ----
  const [displayName, setDisplayName] = useState(
    () => initialProfile.displayName ?? getInitialCreatorName(user),
  );
  const [gender, setGender] = useState<CreatorGender | "">(
    () => (initialProfile.gender as CreatorGender | undefined) ?? "",
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    () => initialProfile.dateOfBirth?.trim() ?? "",
  );

  const profileImage = useCreatorProfileImage({
    mode: "update",
    profileId,
    initialProfile,
  });
  const location = useCreatorLocationForm({ initialProfile });
  const facets = useCreatorFacetsForm({
    initialProfile,
    enabled: Boolean(user),
  });
  const portfolioQuery = useMyPortfolioVideosQuery({
    enabled: Boolean(user),
    staleTime: 2 * 60_000,
  });

  const languageDrafts = facets.languageDrafts;
  const [languageConfirmed, setLanguageConfirmed] = useState<boolean>(
    () => (initialProfile.profileLanguages ?? []).length > 0,
  );

  const selectedLanguageCount = useMemo(
    () => languageDrafts.filter((row) => row.slug !== "").length,
    [languageDrafts],
  );

  const submitMutation = useSubmitCreatorProfileMutation({
    mode: "update",
    profileId,
    onSuccess: () => {
      setCompleted((prev) => new Set(prev).add("about"));
      setActiveIndex((idx) => Math.min(idx + 1, WIZARD_STEPS.length - 1));
    },
  });
  const pending = submitMutation.isPending;

  const activeStep = WIZARD_STEPS[activeIndex];

  // ---- Live "How brands see you" preview + Profile Strength ----
  const languageLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of facets.facetOptionsByDimension.LANGUAGE ?? []) {
      map.set(opt.slug, opt.label);
    }
    return map;
  }, [facets.facetOptionsByDimension.LANGUAGE]);

  const previewLanguages = useMemo(
    () =>
      languageDrafts
        .filter((row) => row.slug !== "")
        .map((row) => languageLabelBySlug.get(row.slug) ?? row.slug)
        .slice(0, 3),
    [languageDrafts, languageLabelBySlug],
  );

  const strength = useMemo(() => {
    const hasNiche = (initialProfile.facetSelections ?? []).some((row) =>
      NICHE_DIMENSIONS.has(row.dimension),
    );
    return computeProfileStrength({
      hasPhoto: Boolean(profileImage.profileImagePreviewUrl),
      hasName: displayName.trim().length > 0,
      hasDob: Boolean(dateOfBirth),
      hasGender: Boolean(gender),
      hasCity: location.city.trim().length > 0,
      hasLanguage: selectedLanguageCount > 0,
      hasBio: Boolean(initialProfile.bio?.trim()),
      hasNiche,
      hasPackage: (initialProfile.packages ?? []).length > 0,
      hasIntroVideo: Boolean(initialProfile.introVideoUrl?.trim()),
      portfolioCount: (portfolioQuery.data ?? []).length,
    });
  }, [
    profileImage.profileImagePreviewUrl,
    displayName,
    dateOfBirth,
    gender,
    location.city,
    selectedLanguageCount,
    initialProfile,
    portfolioQuery.data,
  ]);

  // ---- Validation for the About you step ----
  const aboutValidation = useMemo(() => {
    const missing: string[] = [];
    if (!displayName.trim()) missing.push("your full name");
    if (!dateOfBirth) missing.push("date of birth");
    if (!gender) missing.push("gender");
    if (!location.city.trim()) missing.push("city");
    if (selectedLanguageCount === 0) missing.push("at least one language");
    if (selectedLanguageCount > 0 && !languageConfirmed)
      missing.push("the language confirmation");
    return { missing, ok: missing.length === 0 };
  }, [
    displayName,
    dateOfBirth,
    gender,
    location.city,
    selectedLanguageCount,
    languageConfirmed,
  ]);

  const isEighteenPlus = useMemo(() => {
    if (!dateOfBirth) return true;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return true;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return dob <= cutoff;
  }, [dateOfBirth]);

  const handleSaveAbout = useCallback(() => {
    if (!aboutValidation.ok) {
      toast.error(`Almost there — add ${aboutValidation.missing.join(", ")}.`);
      return;
    }
    if (!isEighteenPlus) {
      toast.error("Creators must be at least 18 years old.");
      return;
    }
    if (profileImage.uploadingProfileImage) {
      toast.error("Hang on — your photo is still uploading.");
      return;
    }

    const profileLanguages: CreatorProfileLanguagePayload[] = languageDrafts
      .filter((row) => row.slug !== "")
      .map((row) => ({ slug: row.slug, fluency: row.fluency }));

    const payload: UpdateCreatorProfilePayload = {
      displayName: displayName.trim(),
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      countryName: location.countryName || undefined,
      stateName: location.stateName || undefined,
      city: location.city.trim() || undefined,
      ...(profileImage.profileImageRemoved
        ? { profileImageKey: "" }
        : profileImage.pendingProfileImageKey
          ? { profileImageKey: profileImage.pendingProfileImageKey }
          : {}),
      ...(profileLanguages.length > 0 ? { profileLanguages } : {}),
    };

    submitMutation.mutate({ payload });
  }, [
    aboutValidation,
    isEighteenPlus,
    profileImage.uploadingProfileImage,
    profileImage.profileImageRemoved,
    profileImage.pendingProfileImageKey,
    languageDrafts,
    displayName,
    gender,
    dateOfBirth,
    location.countryName,
    location.stateName,
    location.city,
    submitMutation,
  ]);

  const goToStep = useCallback(
    (index: number) => {
      const target = WIZARD_STEPS[index];
      if (!target) return;
      if (target.ready || completed.has(target.id) || index <= activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, completed],
  );

  const initials = useMemo(() => {
    const source = displayName.trim() || user?.name?.trim() || "";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "You";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [displayName, user?.name]);

  const ActiveIcon = activeStep.icon;

  return (
    <div className="pe-scope cw-root">
      {/* Sub-header line */}
      <div className="cw-topline">
        <span>
          Step {activeIndex + 1} of {WIZARD_STEPS.length}
          {completed.size > 0 ? " · saved just now" : ""}
        </span>
        <span className="cw-topline-avatar" aria-hidden>
          {initials}
        </span>
      </div>

      <div className="cw-layout">
        {/* ---- Left rail ---- */}
        <aside className="cw-rail">
          <div className="cw-rail-intro">
            <h2 className="cw-rail-title">Complete Your Creator Profile</h2>
            <p className="cw-rail-sub">
              Build a profile that helps brands discover and trust you.
            </p>
          </div>

          {/* Profile Strength */}
          <div className="cw-strength">
            <div className="cw-strength-head">
              <Flame size={16} aria-hidden />
              <span>Profile Strength</span>
            </div>
            <div className="cw-strength-pct">{strength.pct}%</div>
            <div className="cw-strength-track">
              <motion.div
                className="cw-strength-fill"
                initial={false}
                animate={{ width: `${strength.pct}%` }}
                transition={{ type: "spring", stiffness: 160, damping: 26 }}
              />
            </div>
            <p className="cw-strength-hint">{strength.hint}</p>
          </div>

          {/* Step nav */}
          <nav className="cw-steps" aria-label="Onboarding steps">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              const isDone = completed.has(step.id);
              const isReachable =
                step.ready || isDone || index <= activeIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  className="cw-step"
                  data-active={isActive}
                  data-done={isDone}
                  disabled={!isReachable}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => goToStep(index)}
                >
                  <span className="cw-step-dot">
                    {isDone ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="cw-step-label">{step.label}</span>
                </button>
              );
            })}
          </nav>

          {/* How brands see you */}
          <div className="cw-preview">
            <div className="cw-preview-head">
              <Eye size={14} aria-hidden />
              <span>How brands see you</span>
            </div>
            <div className="cw-preview-body">
              <div className="cw-preview-avatar" data-empty={!profileImage.profileImagePreviewUrl}>
                {profileImage.profileImagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImage.profileImagePreviewUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div className="cw-preview-meta">
                {displayName.trim() ? (
                  <span className="cw-preview-name">{displayName.trim()}</span>
                ) : (
                  <span className="cw-preview-skel" />
                )}
                {previewLanguages.length > 0 ? (
                  <div className="cw-preview-langs">
                    {previewLanguages.map((label) => (
                      <span key={label} className="cw-preview-pill">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="cw-preview-note">
              This card fills in as you complete each step.
            </p>
          </div>

          {/* Tip */}
          <div className="cw-tip">
            <Lightbulb size={14} aria-hidden />
            <p>Creators with 10+ portfolio pieces get 3× more orders.</p>
          </div>
        </aside>

        {/* ---- Content pane ---- */}
        <div className="cw-pane">
          <div className="cw-pane-head">
            <span className="cw-pane-icon">
              <ActiveIcon size={22} />
            </span>
            <div>
              <h1 className="cw-pane-title">{activeStep.title}</h1>
              <p className="cw-pane-tag">{activeStep.tagline}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              {activeStep.id === "about" ? (
                <AboutYouStep
                  disabled={pending}
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                  profileImagePreviewUrl={profileImage.profileImagePreviewUrl}
                  uploadingProfileImage={profileImage.uploadingProfileImage}
                  profileImageInputRef={profileImage.profileImageInputRef}
                  onSelectProfileImage={(file) =>
                    void profileImage.handleProfileImageSelected(file)
                  }
                  dateOfBirth={dateOfBirth}
                  onDateOfBirthChange={setDateOfBirth}
                  gender={gender}
                  onGenderChange={setGender}
                  countryCode={location.countryCode}
                  countries={location.countries}
                  onCountryChange={(value) => {
                    location.setCountryCode(value);
                    location.setStateCode("");
                    location.setCity("");
                  }}
                  stateCode={location.stateCode}
                  states={location.states}
                  onStateChange={(value) => {
                    location.setStateCode(value);
                    location.setCity("");
                  }}
                  city={location.city}
                  cities={location.cities}
                  onCityChange={location.setCity}
                  languageOptions={facets.facetOptionsByDimension.LANGUAGE ?? []}
                  languageDrafts={languageDrafts}
                  languagesLoading={facets.facetOptionsQuery.isLoading}
                  onAddLanguage={(slug) => facets.addLanguage(slug)}
                  onRemoveLanguage={(index) => facets.removeLanguage(index)}
                  onUpdateLanguageSlug={(index, slug) =>
                    facets.updateLanguageSlug(index, slug)
                  }
                  onFluencyChange={(index, fluency) =>
                    facets.updateLanguageFluency(index, fluency)
                  }
                  languageConfirmed={languageConfirmed}
                  onLanguageConfirmedChange={setLanguageConfirmed}
                />
              ) : (
                <ComingSoonStep step={activeStep} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="cw-foot">
            <span className="cw-foot-note">
              Autosaved. You can come back any time.
            </span>
            <div className="cw-foot-actions">
              <button
                type="button"
                className="cw-btn cw-btn-ghost"
                disabled={pending}
                onClick={() => {
                  if (activeIndex === 0) onExit?.();
                  else setActiveIndex((idx) => Math.max(0, idx - 1));
                }}
              >
                <ArrowLeft size={16} />
                {activeIndex === 0 ? "Exit" : "Back"}
              </button>

              {activeStep.id === "about" ? (
                <button
                  type="button"
                  className="cw-btn cw-btn-primary"
                  onClick={handleSaveAbout}
                  disabled={pending || profileImage.uploadingProfileImage}
                >
                  {pending ? (
                    <>
                      <Spinner className="size-4" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      Continue Building Profile
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="cw-btn cw-btn-primary"
                  disabled
                >
                  Coming soon
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
