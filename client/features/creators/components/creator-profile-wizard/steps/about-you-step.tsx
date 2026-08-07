"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import {
  Cake,
  Camera,
  Check,
  Globe2,
  MapPin,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { PeSelectField } from "@/features/creators/components/creator-profile-update/shared-components";
import { genderOptions } from "@/features/creators/hooks/creator-profile-form-utils";
import type { CreatorGender } from "@/features/creators/api/create-creator-profile";
import { PROFILE_IMAGE_ACCEPT } from "@/features/creators/hooks/use-creator-profile-image";

import { LANGUAGE_OPTIONS } from "../wizard-config";

export type AboutYouStepProps = {
  disabled: boolean;

  displayName: string;
  onDisplayNameChange: (value: string) => void;

  profileImagePreviewUrl: string | null;
  uploadingProfileImage: boolean;
  profileImageInputRef: RefObject<HTMLInputElement | null>;
  onSelectProfileImage: (file: File | null) => void;
  onRemoveProfileImage: () => void;

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

  selectedLanguages: string[];
  onToggleLanguage: (slug: string) => void;

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

/**
 * Small helper that renders a "why we ask" line so every field feels
 * intentional rather than bureaucratic.
 */
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
    onRemoveProfileImage,
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
    selectedLanguages,
    onToggleLanguage,
    languageConfirmed,
    onLanguageConfirmedChange,
  } = props;

  const today = new Date().toISOString().split("T")[0];

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
          <div className="cw-avatar" data-empty={!profileImagePreviewUrl}>
            {profileImagePreviewUrl ? (
              <Image
                src={profileImagePreviewUrl}
                alt="Your profile"
                fill
                unoptimized
                style={{ objectFit: "cover" }}
              />
            ) : (
              <UserRound size={34} aria-hidden />
            )}
            <button
              type="button"
              className="cw-avatar-btn"
              disabled={disabled || uploadingProfileImage}
              onClick={() => profileImageInputRef.current?.click()}
              aria-label={
                profileImagePreviewUrl ? "Change profile photo" : "Add profile photo"
              }
            >
              <Camera size={15} aria-hidden />
            </button>
          </div>
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
              : "A real name + a bright, friendly photo gets up to 2× more brand replies."}
          </WhyLine>
          {profileImagePreviewUrl ? (
            <button
              type="button"
              className="cw-photo-remove"
              disabled={disabled || uploadingProfileImage}
              onClick={onRemoveProfileImage}
            >
              <Trash2 size={12} aria-hidden /> Remove photo
            </button>
          ) : null}
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

        <div className="cw-field cw-select-field">
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

      {/* Languages */}
      <motion.div className="cw-field" variants={fieldVariants}>
        <label className="cw-label">
          <Globe2 size={13} aria-hidden /> Languages you create in <span className="cw-req">*</span>
          {selectedLanguages.length > 0 ? (
            <span className="cw-count">{selectedLanguages.length}</span>
          ) : null}
        </label>
        <WhyLine>Every language you add opens a whole new set of regional briefs to you.</WhyLine>
        <div className="cw-lang-grid">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isOn = selectedLanguages.includes(lang.slug);
            return (
              <motion.button
                key={lang.slug}
                type="button"
                className="cw-lang-chip"
                data-selected={isOn}
                disabled={disabled}
                onClick={() => onToggleLanguage(lang.slug)}
                whileTap={{ scale: 0.94 }}
              >
                {isOn ? (
                  <span className="cw-lang-tick">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : null}
                {lang.label}
              </motion.button>
            );
          })}
        </div>

        {/* Language confirmation gate */}
        <label
          className="cw-confirm"
          data-checked={languageConfirmed}
          data-disabled={disabled || selectedLanguages.length === 0}
        >
          <input
            type="checkbox"
            className="cw-confirm-box"
            checked={languageConfirmed}
            disabled={disabled || selectedLanguages.length === 0}
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
    </motion.div>
  );
}
