"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { User, Camera } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 160,
          position: "relative",
          aspectRatio: "1/1",
          borderRadius: 24,
          overflow: "hidden",
          background: "var(--brand-gradient)",
          display: "grid",
          placeItems: "center",
        }}
      >
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

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
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
          disabled={disabled}
          onClick={() => {
            fileInputRef.current?.click();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 36,
            padding: "0 13px",
            borderRadius: 10,
            border: "1.4px solid var(--border)",
            background: "var(--card)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--foreground)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: "background 0.14s",
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
    </div>
  );
}
