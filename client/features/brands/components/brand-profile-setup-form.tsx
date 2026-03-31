"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { useAuth } from "@/providers/auth-provider";

import {
  createBrandProfile,
  type CreateBrandProfilePayload,
} from "@/features/brands/api/create-brand-profile";
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
  mode: "create";
  onSuccess: () => void;
};

export function BrandProfileSetupForm({
  variant,
  mode,
  onSuccess,
}: BrandProfileSetupFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [pending, setPending] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [pendingLogoKey, setPendingLogoKey] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const handleLogoSelected = useCallback(async (file: File | null) => {
    if (!file) return;
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
      toast.success("Logo uploaded — save your profile to apply.");
    } catch {
      toast.error("Could not upload logo. Try again.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const clearLogo = useCallback(() => {
    setPendingLogoKey(null);
    setLogoPreviewUrl(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (mode !== "create") return;

      const name = companyName.trim();
      if (!name) {
        toast.error("Company name is required");
        return;
      }

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

      if (website.trim() && !normalizeOptionalUrl(website)) {
        toast.error("Website must be a valid http(s) URL");
        return;
      }

      setPending(true);
      try {
        await createBrandProfile(payload);
        await ensureBrandWorkspace();
        await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
        toast.success("Brand profile created");
        onSuccess();
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 409) {
          toast.message("Profile already exists", {
            description: "Continuing to your dashboard.",
          });
          await ensureBrandWorkspace();
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          onSuccess();
          return;
        }
        toast.error("Could not create profile", {
          description: "Check your connection and try again.",
        });
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
                accept={LOGO_ACCEPT}
                className="hidden"
                onChange={(e) =>
                  void handleLogoSelected(e.target.files?.[0] ?? null)
                }
                disabled={pending || uploadingLogo}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={pending || uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                {uploadingLogo ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                {uploadingLogo ? "Uploading…" : "Upload"}
              </Button>
              {(pendingLogoKey || logoPreviewUrl) && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending || uploadingLogo}
                  onClick={clearLogo}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative size-16 overflow-hidden rounded-xl border border-border bg-muted">
              {logoPreviewUrl ? (
                <Image
                  src={logoPreviewUrl}
                  alt="Brand logo preview"
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {logoPreviewUrl
                ? "Preview will be applied on save."
                : "No logo uploaded yet."}
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button type="submit" disabled={pending || uploadingLogo}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
