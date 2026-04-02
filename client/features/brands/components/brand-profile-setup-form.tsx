"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { useAuth } from "@/providers/auth-provider";

import type { BrandProfileItemApi } from "@/features/brands/api/types";
import {
  createBrandProfile,
  type CreateBrandProfilePayload,
} from "@/features/brands/api/create-brand-profile";
import {
  updateBrandProfile,
  type UpdateBrandProfilePayload,
} from "@/features/brands/api/update-brand-profile";
import {
  brandProfileMeQueryKey,
  fetchBrandProfileMe,
} from "@/features/brands/api/fetch-brand-profile-me";
import {
  presignBrandLogoUpload,
  putFileToPresignedUrl,
} from "@/features/brands/api/presign-brand-logo-upload";

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
};

export function BrandProfileSetupForm({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
}: BrandProfileSetupFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [pending, setPending] = useState(false);
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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (!initialProfile) return;
    setCompanyName(initialProfile.companyName ?? "");
    setWebsite(initialProfile.website ?? "");
    setIndustry(initialProfile.industry ?? "");
    setContactPerson(initialProfile.contactPerson ?? "");
    setLogoPreviewUrl(initialProfile.logoUrl ?? null);
    setPendingLogoKey(initialProfile.logoKey ?? null);
    initializedRef.current = true;
  }, [initialProfile]);

  const ensureBrandWorkspace = useCallback(
    () => ensureWorkspaceSelection(queryClient, user, "BRAND"),
    [queryClient, user],
  );

  const title = useMemo(() => {
    if (variant === "settings") return "Edit your brand profile";
    return "Set up your brand profile";
  }, [variant]);

  const description = useMemo(() => {
    if (variant === "settings") {
      return "Update your company details and logo.";
    }
    return "Add your company details so creators know who they’re working with.";
  }, [variant]);

  const handleLogoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const ok = await ensureBrandWorkspace();
      if (!ok) return;
      if (!LOGO_ACCEPT.split(",").includes(file.type)) {
        toast.error("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error("Logo must be 8 MB or smaller.");
        return;
      }
      setUploadingLogo(true);
      try {
        const presign = await presignBrandLogoUpload({
          contentType: file.type,
          contentLength: file.size,
        });
        await putFileToPresignedUrl(file, presign);
        setPendingLogoKey(presign.key);
        setLogoPreviewUrl(presign.cdnUrl);
        toast.success(
          mode === "update"
            ? "Logo uploaded — update your profile to apply."
            : "Logo uploaded — create your profile to apply.",
        );
      } catch {
        toast.error("Could not upload logo. Try again.");
      } finally {
        setUploadingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [ensureBrandWorkspace, mode],
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

      setPending(true);
      try {
        const ok = await ensureBrandWorkspace();
        if (!ok) return;

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
          await createBrandProfile(payload);
          toast.success("Brand profile created");
        } else {
          const payload: UpdateBrandProfilePayload = {
            companyName: name,
            logoKey: pendingLogoKey,
            website: normalizeOptionalUrl(website) ?? null,
            industry: normalizeOptionalString(industry) ?? null,
            contactPerson: normalizeOptionalString(contactPerson) ?? null,
          };
          await updateBrandProfile(payload);
          toast.success("Brand profile updated");
        }

        await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
        await queryClient.invalidateQueries({
          queryKey: brandProfileMeQueryKey,
        });
        onSuccess();
        if (mode === "create") {
          router.replace("/brand/account");
        }
      } catch (err) {
        if (
          mode === "create" &&
          isAxiosError(err) &&
          err.response?.status === 409
        ) {
          toast.message("Profile already exists", {
            description: "Continuing to your dashboard.",
          });
          const ok = await ensureBrandWorkspace();
          if (!ok) return;
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          onSuccess();
          router.replace("/brand/account");
          return;
        }

        if (
          mode === "create" &&
          isAxiosError(err) &&
          (err.response?.status ?? 0) >= 500
        ) {
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          await queryClient.invalidateQueries({
            queryKey: brandProfileMeQueryKey,
          });
          try {
            await queryClient.fetchQuery({
              queryKey: brandProfileMeQueryKey,
              queryFn: fetchBrandProfileMe,
            });
            toast.message("Brand profile created", {
              description: "Continuing to your dashboard.",
            });
            onSuccess();
            router.replace("/brand/account");
            return;
          } catch {
            // If the profile still doesn't exist, fall through to the generic error.
          }
        }

        toast.error(
          mode === "update"
            ? "Could not update profile"
            : "Could not create profile",
          {
            description: "Check your connection and try again.",
          },
        );
      } finally {
        setPending(false);
      }
    },
    [
      mode,
      companyName,
      pendingLogoKey,
      website,
      industry,
      contactPerson,
      ensureBrandWorkspace,
      queryClient,
      onSuccess,
      router,
    ],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
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
