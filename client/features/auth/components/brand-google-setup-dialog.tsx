"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeBrandSetup } from "@/features/auth/api/complete-brand-setup";
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
import {
  identifyPixelUser,
  splitFullName,
  trackPixelCustom,
} from "@/lib/meta-pixel";
import { cn } from "@/lib/utils";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHONE_E164_IN_REGEX = /^\+91[6-9]\d{9}$/;

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const setupSchema = z.object({
  contactPhone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      PHONE_E164_IN_REGEX,
      "Enter a valid 10-digit Indian mobile number",
    ),
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
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: "You must accept the terms",
  }),
  guidelinesAccepted: z.boolean().refine((v) => v === true, {
    message: "You must accept the Brand Guidelines",
  }),
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

  const form = useForm<SetupData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      contactPhone: "",
      website: "",
      termsAccepted: false,
      guidelinesAccepted: false,
    },
  });

  const mutation = useMutation({
    mutationFn: completeBrandSetup,
    onSuccess: async (_data, variables) => {
      identifyPixelUser({
        email: user.email,
        ...splitFullName(user.name ?? variables.contactFullName),
        phone: variables.contactPhone,
      });
      trackPixelCustom("BrandRegistration", {
        phone: variables.contactPhone,
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
        contactPhone: data.contactPhone.trim(),
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

  const ready = setupSchema.safeParse(form.watch()).success;

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
            <Label htmlFor="setup-phone">
              Phone number <span className="text-red-500">*</span>
            </Label>
            <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-input bg-background">
              <div className="flex items-center border-r border-input bg-muted/50 px-3 text-sm font-semibold text-muted-foreground">
                +91
              </div>
              <Input
                id="setup-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                disabled={pending}
                placeholder="9876543210"
                className="h-full border-0 shadow-none focus-visible:ring-0"
                value={
                  form.watch("contactPhone").startsWith("+91")
                    ? form.watch("contactPhone").slice(3)
                    : form.watch("contactPhone")
                }
                onChange={(e) => {
                  let val = e.target.value;
                  if (val.startsWith("+91")) val = val.slice(3);
                  const digits = val.replace(/\D/g, "").slice(0, 10);
                  form.setValue(
                    "contactPhone",
                    digits ? `+91${digits}` : "",
                    { shouldValidate: true },
                  );
                }}
              />
            </div>
            <p className="text-[12px] leading-snug text-muted-foreground">
              So we can reach you quickly with support, order updates, and
              help along your creator collaborations.
            </p>
            {form.formState.errors.contactPhone ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.contactPhone.message}
              </p>
            ) : null}
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

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="setup-terms"
                checked={form.watch("termsAccepted")}
                onCheckedChange={(checked) =>
                  form.setValue("termsAccepted", checked === true, {
                    shouldValidate: true,
                  })
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="setup-terms"
                className="text-[13px] font-normal leading-snug text-muted-foreground"
              >
                I agree to the{" "}
                <Link
                  href="/legal/terms"
                  target="_blank"
                  className="font-semibold text-foreground underline"
                >
                  Terms of Service
                </Link>
                {" and "}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="font-semibold text-foreground underline"
                >
                  Privacy Policy
                </Link>
                .
              </Label>
            </div>
            {form.formState.errors.termsAccepted ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.termsAccepted.message}
              </p>
            ) : null}

            <div className="flex items-start gap-3">
              <Checkbox
                id="setup-guidelines"
                checked={form.watch("guidelinesAccepted")}
                onCheckedChange={(checked) =>
                  form.setValue("guidelinesAccepted", checked === true, {
                    shouldValidate: true,
                  })
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="setup-guidelines"
                className="text-[13px] font-normal leading-snug text-muted-foreground"
              >
                I agree to the{" "}
                <Link
                  href="/legal/brand-guidelines"
                  target="_blank"
                  className="font-semibold text-foreground underline"
                >
                  Brand Guidelines
                </Link>
                .
              </Label>
            </div>
            {form.formState.errors.guidelinesAccepted ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.guidelinesAccepted.message}
              </p>
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
