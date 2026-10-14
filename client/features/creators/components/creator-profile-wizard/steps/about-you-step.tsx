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
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { cn } from "@/lib/utils";

import {
  CwCard,
  CwFacet,
  CwFacetHelp,
  CwFacetLabel,
  CwField,
  CwFieldLabel,
  CwFieldWarn,
  CwGrid2,
  CwHr,
  CwInput,
  CwReq,
  CwSelectField,
} from "../wizard-ui";

export type AboutYouStepProps = {
  disabled: boolean;

  /** Creator profile id — used to render the Instagram connection block. */
  profileId: string;

  /** Admin editing on a creator's behalf. The phone field shows in both modes. */
  adminMode?: boolean;
  phone?: string;
  onPhoneChange?: (value: string) => void;
  /**
   * Whether the creator's phone is fully OTP-verified
   * (`phoneVerified` and `phoneOtpLastStatus === 'approved'`).
   */
  phoneVerified?: boolean;
  /** Fires when the phone becomes verified via the OTP widget. */
  onPhoneVerifiedChange?: (verified: boolean) => void;

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
    phone?: string;
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
    phoneVerified = false,
    onPhoneVerifiedChange,
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
    <CwCard>
      {/* Photo row */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <button
            type="button"
            className={cn(
              "relative grid size-22 place-items-center overflow-hidden rounded-full border-2 border-dashed p-0 text-primary transition-[transform,box-shadow] duration-150",
              "border-primary/20 bg-primary/5",
              "hover:enabled:-translate-y-px hover:enabled:shadow-[0_8px_20px_-10px_color-mix(in_oklab,var(--primary)_50%,transparent)]",
              "disabled:cursor-not-allowed disabled:opacity-75",
              hasPhoto && "cursor-pointer border-solid border-border",
              !hasPhoto && "cursor-pointer",
            )}
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
                  className="fixed inset-0 z-40"
                  onClick={() => setPhotoMenuOpen(false)}
                />
                <motion.div
                  className="absolute top-[calc(100%+10px)] left-0 z-41 flex min-w-43 flex-col gap-0.5 rounded-[14px] border border-border bg-card p-1.5 shadow-[0_18px_40px_-18px_rgb(24_19_19/0.4)]"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                >
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2.25 rounded-[9px] border-0 bg-transparent px-2.75 py-2.25 text-left text-[13px] font-semibold text-foreground transition-colors hover:bg-muted [&_svg]:text-muted-foreground"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      setViewerOpen(true);
                    }}
                  >
                    <Eye size={15} aria-hidden /> View photo
                  </button>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2.25 rounded-[9px] border-0 bg-transparent px-2.75 py-2.25 text-left text-[13px] font-semibold text-foreground transition-colors hover:bg-muted [&_svg]:text-muted-foreground"
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
            className="hidden"
            onChange={(e) => onSelectProfileImage(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold tracking-[-0.01em] text-foreground">
            Choose your best creator photo{" "}
            <CwReq />
          </span>
          <span className="text-[13px] text-muted-foreground">
            Smile, use good lighting and avoid group photos.
          </span>
          <button
            type="button"
            className={cn(
              "mt-0.5 inline-flex h-8 cursor-pointer items-center gap-1.5 self-start rounded-[10px] border border-primary/20 bg-background px-3 text-[13.5px] font-medium text-primary transition-colors",
              "hover:enabled:bg-primary/5",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
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
        <CwFieldWarn>
          <AlertTriangle size={13} aria-hidden />
          {errors.photo}
        </CwFieldWarn>
      ) : null}

      <CwHr />

      {/* Identity grid */}
      <CwGrid2>
        <CwField span2>
          <CwFieldLabel htmlFor="cw-fullName">
            Full Name <CwReq />
          </CwFieldLabel>
          <CwInput
            id="cw-fullName"
            value={displayName}
            disabled={disabled}
            placeholder="Your name as you'd like brands to see it"
            autoComplete="name"
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
          {errors.displayName ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.displayName}
            </CwFieldWarn>
          ) : null}
        </CwField>

        <CwField span2>
          <CwFieldLabel htmlFor="cw-email">
            Contact email <CwReq />
          </CwFieldLabel>
          <CwInput
            id="cw-email"
            type="email"
            value={contactEmail}
            disabled={disabled}
            placeholder="Where brands and we can reach you"
            autoComplete="email"
            onChange={(e) => onContactEmailChange(e.target.value)}
          />
          {errors.contactEmail ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.contactEmail}
            </CwFieldWarn>
          ) : null}
        </CwField>

        <CwField>
          <CwFieldLabel htmlFor="cw-dob">
            Date of Birth <CwReq />
          </CwFieldLabel>
          <CwInput
            id="cw-dob"
            type="date"
            className="text-foreground"
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
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.dateOfBirth}
            </CwFieldWarn>
          ) : null}
        </CwField>

        <CwSelectField>
          <CwFieldLabel>
            Gender <CwReq />
          </CwFieldLabel>
          <PeSelectField
            id="cw-gender"
            label="Gender"
            hideLabel
            value={gender}
            placeholder="Select"
            disabled={disabled}
            options={genderOptions}
            allowClear
            onChange={(value) => onGenderChange(value as CreatorGender | "")}
          />
          {errors.gender ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.gender}
            </CwFieldWarn>
          ) : null}
        </CwSelectField>

        <CwField span2>
          <CwFieldLabel htmlFor="cw-phone">
            Phone number{!adminMode ? <> <CwReq /></> : null}
          </CwFieldLabel>
          {adminMode ? (
            <div className="flex items-stretch">
              <span className="inline-flex items-center rounded-l-[10px] border border-r-0 border-border bg-muted px-3 text-sm font-semibold text-foreground">
                +
              </span>
              <CwInput
                id="cw-phone"
                className="rounded-l-none rounded-r-[10px]"
                value={(phone ?? "").replace(/^\+/, "")}
                disabled={disabled}
                inputMode="tel"
                autoComplete="tel"
                placeholder="919876543210"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  onPhoneChange?.(digits ? `+${digits}` : "");
                }}
              />
            </div>
          ) : (
            <>
              {/*
                Seed the field with the saved number and its verified state so
                an existing creator sees "Verified" instead of a blank OTP
                widget. Editing the number to a different value re-arms the
                Send OTP / Verify flow; reverting to the saved number clears it
                again with no re-OTP.
              */}
              <PhoneVerificationField
                idPrefix="cw"
                disabled={disabled}
                initialPhone={phone || undefined}
                initialVerified={phoneVerified}
                onVerifiedChange={(v) => onPhoneVerifiedChange?.(v)}
                onVerifiedPhone={(p) => onPhoneChange?.(p)}
              />
              <CwFacetHelp>
                {phoneVerified
                  ? "Your mobile number is verified. Edit it to change — you'll verify the new number."
                  : "Verify your mobile number to continue."}
              </CwFacetHelp>
            </>
          )}
        </CwField>
      </CwGrid2>

      <CwHr />

      {/* Connected accounts */}
      <CwFacet>
        <CwFacetLabel>
          <span className="inline-flex items-center">
            <Instagram size={15} aria-hidden className="mr-1.5" />
            Connect your Accounts
            <CwReq className="ml-1" />
          </span>
        </CwFacetLabel>
        <CwFacetHelp>
          Required to go live — brands use your connected Instagram to verify
          your reach and audience.
        </CwFacetHelp>
        <div>
          <CreatorSocialAccounts
            profileId={profileId}
            adminMode={adminMode}
          />
        </div>
        {errors.phone ? (
          <CwFieldWarn>
            <AlertTriangle size={13} aria-hidden />
            {errors.phone}
          </CwFieldWarn>
        ) : null}
        {errors.instagram ? (
          <CwFieldWarn>
            <AlertTriangle size={13} aria-hidden />
            {errors.instagram}
          </CwFieldWarn>
        ) : null}
      </CwFacet>

      {/* Full-size photo viewer */}
      <AnimatePresence>
        {viewerOpen && hasPhoto ? (
          <motion.div
            className="fixed inset-0 z-90 grid place-items-center bg-[rgba(15,12,12,0.82)] p-6 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setViewerOpen(false)}
          >
            <button
              type="button"
              className="absolute top-5 right-5 grid size-10.5 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/12 text-white transition-colors hover:bg-white/22"
              onClick={() => setViewerOpen(false)}
              aria-label="Close photo"
            >
              <X size={20} />
            </button>
            <motion.div
              className="relative aspect-square w-[min(480px,90vw)] overflow-hidden rounded-[20px] bg-black shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]"
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
    </CwCard>
  );
}
