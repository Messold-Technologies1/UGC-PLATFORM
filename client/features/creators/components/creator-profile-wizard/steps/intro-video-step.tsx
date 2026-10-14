"use client";

import type { RefObject } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { CreatorProfileIntroVideoField } from "@/features/creators/components/creator-profile-update/creator-profile-intro-video-field";
import { INTRO_VIDEO_ACCEPT } from "@/features/creators/hooks/creator-profile-form-utils";

import {
  CwCard,
  CwConfirm,
  CwFacet,
  CwFacetLabel,
  CwFieldWarn,
  CwHr,
} from "../wizard-ui";
import { DemoVideoGallery } from "./demo-video-gallery";

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
  errors?: { video?: string; confirmed?: string };
};

export function IntroVideoStep({
  disabled,
  videoPreviewUrl,
  uploading,
  fileInputRef,
  onSelectFile,
  confirmed,
  onConfirmedChange,
  errors = {},
}: IntroVideoStepProps) {
  return (
    <CwCard>
      <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-7">
        <div>
          <CreatorProfileIntroVideoField
            videoPreviewUrl={videoPreviewUrl}
            accept={INTRO_VIDEO_ACCEPT}
            disabled={disabled || uploading}
            uploading={uploading}
            fileInputRef={fileInputRef}
            onSelectFile={onSelectFile}
          />
        </div>

        <div className="flex flex-col gap-4">
          {errors.video ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.video}
            </CwFieldWarn>
          ) : null}
          <div className="rounded-xl border border-border px-4 py-3.5">
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Video requirements
            </div>
            <div className="grid grid-cols-2 gap-2 max-[400px]:grid-cols-1">
              {REQUIREMENTS.map((req) => (
                <span
                  key={req}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground"
                >
                  <Check
                    size={13}
                    strokeWidth={3}
                    aria-hidden
                    className="shrink-0 text-primary"
                  />
                  {req}
                </span>
              ))}
            </div>
          </div>

          <CwConfirm
            checked={confirmed}
            disabled={disabled || !videoPreviewUrl}
            onToggle={() => onConfirmedChange(!confirmed)}
            title="My intro video meets the requirements"
            description="It follows the checklist above and does not include any brand watermark."
          />

          {errors.confirmed ? (
            <CwFieldWarn>
              <AlertTriangle size={13} aria-hidden />
              {errors.confirmed}
            </CwFieldWarn>
          ) : null}
          <div className="rounded-xl border border-border px-4 py-3.5">
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Sample script
            </div>
            <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
              {SAMPLE_SCRIPT}
            </p>
          </div>
        </div>
      </div>

      <CwHr />

      <DemoVideoGallery />

      <CwHr />

      <CwFacet>
        <CwFacetLabel>
          <span>Recording tips</span>
        </CwFacetLabel>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-[13px] leading-normal text-muted-foreground">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </CwFacet>
    </CwCard>
  );
}
