"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { User, Camera } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MAX_PROFILE_IMAGE_BYTES } from "@/features/creators/hooks/use-creator-profile-image";

const PROFILE_IMAGE_MAX_MB = MAX_PROFILE_IMAGE_BYTES / (1024 * 1024);

export function CreatorProfileImageField({
  imagePreviewUrl,
  accept,
  disabled,
  uploading,
  fileInputRef,
  onSelectFile,
}: {
  imagePreviewUrl: string | null;
  accept: string;
  disabled: boolean;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
}) {
  return (
    <div className="pe-media-field">
      <div className="pe-media-field-preview pe-media-field-preview--photo">
        {imagePreviewUrl ? (
          <Image
            src={imagePreviewUrl}
            alt="Profile"
            fill
            style={{ objectFit: "cover" }}
          />
        ) : (
          <User
            size={32}
            style={{ color: "white", opacity: 0.9 }}
            aria-hidden
          />
        )}
      </div>

      <div className="pe-media-field-actions">
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            onSelectFile(file ?? null);
          }}
        />

        <button
          type="button"
          className="pe-media-field-btn"
          disabled={disabled}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {uploading ? (
            <Spinner className="size-3.5" aria-hidden />
          ) : (
            <Camera size={14} aria-hidden />
          )}
          {imagePreviewUrl ? "Change photo" : "Upload photo"}
        </button>
      </div>
      <p className="pe-media-field-hint">
        JPG, PNG, WEBP, or HEIC · Max {PROFILE_IMAGE_MAX_MB} MB
      </p>
    </div>
  );
}
