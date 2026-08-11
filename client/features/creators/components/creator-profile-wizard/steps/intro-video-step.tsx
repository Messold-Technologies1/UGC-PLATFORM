"use client";

import type { RefObject } from "react";
import { Check } from "lucide-react";

import { CreatorProfileIntroVideoField } from "@/features/creators/components/creator-profile-update/creator-profile-intro-video-field";
import { INTRO_VIDEO_ACCEPT } from "@/features/creators/hooks/creator-profile-form-utils";

import { BIO_MIN_CHARS, BIO_MAX_CHARS } from "../wizard-config";

const BIO_EXAMPLE =
  "I'm a Mumbai-based beauty and skincare creator shooting in Hindi and English. I make honest first-impression reviews, GRWM routines and product demos, mostly at home with natural light. Brands book me when they want a warm, unscripted voice rather than a polished ad read.";

const REQUIREMENTS = [
  "Vertical",
  "15–30 seconds",
  "Good lighting",
  "Clear audio",
  "Clean background",
  "No watermark",
];

const TIPS = [
  "Shoot at eye level and fill the frame with your face and shoulders.",
  "Face a window or a soft light. Avoid backlight.",
  "Say your name, your niche, your languages and where you shoot.",
];

const SAMPLE_SCRIPT =
  "“Hi, I'm Ananya, a beauty and skincare creator from Mumbai. I shoot in Hindi and English, mostly at home with natural light. I make honest reviews, GRWM routines and product demos. If you want a warm, unscripted voice for your brand, let's work together.”";

export type IntroVideoStepProps = {
  disabled: boolean;
  videoPreviewUrl: string | null;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  bio: string;
  onBioChange: (value: string) => void;
};

export function IntroVideoStep({
  disabled,
  videoPreviewUrl,
  uploading,
  fileInputRef,
  onSelectFile,
  confirmed,
  onConfirmedChange,
  bio,
  onBioChange,
}: IntroVideoStepProps) {
  const bioLen = bio.trim().length;
  return (
    <div className="cw-card">
      <div className="cw-video-split">
        <div className="cw-video-preview">
          <CreatorProfileIntroVideoField
            videoPreviewUrl={videoPreviewUrl}
            accept={INTRO_VIDEO_ACCEPT}
            disabled={disabled || uploading}
            uploading={uploading}
            fileInputRef={fileInputRef}
            onSelectFile={onSelectFile}
          />
        </div>

        <div className="cw-video-side">
          <div className="cw-req-card">
            <div className="cw-req-title">Video requirements</div>
            <div className="cw-req-grid">
              {REQUIREMENTS.map((req) => (
                <span key={req} className="cw-req-item">
                  <Check size={13} strokeWidth={3} aria-hidden />
                  {req}
                </span>
              ))}
            </div>
          </div>

          <div className="cw-script">
            <div className="cw-script-title">Sample script</div>
            <p>{SAMPLE_SCRIPT}</p>
          </div>
        </div>
      </div>

      <div className="cw-hr" />

      <div className="cw-facet">
        <div className="cw-facet-label">
          <span>Recording tips</span>
        </div>
        <ul className="cw-tips-list">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className="cw-hr" />

      {/* Creator story */}
      <div className="cw-field">
        <label htmlFor="cw-bio" className="cw-fieldlabel">
          Tell your creator story <span className="cw-req">*</span>
        </label>
        <span className="cw-facet-help">
          Share what you create, the languages you speak and why brands will
          enjoy working with you.
        </span>
        <textarea
          id="cw-bio"
          className="cw-textarea"
          value={bio}
          disabled={disabled}
          rows={5}
          maxLength={BIO_MAX_CHARS}
          placeholder="Start typing…"
          onChange={(e) => onBioChange(e.target.value)}
        />
        <div className="cw-bio-foot">
          <span
            className="cw-bio-count"
            data-short={bioLen > 0 && bioLen < BIO_MIN_CHARS}
          >
            {bioLen} / {BIO_MAX_CHARS} · minimum {BIO_MIN_CHARS} characters
          </span>
          <span className="cw-bio-rule">
            No links, phone numbers, emails, social handles or pricing.
          </span>
        </div>
        <div className="cw-bio-example">
          <span className="cw-bio-example-tag">Example</span>
          {BIO_EXAMPLE}
        </div>
      </div>

      <div className="cw-hr" />

      <label
        className="cw-confirm"
        data-checked={confirmed}
        data-disabled={disabled || !videoPreviewUrl}
      >
        <input
          type="checkbox"
          className="cw-confirm-box"
          checked={confirmed}
          disabled={disabled || !videoPreviewUrl}
          onChange={(e) => onConfirmedChange(e.target.checked)}
        />
        <span className="cw-confirm-tick" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="cw-confirm-text">
          I confirm my intro video meets all the requirements above and does not
          include any brand watermark.
        </span>
      </label>
    </div>
  );
}
