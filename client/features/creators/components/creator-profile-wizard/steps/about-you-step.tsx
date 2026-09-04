"use client";

import { useState, type RefObject } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Camera, Eye, ImageUp, Instagram, RefreshCw, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { PeSelectField } from "@/features/creators/components/creator-profile-update/shared-components";
import { CreatorSocialAccounts } from "@/features/creators/components/creator-profile-update/creator-social-accounts";
import { genderOptions } from "@/features/creators/hooks/creator-profile-form-utils";
import type { CreatorGender } from "@/features/creators/api/create-creator-profile";
import { PROFILE_IMAGE_ACCEPT } from "@/features/creators/hooks/use-creator-profile-image";

export type AboutYouStepProps = {
  disabled: boolean;

  /** Creator profile id — used to render the Instagram connection block. */
  profileId: string;

  /** Admin editing on a creator's behalf. The phone field shows in both modes. */
  adminMode?: boolean;
  phone?: string;
  onPhoneChange?: (value: string) => void;

  displayName: string;
  onDisplayNameChange: (value: string) => void;

  contactEmail: string;
  onContactEmailChange: (value: string) => void;

  profileImagePreviewUrl: string | null;
  uploadingProfileImage: boolean;
  profileImageInputRef: RefObject<HTMLInputElement | null>;
  onSelectProfileImage: (file: File | null) => void;

  dateOfBirth: string;
  onDateOfBirthChange: (value: string) => void;

  gender: CreatorGender | "";
  onGenderChange: (value: CreatorGender | "") => void;

  errors?: {
    photo?: string;
    displayName?: string;
    contactEmail?: string;
    dateOfBirth?: string;
    gender?: string;
    instagram?: string;
  };
};

export function AboutYouStep(props: AboutYouStepProps) {
  const {
    disabled,
    profileId,
    adminMode = false,
    phone,
    onPhoneChange,
    displayName,
    onDisplayNameChange,
    contactEmail,
    onContactEmailChange,
    profileImagePreviewUrl,
    uploadingProfileImage,
    profileImageInputRef,
    onSelectProfileImage,
    dateOfBirth,
    onDateOfBirthChange,
    gender,
    onGenderChange,
    errors = {},
  } = props;

  const today = new Date().toISOString().split("T")[0];
  const hasPhoto = Boolean(profileImagePreviewUrl);

  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const openFilePicker = () => profileImageInputRef.current?.click();

  function handlePhotoTrigger() {
    if (disabled || uploadingProfileImage) return;
    if (!hasPhoto) {
      openFilePicker();
      return;
    }
    setPhotoMenuOpen((open) => !open);
  }

  return (
    <div className="cw-card">
      {/* Photo row */}
      <div className="cw-photo-row">
        <div className="cw-photo-wrap">
          <button
            type="button"
            className="cw-photo-circle"
            data-empty={!hasPhoto}
            disabled={disabled || uploadingProfileImage}
            onClick={handlePhotoTrigger}
            aria-label={hasPhoto ? "Profile photo options" : "Upload profile photo"}
          >
            {hasPhoto ? (
              <Image
                src={profileImagePreviewUrl as string}
                alt="Your profile"
                fill
                unoptimized
                style={{ objectFit: "cover" }}
              />
            ) : uploadingProfileImage ? (
              <Spinner className="size-6" aria-hidden />
            ) : (
              <Camera size={26} aria-hidden />
            )}
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

        <div className="cw-photo-info">
          <span className="cw-photo-title">
            Choose your best creator photo{" "}
            <span className="cw-req" aria-label="required">*</span>
          </span>
          <span className="cw-photo-hint">
            Smile, use good lighting and avoid group photos.
          </span>
          <button
            type="button"
            className="cw-photo-upload"
            disabled={disabled || uploadingProfileImage}
            onClick={handlePhotoTrigger}
          >
            {uploadingProfileImage ? (
              <Spinner className="size-3.5" aria-hidden />
            ) : (
              <ImageUp size={14} aria-hidden />
            )}
            {hasPhoto ? "Change photo" : "Upload photo"}
          </button>
        </div>
      </div>
      {errors.photo ? (
        <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.photo}</p>
      ) : null}

      <div className="cw-hr" />

      {/* Identity grid */}
      <div className="cw-grid2">
        <div className="cw-col-2 cw-field">
          <label htmlFor="cw-fullName" className="cw-fieldlabel">
            Full Name <span className="cw-req">*</span>
          </label>
          <input
            id="cw-fullName"
            className="cw-input"
            value={displayName}
            disabled={disabled}
            placeholder="Your name as you'd like brands to see it"
            autoComplete="name"
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
          {errors.displayName ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.displayName}</p>
          ) : null}
        </div>

        <div className="cw-col-2 cw-field">
          <label htmlFor="cw-email" className="cw-fieldlabel">
            Contact email <span className="cw-req">*</span>
          </label>
          <input
            id="cw-email"
            type="email"
            className="cw-input"
            value={contactEmail}
            disabled={disabled}
            placeholder="Where brands and we can reach you"
            autoComplete="email"
            onChange={(e) => onContactEmailChange(e.target.value)}
          />
          {errors.contactEmail ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.contactEmail}</p>
          ) : null}
        </div>

        <div className="cw-field">
          <label htmlFor="cw-dob" className="cw-fieldlabel">
            Date of Birth <span className="cw-req">*</span>
          </label>
          <input
            id="cw-dob"
            type="date"
            className="cw-input cw-input-date"
            value={dateOfBirth}
            max={today}
            disabled={disabled}
            onClick={(e) => {
              try {
                if ("showPicker" in HTMLInputElement.prototype) {
                  e.currentTarget.showPicker();
                }
              } catch {
                // ignore — native fallback
              }
            }}
            onChange={(e) => onDateOfBirthChange(e.target.value)}
          />
          {errors.dateOfBirth ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.dateOfBirth}</p>
          ) : null}
        </div>

        <div className="cw-field cw-select-field">
          <label className="cw-fieldlabel">
            Gender <span className="cw-req">*</span>
          </label>
          <PeSelectField
            id="cw-gender"
            label="Gender"
            value={gender}
            placeholder="Select"
            disabled={disabled}
            options={genderOptions}
            allowClear
            onChange={(value) => onGenderChange(value as CreatorGender | "")}
          />
          {errors.gender ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.gender}</p>
          ) : null}
        </div>

        <div className="cw-col-2 cw-field">
          <label htmlFor="cw-phone" className="cw-fieldlabel">
            Phone number
          </label>
          <div className="cw-phone">
            <span className="cw-phone-prefix">+91</span>
            <input
              id="cw-phone"
              className="cw-input cw-phone-input"
              value={phone ?? ""}
              disabled={disabled}
              inputMode="numeric"
              autoComplete="tel"
              placeholder={
                adminMode ? "Creator's phone number" : "Your phone number"
              }
              onChange={(e) =>
                onPhoneChange?.(e.target.value.replace(/\D/g, ""))
              }
            />
          </div>
        </div>
      </div>

      <div className="cw-hr" />

      {/* Connected accounts */}
      <div className="cw-facet">
        <div className="cw-facet-label">
          <span>
            <Instagram size={15} aria-hidden style={{ marginRight: 6 }} />
            Connect your Accounts
            <span className="cw-req"> *</span>
          </span>
        </div>
        <span className="cw-facet-help">
          Required to go live — brands use your connected Instagram to verify
          your reach and audience.
        </span>
        <div>
          <CreatorSocialAccounts
            profileId={profileId}
            adminMode={adminMode}
          />
        </div>
        {errors.instagram ? (
          <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.instagram}</p>
        ) : null}
      </div>

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
    </div>
  );
}
