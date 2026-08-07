"use client";

import { useState, type RefObject } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Cake,
  Camera,
  Check,
  Eye,
  Globe2,
  MapPin,
  RefreshCw,
  Sparkles,
  Users,
  UserRound,
  X,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { PeSelectField } from "@/features/creators/components/creator-profile-update/shared-components";
import { LanguageRows } from "@/features/creators/components/creator-profile-update/facet-components";
import { genderOptions, type LanguageDraft } from "@/features/creators/hooks/creator-profile-form-utils";
import type {
  CreatorGender,
  CreatorLanguageFluency,
} from "@/features/creators/api/create-creator-profile";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";
import { PROFILE_IMAGE_ACCEPT } from "@/features/creators/hooks/use-creator-profile-image";

export type AboutYouStepProps = {
  disabled: boolean;

  displayName: string;
  onDisplayNameChange: (value: string) => void;

  profileImagePreviewUrl: string | null;
  uploadingProfileImage: boolean;
  profileImageInputRef: RefObject<HTMLInputElement | null>;
  onSelectProfileImage: (file: File | null) => void;

  dateOfBirth: string;
  onDateOfBirthChange: (value: string) => void;

  gender: CreatorGender | "";
  onGenderChange: (value: CreatorGender | "") => void;

  // Location
  countryCode: string;
  countries: Array<{ isoCode: string; name: string }>;
  onCountryChange: (value: string) => void;
  stateCode: string;
  states: Array<{ isoCode: string; name: string }>;
  onStateChange: (value: string) => void;
  city: string;
  cities: Array<{ name: string }>;
  onCityChange: (value: string) => void;

  // Languages (long-form style: select + fluency)
  languageOptions: CreatorFacetOption[];
  languageDrafts: LanguageDraft[];
  languagesLoading: boolean;
  onAddLanguage: (slug: string) => void;
  onRemoveLanguage: (index: number) => void;
  onUpdateLanguageSlug: (index: number, slug: string) => void;
  onFluencyChange: (index: number, fluency: CreatorLanguageFluency) => void;

  languageConfirmed: boolean;
  onLanguageConfirmedChange: (value: boolean) => void;
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
};

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

function WhyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="cw-why">
      <Sparkles size={12} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function AboutYouStep(props: AboutYouStepProps) {
  const {
    disabled,
    displayName,
    onDisplayNameChange,
    profileImagePreviewUrl,
    uploadingProfileImage,
    profileImageInputRef,
    onSelectProfileImage,
    dateOfBirth,
    onDateOfBirthChange,
    gender,
    onGenderChange,
    countryCode,
    countries,
    onCountryChange,
    stateCode,
    states,
    onStateChange,
    city,
    cities,
    onCityChange,
    languageOptions,
    languageDrafts,
    languagesLoading,
    onAddLanguage,
    onRemoveLanguage,
    onUpdateLanguageSlug,
    onFluencyChange,
    languageConfirmed,
    onLanguageConfirmedChange,
  } = props;

  const today = new Date().toISOString().split("T")[0];
  const hasPhoto = Boolean(profileImagePreviewUrl);

  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  function openFilePicker() {
    profileImageInputRef.current?.click();
  }

  function handleAvatarClick() {
    if (uploadingProfileImage || disabled) return;
    if (!hasPhoto) {
      openFilePicker();
      return;
    }
    setPhotoMenuOpen((open) => !open);
  }

  const selectedLanguageCount = languageDrafts.filter(
    (row) => row.slug !== "",
  ).length;

  return (
    <motion.div
      className="cw-step-fields"
      variants={groupVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Profile photo + name — the identity hero */}
      <motion.div className="cw-hero" variants={fieldVariants}>
        <div className="cw-hero-photo">
          <button
            type="button"
            className="cw-avatar"
            data-empty={!hasPhoto}
            disabled={disabled || uploadingProfileImage}
            onClick={handleAvatarClick}
            aria-label={hasPhoto ? "Profile photo options" : "Add profile photo"}
          >
            {hasPhoto ? (
              <Image
                src={profileImagePreviewUrl as string}
                alt="Your profile"
                fill
                unoptimized
                style={{ objectFit: "cover" }}
              />
            ) : (
              <UserRound size={34} aria-hidden />
            )}
            <span className="cw-avatar-badge" aria-hidden>
              {uploadingProfileImage ? (
                <Spinner className="size-3.5" />
              ) : (
                <Camera size={15} />
              )}
            </span>
          </button>

          <AnimatePresence>
            {photoMenuOpen && hasPhoto ? (
              <>
                <div
                  className="cw-photo-backdrop"
                  onClick={() => setPhotoMenuOpen(false)}
                />
                <motion.div
                  className="cw-photo-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      setViewerOpen(true);
                    }}
                  >
                    <Eye size={15} aria-hidden /> View photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      openFilePicker();
                    }}
                  >
                    <RefreshCw size={15} aria-hidden /> Replace photo
                  </button>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          <input
            type="file"
            ref={profileImageInputRef}
            accept={PROFILE_IMAGE_ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => onSelectProfileImage(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="cw-hero-name">
          <label htmlFor="cw-fullName" className="cw-label">
            Full name <span className="cw-req">*</span>
          </label>
          <input
            id="cw-fullName"
            className="cw-input cw-input-lg"
            value={displayName}
            disabled={disabled}
            placeholder="e.g. Srijit Das"
            autoComplete="name"
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
          <WhyLine>
            {uploadingProfileImage
              ? "Uploading your photo…"
              : hasPhoto
                ? "Tap your photo to view it full-size or swap it out."
                : "A real name + a bright, friendly photo gets up to 2× more brand replies. Tap the circle to add one."}
          </WhyLine>
        </div>
      </motion.div>

      {/* DOB + Gender */}
      <motion.div className="cw-row-2" variants={fieldVariants}>
        <div className="cw-field">
          <label htmlFor="cw-dob" className="cw-label">
            <Cake size={13} aria-hidden /> Date of birth <span className="cw-req">*</span>
          </label>
          <input
            id="cw-dob"
            type="date"
            className="cw-input"
            value={dateOfBirth}
            max={today}
            disabled={disabled}
            onClick={(e) => {
              try {
                if ("showPicker" in HTMLInputElement.prototype) {
                  e.currentTarget.showPicker();
                }
              } catch {
                // ignore — falls back to native behaviour
              }
            }}
            onChange={(e) => onDateOfBirthChange(e.target.value)}
          />
          <WhyLine>Confirms you&apos;re 18+ and helps brands match age-fit campaigns.</WhyLine>
        </div>

        <div className="cw-field">
          <label className="cw-label">
            <Users size={13} aria-hidden /> Gender <span className="cw-req">*</span>
          </label>
          <PeSelectField
            id="cw-gender"
            label="Gender"
            value={gender}
            placeholder="Select gender"
            disabled={disabled}
            options={genderOptions}
            allowClear
            onChange={(value) => onGenderChange(value as CreatorGender | "")}
          />
          <WhyLine>Only used to match briefs that call for a specific presenter.</WhyLine>
        </div>
      </motion.div>

      {/* Location */}
      <motion.div className="cw-field" variants={fieldVariants}>
        <label className="cw-label">
          <MapPin size={13} aria-hidden /> Where you&apos;re based <span className="cw-req">*</span>
        </label>
        <div className="cw-row-3">
          <PeSelectField
            id="cw-country"
            label="Country"
            value={countryCode}
            placeholder="Country"
            disabled={disabled}
            options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
            onChange={onCountryChange}
          />
          <PeSelectField
            id="cw-state"
            label="State"
            value={stateCode}
            placeholder={countryCode ? "State" : "Pick country first"}
            disabled={disabled || !countryCode || states.length === 0}
            options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
            onChange={onStateChange}
          />
          <PeSelectField
            id="cw-city"
            label="City"
            value={city}
            placeholder={stateCode ? "City" : "Pick state first"}
            disabled={disabled || !stateCode || cities.length === 0}
            options={cities.map((row) => ({ value: row.name, label: row.name }))}
            onChange={onCityChange}
          />
        </div>
        <WhyLine>Local matches mean product samples arrive faster and on-location shoots are possible.</WhyLine>
      </motion.div>

      {/* Languages — long-form style with fluency */}
      <motion.div className="cw-field cw-lang-block" variants={fieldVariants}>
        <div className="cw-lang-head">
          <span className="cw-label" style={{ marginBottom: 0 }}>
            <Globe2 size={13} aria-hidden /> Languages you create in
          </span>
        </div>
        <WhyLine>
          Add each language with your fluency — every one you add opens a whole
          new set of regional briefs to you.
        </WhyLine>

        {languagesLoading ? (
          <div className="cw-lang-loading">
            <Spinner className="size-4" aria-hidden /> Loading languages…
          </div>
        ) : (
          <LanguageRows
            allLanguages={languageOptions}
            selected={languageDrafts}
            disabled={disabled}
            onAddLanguage={onAddLanguage}
            onRemoveLanguage={onRemoveLanguage}
            onUpdateLanguageSlug={onUpdateLanguageSlug}
            onFluencyChange={onFluencyChange}
          />
        )}

        {/* Language confirmation gate */}
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
          <span className="cw-confirm-text">
            <strong>Language confirmation</strong>
            I confirm that I can confidently create videos in all selected
            languages. I understand that incorrect information may lead to
            cancellations, refunds and a lower creator score.
          </span>
        </label>
      </motion.div>

      {/* Full-size photo viewer */}
      <AnimatePresence>
        {viewerOpen && hasPhoto ? (
          <motion.div
            className="cw-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setViewerOpen(false)}
          >
            <button
              type="button"
              className="cw-viewer-close"
              onClick={() => setViewerOpen(false)}
              aria-label="Close photo"
            >
              <X size={20} />
            </button>
            <motion.div
              className="cw-viewer-frame"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={profileImagePreviewUrl as string}
                alt="Your profile"
                fill
                unoptimized
                sizes="(max-width: 640px) 90vw, 480px"
                style={{ objectFit: "contain" }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
