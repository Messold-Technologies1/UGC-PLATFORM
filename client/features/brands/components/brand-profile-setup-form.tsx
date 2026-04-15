"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  useSubmitBrandProfileMutation,
  useUploadBrandLogoMutation,
} from "@/features/brands/hooks/use-brand-profile-form-mutation";

import type { BrandProfileItemApi } from "@/features/brands/api/types";
import {
  type CreateBrandProfilePayload,
} from "@/features/brands/api/create-brand-profile";
import {
  type UpdateBrandProfilePayload,
} from "@/features/brands/api/update-brand-profile";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function normalizeOptionalString(raw: string): string | undefined {
  const t = raw.trim();
  return t ? t : undefined;
}

function normalizeOptionalUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export type BrandProfileSetupFormProps = {
  variant: "onboarding" | "settings";
  mode: "create" | "update";
  initialProfile?: BrandProfileItemApi | null;
  onSuccess: () => void;
  onPendingChange?: (pending: boolean) => void;
};

export function BrandProfileSetupForm({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
  onPendingChange,
}: BrandProfileSetupFormProps) {
  const formKey = `${mode}:${initialProfile?.id ?? "new"}`;

  return (
    <BrandProfileSetupFormContent
      key={formKey}
      variant={variant}
      mode={mode}
      initialProfile={initialProfile}
      onSuccess={onSuccess}
      onPendingChange={onPendingChange}
    />
  );
}

function BrandProfileSetupFormContent({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
  onPendingChange,
}: BrandProfileSetupFormProps) {
  const [companyName, setCompanyName] = useState(
    initialProfile?.companyName ?? "",
  );
  const [website, setWebsite] = useState(initialProfile?.website ?? "");
  const [industry, setIndustry] = useState(initialProfile?.industry ?? "");
  const [contactPerson, setContactPerson] = useState(
    initialProfile?.contactPerson ?? "",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initialProfile?.logoUrl ?? null,
  );
  const [pendingLogoKey, setPendingLogoKey] = useState<string | null>(
    initialProfile?.logoKey ?? null,
  );
  const uploadBrandLogoMutation = useUploadBrandLogoMutation(mode);
  const submitBrandProfileMutation = useSubmitBrandProfileMutation({
    mode,
    onSuccess,
  });
  const pending = submitBrandProfileMutation.isPending;
  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);
  const uploadingLogo = uploadBrandLogoMutation.isPending;

  const title = useMemo(() => {
    if (mode === "update") return "Edit your brand profile";
    if (variant === "settings") return "Add your brand profile";
    return "Set up your brand profile";
  }, [mode, variant]);

  const description = useMemo(() => {
    if (mode === "update") {
      return "Update your company details and logo.";
    }
    if (variant === "settings") {
      return "Add your company details and logo.";
    }
    return "Add your company details so creators know who they’re working with.";
  }, [mode, variant]);

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(companyName.trim()),
      Boolean(website.trim()),
      Boolean(industry.trim()),
      Boolean(contactPerson.trim()),
      Boolean(logoPreviewUrl || pendingLogoKey),
    ];
    const completed = checkpoints.filter(Boolean).length;
    const total = checkpoints.length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [
    companyName,
    website,
    industry,
    contactPerson,
    logoPreviewUrl,
    pendingLogoKey,
  ]);

  const handleLogoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;

      if (!LOGO_ACCEPT.split(",").includes(file.type)) {
        toast.error("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error("Logo must be 8 MB or smaller.");
        return;
      }

      uploadBrandLogoMutation.mutate(file, {
        onSuccess: (result) => {
          if (!result) {
            return;
          }

          setPendingLogoKey(result.key);
          setLogoPreviewUrl(result.cdnUrl);
        },
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      });
    },
    [uploadBrandLogoMutation],
  );

  const clearLogo = useCallback(() => {
    setPendingLogoKey(null);
    setLogoPreviewUrl(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();

      const name = companyName.trim();
      if (!name) {
        toast.error("Company name is required");
        return;
      }

      if (website.trim() && !normalizeOptionalUrl(website)) {
        toast.error("Website must be a valid http(s) URL");
        return;
      }

      if (mode === "create") {
        const payload: CreateBrandProfilePayload = {
          companyName: name,
          ...(pendingLogoKey ? { logoKey: pendingLogoKey } : {}),
          ...(normalizeOptionalUrl(website)
            ? { website: normalizeOptionalUrl(website) }
            : {}),
          ...(normalizeOptionalString(industry)
            ? { industry: normalizeOptionalString(industry) }
            : {}),
          ...(normalizeOptionalString(contactPerson)
            ? { contactPerson: normalizeOptionalString(contactPerson) }
            : {}),
        };

        submitBrandProfileMutation.mutate({ payload });
        return;
      }

      const payload: UpdateBrandProfilePayload = {
        companyName: name,
        logoKey: pendingLogoKey,
        website: normalizeOptionalUrl(website) ?? null,
        industry: normalizeOptionalString(industry) ?? null,
        contactPerson: normalizeOptionalString(contactPerson) ?? null,
      };

      submitBrandProfileMutation.mutate({ payload });
    },
    [
      mode,
      companyName,
      pendingLogoKey,
      website,
      industry,
      contactPerson,
      submitBrandProfileMutation,
    ],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Profile completion
              </p>
              <p className="text-xs text-muted-foreground">
                {completionSummary.completed} of {completionSummary.total} brand
                details added
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {completionSummary.percent}%
            </p>
          </div>
          <Progress
            value={completionSummary.percent}
            aria-label="Brand profile completion"
            className="mt-3 h-1"
          />
        </div>
      </header>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="grid gap-2">
          <Label htmlFor="brand-company-name">Company name</Label>
          <Input
            id="brand-company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            autoComplete="organization"
            disabled={pending}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="brand-website">Website (optional)</Label>
          <Input
            id="brand-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
            autoComplete="url"
            inputMode="url"
            disabled={pending}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="brand-industry">Industry (optional)</Label>
            <Input
              id="brand-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Skincare"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="brand-contact-person">
              Contact person (optional)
            </Label>
            <Input
              id="brand-contact-person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Jane (Marketing Lead)"
              disabled={pending}
            />
          </div>
        </div>

        <BrandLogoField
          previewUrl={logoPreviewUrl}
          accept={LOGO_ACCEPT}
          disabled={pending || uploadingLogo}
          uploading={uploadingLogo}
          fileInputRef={fileInputRef}
          onSelectFile={(file) => void handleLogoSelected(file)}
          onRemove={clearLogo}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button type="submit" disabled={pending || uploadingLogo}>
            {pending
              ? mode === "update"
                ? "Saving…"
                : "Creating…"
              : mode === "update"
                ? "Save changes"
                : "Create profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
