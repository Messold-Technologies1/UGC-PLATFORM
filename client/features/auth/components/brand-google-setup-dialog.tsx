"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeBrandSetup } from "@/features/auth/api/complete-brand-setup";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import {
  authMeQueryKey,
  fetchAuthMe,
  type AuthUser,
} from "@/features/auth/hooks/use-me-query";
import {
  putFileToPresignedUrl,
  presignBrandLogoUpload,
} from "@/features/brands/api/presign-brand-logo-upload";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { trackBrandRegistration } from "@/features/auth/lib/track-signup-events";
import { cn } from "@/lib/utils";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const setupSchema = z.object({
  website: z
    .string()
    .optional()
    .refine((v) => {
      if (!v?.trim()) return true;
      try {
        const u = new URL(normalizeWebsite(v));
        return Boolean(u.hostname.includes("."));
      } catch {
        return false;
      }
    }, "Enter a valid website URL"),
  // Terms of Service + Privacy Policy are accepted on the main signup page, so
  // no policy checkboxes are collected here.
});

type SetupData = z.infer<typeof setupSchema>;

type BrandGoogleSetupDialogProps = {
  open: boolean;
  user: AuthUser;
  callbackUrl?: string | null;
};

export function BrandGoogleSetupDialog({
  open,
  user,
  callbackUrl,
}: BrandGoogleSetupDialogProps) {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Phone is entered + OTP-verified via PhoneVerificationField, which saves the
  // number + phoneVerified on the user server-side; we keep the verified value
  // here to submit as the brand contact phone.
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const form = useForm<SetupData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      website: "",
    },
  });

  const mutation = useMutation({
    mutationFn: completeBrandSetup,
    onSuccess: async (_data, variables) => {
      // Brand signup conversion (brand dataset). This is the Google route —
      // the email+password route creates the brand profile at role choice and
      // reports it from there.
      trackBrandRegistration({
        email: user.email,
        name: user.name ?? variables.contactFullName,
        phone: variables.contactPhone,
        ...(variables.brandName ? { brandName: variables.brandName } : {}),
        ...(variables.website ? { website: variables.website } : {}),
      });
      toast.success("Brand profile ready");
      const refreshed = await queryClient.fetchQuery({
        queryKey: authMeQueryKey,
        queryFn: fetchAuthMe,
      });
      const target = refreshed
        ? resolveImmediatePostAuthPath(refreshed, callbackUrl ?? null)
        : "/brand/creators";
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => {
      const msg = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof msg === "string" && msg.trim()
          ? msg
          : "Could not finish brand setup. Try again.",
      );
    },
  });

  const pending = mutation.isPending || uploading;

  const handleLogo = useCallback((file: File | null) => {
    if (!file) return;
    if (
      !ACCEPTED_LOGO_TYPES.includes(
        file.type as (typeof ACCEPTED_LOGO_TYPES)[number],
      )
    ) {
      setLogoError("Logo must be JPEG, PNG, or WebP");
      setLogoFile(null);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 5MB or smaller");
      setLogoFile(null);
      return;
    }
    setLogoFile(file);
    setLogoError(null);
  }, []);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!phoneVerified || !verifiedPhone) {
      toast.error("Please verify your mobile number first.");
      return;
    }
    setUploading(true);
    try {
      let logoKey: string | undefined;
      if (logoFile) {
        const presign = await presignBrandLogoUpload({
          contentType: logoFile.type,
          contentLength: logoFile.size,
        });
        await putFileToPresignedUrl(logoFile, presign);
        logoKey = presign.key;
      }

      mutation.mutate({
        contactFullName: user.name?.trim() || user.email.split("@")[0] || "Brand",
        contactPhone: verifiedPhone,
        ...(data.website?.trim()
          ? { website: normalizeWebsite(data.website) }
          : {}),
        ...(logoKey ? { logoKey } : {}),
      });
    } catch {
      toast.error("Could not upload logo. Try again.");
    } finally {
      setUploading(false);
    }
  });

  const ready = setupSchema.safeParse(form.watch()).success && phoneVerified;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Finish your brand profile</DialogTitle>
          <DialogDescription>
            Signed in as {user.email}
            {user.name ? ` (${user.name})` : ""}. Two quick details so we can
            support you — you can add your brand name later in settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>
              Phone number <span className="text-red-500">*</span>
            </Label>
            <PhoneVerificationField
              idPrefix="brand-setup"
              disabled={pending}
              onVerifiedChange={setPhoneVerified}
              onVerifiedPhone={setVerifiedPhone}
            />
            <p className="text-[12px] leading-snug text-muted-foreground">
              So we can reach you quickly with support, order updates, and
              help along your creator collaborations. Verify it to continue.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-website">Website URL (optional)</Label>
            <Input
              id="setup-website"
              type="url"
              inputMode="url"
              autoComplete="url"
              disabled={pending}
              placeholder="https://yourbrand.com"
              {...form.register("website")}
            />
            <p className="text-[12px] leading-snug text-muted-foreground">
              Gives creators a window into your world — products, vibe, and
              what you stand for. You can add this later from settings.
            </p>
            {form.formState.errors.website ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.website.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Brand logo (optional)</Label>
            {logoFile ? (
              <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="truncate text-sm">{logoFile.name}</span>
                <button
                  type="button"
                  onClick={() => setLogoFile(null)}
                  aria-label="Remove logo"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                <Upload size={16} />
                Upload logo
                <input
                  type="file"
                  accept={ACCEPTED_LOGO_TYPES.join(",")}
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <p className="text-[12px] leading-snug text-muted-foreground">
              Helps creators recognise your brand at a glance. You can add
              this later from settings.
            </p>
            {logoError ? (
              <p className="text-xs text-red-500">{logoError}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={!ready || pending}
            className={cn(
              "h-11 w-full rounded-full font-bold",
              ready
                ? "bg-[#3e76ef] text-white hover:bg-[#2d5cc5]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {pending ? (
              <>
                <Spinner className="size-4" aria-hidden />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
