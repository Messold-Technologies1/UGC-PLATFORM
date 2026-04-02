"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BrandLogoField({
  previewUrl,
  accept,
  disabled,
  uploading,
  fileInputRef,
  onSelectFile,
  onRemove,
}: {
  previewUrl: string | null;
  accept: string;
  disabled: boolean;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Logo</p>
          <p className="text-xs text-muted-foreground">
            Upload a square image for best results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative size-16 overflow-hidden rounded-xl border border-border bg-muted">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Brand logo preview"
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {previewUrl
            ? "Preview will be applied on create."
            : "No logo uploaded yet."}
        </p>
      </div>
    </section>
  );
}
