"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

export type { BrandProfileSetupFormProps } from "./brand-profile-setup-form";

export const BrandProfileSetupForm = dynamic(
  () =>
    import("./brand-profile-setup-form").then((m) => ({
      default: m.BrandProfileSetupForm,
    })),
  {
    loading: () => (
      <div
        className="flex min-h-[min(320px,50vh)] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Spinner className="size-8 text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading brand profile form…</span>
      </div>
    ),
  },
);

