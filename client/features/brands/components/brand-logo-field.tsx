"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function getInitials(name: string) {
  if (!name || !name.trim()) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function BrandLogoField({
  previewUrl,
  accept,
  disabled,
  uploading,
  fileInputRef,
  onSelectFile,
  onRemove,
  brandName,
}: {
  previewUrl: string | null;
  accept: string;
  disabled: boolean;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File | null) => void;
  onRemove: () => void;
  brandName?: string;
}) {
  const initials = getInitials(brandName || "Brand");

  return (
    <div className="flex flex-row items-center gap-5">
      <div className="relative flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-3xl font-bold tracking-tight text-white shadow-sm ring-1 ring-border/10">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Brand logo preview"
            fill
            className="object-cover"
            sizes="88px"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
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
            variant="outline"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 rounded-[10px] h-[38px] px-4 font-semibold shadow-sm border-[1.4px]"
          >
            {uploading ? (
              <Spinner className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <Upload className="size-[18px]" aria-hidden />
            )}
            {uploading ? "Uploading…" : "Upload logo"}
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={onRemove}
              className="h-[38px] rounded-[10px] px-3 font-semibold text-muted-foreground hover:text-foreground"
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-[12.5px] font-medium text-muted-foreground">
          PNG / SVG • square • min 256x256 • transparent background recommended
        </p>
      </div>
    </div>
  );
}
