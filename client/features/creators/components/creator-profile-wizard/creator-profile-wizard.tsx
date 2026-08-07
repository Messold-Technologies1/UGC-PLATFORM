"use client";

import "../creator-profile-update/profile-edit.css";
import "./creator-profile-wizard.css";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Rocket } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type {
  CreatorGender,
  CreatorProfileLanguagePayload,
} from "@/features/creators/api/create-creator-profile";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";

import { useCreatorProfileImage } from "@/features/creators/hooks/use-creator-profile-image";
import { useCreatorLocationForm } from "@/features/creators/hooks/use-creator-location-form";
import { useCreatorFacetsForm } from "@/features/creators/hooks/use-creator-facets-form";
import { useSubmitCreatorProfileMutation } from "@/features/creators/hooks/use-creator-profile-form-mutation";
import { useAuth } from "@/providers/auth-provider";
import { getInitialCreatorName } from "@/features/creators/hooks/creator-profile-form-utils";

import { WIZARD_STEPS, type WizardStepId } from "./wizard-config";
import { AboutYouStep } from "./steps/about-you-step";
import { ComingSoonStep } from "./steps/coming-soon-step";

export type CreatorProfileWizardProps = {
  profileId: string;
  initialProfile: CreatorProfileItemApi;
  onExit?: () => void;
};

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

  // Languages use the same select + fluency model as the long form; they come
  // straight from the facets hook so selections persist with their fluency.
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
      // Advance to the next milestone once the save lands.
      setActiveIndex((idx) => Math.min(idx + 1, WIZARD_STEPS.length - 1));
    },
  });
  const pending = submitMutation.isPending;

  const activeStep = WIZARD_STEPS[activeIndex];

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
      // Only allow jumping to a step that's ready or already completed.
      const target = WIZARD_STEPS[index];
      if (!target) return;
      if (target.ready || completed.has(target.id) || index <= activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, completed],
  );

  const progressPct = useMemo(() => {
    if (WIZARD_STEPS.length <= 1) return 0;
    return (activeIndex / (WIZARD_STEPS.length - 1)) * 100;
  }, [activeIndex]);

  return (
    <div className="pe-scope cw-root">
      {/* ---- Milestone rail ---- */}
      <div className="cw-rail" role="tablist" aria-label="Profile setup milestones">
        <div className="cw-rail-track" aria-hidden>
          <motion.div
            className="cw-rail-fill"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 28 }}
          />
        </div>
        <ol className="cw-rail-steps">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === activeIndex;
            const isDone = completed.has(step.id);
            const isReachable =
              step.ready || isDone || index <= activeIndex;
            return (
              <li key={step.id} className="cw-rail-step">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className="cw-node"
                  data-active={isActive}
                  data-done={isDone}
                  data-reachable={isReachable}
                  disabled={!isReachable}
                  onClick={() => goToStep(index)}
                >
                  <span className="cw-node-dot">
                    {isDone ? (
                      <Check size={15} strokeWidth={3} />
                    ) : (
                      <Icon size={15} />
                    )}
                  </span>
                  <span className="cw-node-label">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ---- Step panel ---- */}
      <div className="cw-panel">
        <div className="cw-panel-head">
          <span className="cw-panel-icon">
            <activeStep.icon size={18} />
          </span>
          <div>
            <h3 className="cw-panel-title">{activeStep.title}</h3>
            <p className="cw-panel-tag">{activeStep.tagline}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="cw-panel-body"
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
      </div>

      {/* ---- Footer nav ---- */}
      <div className="cw-foot">
        <button
          type="button"
          className="cw-btn cw-btn-ghost"
          onClick={() => {
            if (activeIndex === 0) {
              onExit?.();
            } else {
              setActiveIndex((idx) => Math.max(0, idx - 1));
            }
          }}
          disabled={pending}
        >
          <ArrowLeft size={16} />
          {activeIndex === 0 ? "Exit" : "Back"}
        </button>

        <div className="cw-foot-hint">
          {activeStep.id === "about" && !aboutValidation.ok ? (
            <span className="cw-foot-hint-text">
              Add {aboutValidation.missing[0]} to continue
            </span>
          ) : null}
        </div>

        {activeStep.id === "about" ? (
          <button
            type="button"
            className={cn("cw-btn cw-btn-primary")}
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
                Save &amp; continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        ) : activeIndex < WIZARD_STEPS.length - 1 ? (
          <button
            type="button"
            className="cw-btn cw-btn-primary"
            onClick={() =>
              setActiveIndex((idx) =>
                Math.min(idx + 1, WIZARD_STEPS.length - 1),
              )
            }
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" className="cw-btn cw-btn-primary" disabled>
            <Rocket size={16} />
            Go live (soon)
          </button>
        )}
      </div>
    </div>
  );
}
