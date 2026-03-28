"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export type { CreatorProfileSetupFormProps } from "./creator-profile-setup-form";

export const CreatorProfileSetupForm = dynamic(
  () =>
    import("./creator-profile-setup-form").then((m) => ({
      default: m.CreatorProfileSetupForm,
    })),
  {
    loading: () => (
      <div
        className="flex min-h-[min(320px,50vh)] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <span className="sr-only">Loading profile form…</span>
      </div>
    ),
  },
);
