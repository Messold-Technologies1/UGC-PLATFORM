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
import { completeAgencySetup } from "@/features/auth/api/complete-agency-setup";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { FieldWarn } from "@/features/auth/components/field-warn";
import {
  authMeQueryKey,
  fetchAuthMe,
  type AuthUser,
} from "@/features/auth/hooks/use-me-query";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { presignAgencyLogoUpload } from "@/features/agency/api/presign-agency-logo-upload";
import { putFileToPresignedUrl } from "@/features/brands/api/presign-brand-logo-upload";
import { beginClientNavigation } from "@/lib/client-navigation-state";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const setupSchema = z.object({
  name: z.string().trim().min(2, "Enter your agency name").max(200),
  website: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      try {
        const url = new URL(normalizeWebsite(value));
        return Boolean(url.hostname.includes("."));
      } catch {
        return false;
      }
    }, "Enter a valid website URL"),
});

type SetupData = z.infer<typeof setupSchema>;

type AgencySetupDialogProps = {
  open: boolean;
  user: AuthUser;
  callbackUrl?: string | null;
};

export function AgencySetupDialog({
  open,
  user,
  callbackUrl,
}: AgencySetupDialogProps) {
  const queryClient = useQueryClient();
  const existingPhone = user.phone?.trim() || null;
  const needsPhone = !existingPhone;
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneWarned, setPhoneWarned] = useState(false);

  const form = useForm<SetupData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      website: "",
    },
  });

  const mutation = useMutation({
    mutationFn: completeAgencySetup,
    onSuccess: async () => {
      toast.success("Agency profile ready");
      const refreshed = await queryClient.fetchQuery({
        queryKey: authMeQueryKey,
        queryFn: fetchAuthMe,
      });
      const target = refreshed
        ? resolveImmediatePostAuthPath(refreshed, callbackUrl ?? null)
        : "/agency/creators";
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof message === "string" && message.trim()
          ? message
          : "Could not finish agency setup. Try again.",
      );
    },
  });

  const pending = mutation.isPending || uploading;

  const handleVerifiedChange = useCallback((verified: boolean) => {
    setPhoneVerified(verified);
    if (verified) setPhoneWarned(false);
  }, []);

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
    if (needsPhone && (!phoneVerified || !verifiedPhone)) {
      setPhoneWarned(true);
      document.getElementById("agency-setup-phone")?.focus();
      toast.error(
        phoneOtpSent
          ? "Enter the code sent to your phone and click Verify."
          : "Please verify your number. Click Send OTP.",
      );
      return;
    }

    setPhoneWarned(false);
    setUploading(true);
    try {
      let logoKey: string | undefined;
      if (logoFile) {
        const presign = await presignAgencyLogoUpload({
          contentType: logoFile.type,
          contentLength: logoFile.size,
        });
        await putFileToPresignedUrl(logoFile, presign);
        logoKey = presign.key;
      }

      mutation.mutate({
        name: data.name.trim(),
        ...(existingPhone
          ? { contactPhone: existingPhone }
          : verifiedPhone
            ? { contactPhone: verifiedPhone }
            : {}),
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

  const ready = setupSchema.safeParse(form.watch()).success && (!needsPhone || phoneVerified);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Finish your agency profile</DialogTitle>
          <DialogDescription>
            Signed in as {user.email}
            {user.name ? ` (${user.name})` : ""}. Add your agency details so we
            can set up your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="agency-setup-name">
              Agency name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agency-setup-name"
              disabled={pending}
              placeholder="Northstar Media"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <FieldWarn>{form.formState.errors.name.message}</FieldWarn>
            ) : null}
          </div>

          {needsPhone ? (
            <div className="space-y-1.5">
              <Label>
                Contact phone <span className="text-red-500">*</span>
              </Label>
              <PhoneVerificationField
                idPrefix="agency-setup"
                disabled={pending}
                invalid={phoneWarned}
                onVerifiedChange={handleVerifiedChange}
                onOtpSentChange={setPhoneOtpSent}
                onVerifiedPhone={setVerifiedPhone}
              />
              <p className="text-[12px] leading-snug text-muted-foreground">
                Verify a number so your clients and support team can reach you.
              </p>
              {phoneWarned ? (
                <FieldWarn>
                  {phoneOtpSent
                    ? "Enter the code sent to your phone and click Verify."
                    : "Please verify your number. Click Send OTP."}
                </FieldWarn>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">
                Contact phone
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {existingPhone}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="agency-setup-website">Website URL (optional)</Label>
            <Input
              id="agency-setup-website"
              type="url"
              inputMode="url"
              autoComplete="url"
              disabled={pending}
              placeholder="https://youragency.com"
              {...form.register("website")}
            />
            {form.formState.errors.website ? (
              <FieldWarn>{form.formState.errors.website.message}</FieldWarn>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency-setup-logo">Logo (optional)</Label>
            <input
              id="agency-setup-logo"
              type="file"
              accept={ACCEPTED_LOGO_TYPES.join(",")}
              className="hidden"
              disabled={pending}
              onChange={(event) => handleLogo(event.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => document.getElementById("agency-setup-logo")?.click()}
              >
                <Upload className="mr-2 size-4" aria-hidden />
                Upload logo
              </Button>
              {logoFile ? (
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoError(null);
                  }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                  Remove
                </button>
              ) : null}
            </div>
            {logoFile ? (
              <p className="text-xs text-muted-foreground">{logoFile.name}</p>
            ) : null}
            {logoError ? <FieldWarn>{logoError}</FieldWarn> : null}
          </div>

          <Button type="submit" className="w-full" disabled={pending || !ready}>
            {pending ? (
              <>
                <Spinner className="mr-2 size-4" aria-hidden />
                Setting up...
              </>
            ) : (
              "Finish agency setup"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
