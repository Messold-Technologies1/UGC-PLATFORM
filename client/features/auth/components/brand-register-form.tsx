"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Check, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldWarn } from "@/features/auth/components/field-warn";
import {
  presignBrandSignupLogo,
  putBlobToPresignedUrl,
  registerBrand,
} from "@/features/auth/api/brand-signup";
import { authMeQueryKey, type AuthUser } from "@/features/auth/hooks/use-me-query";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { startGoogleOAuth } from "@/features/auth/lib/start-google-oauth";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import {
  identifyPixelUser,
  splitFullName,
  trackPixelCustom,
} from "@/lib/meta-pixel";
import { cn } from "@/lib/utils";
import { GoogleMark } from "@/features/auth/components/google-mark";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHONE_E164_IN_REGEX = /^\+91[6-9]\d{9}$/;

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const brandSignupSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  contactFullName: z.string().min(1, "Contact name is required"),
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
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
  guidelinesAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the Brand Guidelines",
  }),
});

type BrandSignupData = z.infer<typeof brandSignupSchema>;

/** Uppercase micro-label used across the brand signup surface. */
export const brandEyebrow =
  "font-heading text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground";

const BRAND_TRUST = [
  "Free to explore",
  "No payment to browse",
  "Pricing visible upfront",
];

/** Strength-bar colour by score, per the design. */
const PASSWORD_BAR_COLOR: Record<number, string> = {
  1: "bg-ash-300",
  2: "bg-plum-500",
  3: "bg-plum-700",
};

const PASSWORD_HINTS = [
  "8+ characters, a number and a symbol",
  "Add a number and a symbol",
  "Add a symbol",
  "Strong password",
];

/** Display-only score: length, letters+digits, symbol. */
function scorePassword(value: string): number {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

/** Two-step wizard, applied at every breakpoint. */
const STEP_TITLES = ["Account", "Brand"] as const;
const STEP_FIELDS: (keyof BrandSignupData)[][] = [
  ["email", "password"],
  [
    "contactFullName",
    "contactPhone",
    "website",
    "termsAccepted",
    "guidelinesAccepted",
  ],
];
const LAST_STEP = STEP_TITLES.length - 1;

const labelClassName =
  "mb-[7px] block text-[13.5px] font-semibold text-foreground";

const helpClassName = "mt-[7px] text-[12.5px] leading-[1.45] text-muted-foreground";

const inputClassName =
  "h-auto w-full rounded-[11px] border border-foreground/16 bg-white px-[15px] py-[13px] text-[15.5px] text-foreground placeholder:text-foreground/32 transition-[border-color,box-shadow] hover:border-foreground/30 focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-plum-700/14";

const prefixedFieldClassName =
  "flex items-stretch overflow-hidden rounded-[11px] border border-foreground/16 bg-white transition-[border-color,box-shadow] hover:border-foreground/30 focus-within:border-foreground focus-within:ring-[3px] focus-within:ring-plum-700/14";

function readApiErrorMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;

  const data = error.response?.data;
  if (typeof data === "string") return data;

  const message = (data as { message?: unknown } | undefined)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message.find((item): item is string => typeof item === "string");
  }

  return undefined;
}

function brandSignupErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) {
      return "An account with this email already exists.";
    }
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait before trying again.";
    }
    if (error.response?.status === 503) {
      return "This service is temporarily unavailable.";
    }
  }

  return readApiErrorMessage(error) ?? fallback;
}

function validateLogoFile(file: File): string | null {
  if (
    !ACCEPTED_LOGO_TYPES.includes(
      file.type as (typeof ACCEPTED_LOGO_TYPES)[number],
    )
  ) {
    return "Logo must be JPEG, PNG, or WebP";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 5MB or smaller";
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BrandRegisterForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const form = useForm<BrandSignupData>({
    resolver: zodResolver(brandSignupSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      contactFullName: "",
      contactPhone: "",
      website: "",
      termsAccepted: false,
      guidelinesAccepted: false,
    },
  });

  const registerBrandMutation = useMutation({
    mutationKey: ["auth", "register", "brand"],
    mutationFn: registerBrand,
    onSuccess: (result, variables) => {
      identifyPixelUser({
        email: variables.email,
        ...splitFullName(variables.contactFullName),
        phone: variables.contactPhone,
      });
      trackPixelCustom("BrandRegistration", {
        phone: variables.contactPhone,
        ...(variables.website?.trim()
          ? { website: normalizeWebsite(variables.website) }
          : {}),
      });
      toast.success("Brand profile created");
      queryClient.setQueryData(authMeQueryKey, result.user);
      const callback = searchParams.get("callbackUrl");
      const target = resolveImmediatePostAuthPath(
        result.user as AuthUser,
        callback,
      );
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => {
      toast.error(
        brandSignupErrorMessage(
          error,
          "Could not create brand profile. Please try again.",
        ),
      );
    },
  });

  const pendingSubmit = registerBrandMutation.isPending || isUploading;
  const pendingAny = pendingSubmit || googleLoading;

  /* All display-only. Submission still gates on pendingAny and the zod
     resolver, and handleNextStep still gates steps via form.trigger(). */
  const watchedEmail = form.watch("email");
  const watchedPassword = form.watch("password");
  const passwordScore = scorePassword(watchedPassword || "");
  const stepOneReady =
    Boolean(watchedEmail) &&
    Boolean(watchedPassword) &&
    !form.formState.errors.email &&
    !form.formState.errors.password;
  const formIsValid = form.formState.isValid;

  const handleNextStep = useCallback(async () => {
    const valid = await form.trigger(STEP_FIELDS[currentStep]);
    if (!valid) return;
    setCurrentStep((step) => Math.min(step + 1, LAST_STEP));
  }, [form, currentStep]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

  const handleLogoFile = useCallback((file: File | null) => {
    if (!file) return;
    const error = validateLogoFile(file);
    if (error) {
      setLogoFile(null);
      setLogoError(error);
      toast.error(error);
      return;
    }
    setLogoFile(file);
    setLogoError(null);
  }, []);

  const clearLogo = useCallback(() => {
    setLogoFile(null);
    setLogoError(null);
  }, []);

  const onSubmit = form.handleSubmit(async (data) => {
    setIsUploading(true);
    try {
      let logoKey: string | undefined;
      if (logoFile) {
        const email = data.email.trim().toLowerCase();
        const presign = await presignBrandSignupLogo({
          email,
          contentType: logoFile.type,
          contentLength: logoFile.size,
        });
        await putBlobToPresignedUrl(logoFile, presign);
        logoKey = presign.key;
      }

      const website = data.website?.trim();
      registerBrandMutation.mutate({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        contactFullName: data.contactFullName.trim(),
        contactPhone: data.contactPhone.trim(),
        ...(website ? { website: normalizeWebsite(website) } : {}),
        ...(logoKey ? { logoKey } : {}),
      });
    } catch (error) {
      toast.error(
        brandSignupErrorMessage(error, "Could not upload logo. Try again."),
      );
    } finally {
      setIsUploading(false);
    }
  });

  const handleGoogleSignup = () => {
    // Terms / Brand Guidelines are collected on /register/brand/complete after
    // Google returns — that's when the brand profile is actually created.
    setGoogleLoading(true);
    startGoogleOAuth({
      role: "BRAND",
      callbackUrl: searchParams.get("callbackUrl"),
    });
  };

  if (!showEmailForm) {
    return (
      <div>
        <div className={`${brandEyebrow} mb-[18px]`}>
          Choose how you want to sign up
        </div>
        <div className="flex flex-col gap-[11px]">
          <button
            type="button"
            disabled={pendingAny}
            onClick={() => setShowEmailForm(true)}
            className="bg-plum-700 border-plum-700 cursor-pointer rounded-xl border p-4 text-[15.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Sign up with email
          </button>

          <button
            type="button"
            disabled={pendingAny}
            onClick={handleGoogleSignup}
            className="border-foreground/16 hover:bg-plum-50 hover:border-foreground/30 text-foreground flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border bg-white p-[15px] text-[15px] font-semibold transition-colors disabled:opacity-60"
          >
            {googleLoading ? (
              <Spinner className="size-4" aria-hidden />
            ) : (
              <GoogleMark className="size-[17px] shrink-0" />
            )}
            Sign up with Google
          </button>
        </div>

        <div className="border-foreground/10 mt-6 flex flex-wrap gap-x-[22px] gap-y-[9px] border-t pt-[22px]">
          {BRAND_TRUST.map((t) => (
            <span
              key={t}
              className="text-muted-foreground inline-flex items-center gap-[7px] text-[12.5px]"
            >
              <Check className="text-plum-700 size-[11px] shrink-0" strokeWidth={3.2} />
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const onStepOne = currentStep === 0;

  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-col">
      {/* Step header */}
      <div className="border-foreground/10 mb-[26px] flex flex-wrap items-center justify-between gap-3.5 border-b pb-[18px]">
        <button
          type="button"
          onClick={() => (onStepOne ? setShowEmailForm(false) : handlePrevStep())}
          className="text-muted-foreground hover:text-foreground cursor-pointer text-[13.5px] font-semibold transition-colors"
        >
          {onStepOne ? "← Other signup options" : "← Back to account details"}
        </button>
        <div className="flex items-center gap-2.5">
          <span className={brandEyebrow}>
            Step {currentStep + 1} of {STEP_TITLES.length}
          </span>
          <span className="flex gap-[5px]">
            {STEP_TITLES.map((title, i) => (
              <span
                key={title}
                className={cn(
                  "h-[3px] w-5 rounded-full",
                  i <= currentStep ? "bg-plum-700" : "bg-ash-150",
                )}
              />
            ))}
          </span>
        </div>
      </div>

      {/* Step intro */}
      <div className="mb-[clamp(24px,3vw,30px)]">
        <div className="mb-[7px] flex items-center gap-2.5">
          <span className="font-heading text-plum-700 text-[11px] font-bold">
            {onStepOne ? "01" : "02"}
          </span>
          <span className="font-heading text-[17px] font-bold tracking-[-0.02em]">
            {onStepOne ? "Secure your account" : "About your brand"}
          </span>
        </div>
        <p className="text-muted-foreground text-[14.5px] leading-[1.55] text-pretty">
          {onStepOne
            ? "Just your login details for now — brand information comes next."
            : "Two required details, then you’re in. Website and logo are optional."}
        </p>
      </div>

      {/* STEP 1 */}
      <div className={cn("flex-col gap-[22px]", onStepOne ? "flex" : "hidden")}>
        <div>
          <Label htmlFor="brand-email" className={labelClassName}>
            Account email
          </Label>
          <Input
            id="brand-email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            disabled={pendingAny}
            className={inputClassName}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <FieldWarn>{form.formState.errors.email.message}</FieldWarn>
          ) : (
            <p className={helpClassName}>
              Used for login. A separate contact email can be set later in your
              profile.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="brand-password" className={labelClassName}>
            Password
          </Label>
          <div className="relative">
            <Input
              id="brand-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={pendingAny}
              className={cn(inputClassName, "pr-20")}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted-foreground hover:text-foreground absolute inset-y-[5px] right-[5px] cursor-pointer px-3 text-[13px] font-semibold transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-[11px] flex items-center gap-3">
            <div className="flex max-w-[180px] flex-1 gap-[5px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i < passwordScore
                      ? PASSWORD_BAR_COLOR[passwordScore]
                      : "bg-foreground/9",
                  )}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-[12.5px]">
              {PASSWORD_HINTS[passwordScore]}
            </span>
          </div>
          {form.formState.errors.password ? (
            <FieldWarn>{form.formState.errors.password.message}</FieldWarn>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={handleNextStep}
          disabled={pendingAny}
          className={cn(
            "mt-1 h-auto w-full rounded-xl border p-4 text-[15.5px] font-semibold transition-opacity",
            stepOneReady
              ? "bg-foreground border-foreground hover:bg-foreground text-white hover:opacity-90"
              : "border-foreground/9 bg-[#F4F1F1] text-foreground/38 hover:bg-[#F4F1F1] hover:text-foreground/38",
          )}
        >
          Continue
        </Button>

        <div className="flex flex-wrap gap-x-[22px] gap-y-[9px]">
          {BRAND_TRUST.map((t) => (
            <span
              key={t}
              className="text-muted-foreground inline-flex items-center gap-[7px] text-[12.5px]"
            >
              <Check className="text-plum-700 size-[11px] shrink-0" strokeWidth={3.2} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* STEP 2 */}
      <div className={cn("flex-col gap-[22px]", onStepOne ? "hidden" : "flex")}>
        <div>
          <Label htmlFor="brand-contact-name" className={labelClassName}>
            Contact name
          </Label>
          <Input
            id="brand-contact-name"
            placeholder="Jane Doe"
            autoComplete="name"
            disabled={pendingAny}
            className={inputClassName}
            {...form.register("contactFullName")}
          />
          {form.formState.errors.contactFullName ? (
            <FieldWarn>{form.formState.errors.contactFullName.message}</FieldWarn>
          ) : null}
        </div>

        <div>
          <Label htmlFor="brand-phone" className={labelClassName}>
            Phone number
          </Label>
          <div className={prefixedFieldClassName}>
            <div className="border-foreground/16 text-muted-foreground bg-ash-50 flex h-full items-center justify-center border-r px-3.5 text-[15px] font-semibold">
              +91
            </div>
            <Input
              id="brand-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              disabled={pendingAny}
              className="h-full flex-1 rounded-none border-0 bg-transparent px-3.5 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={
                form.watch("contactPhone").startsWith("+91")
                  ? form.watch("contactPhone").slice(3)
                  : form.watch("contactPhone")
              }
              onChange={(e) => {
                let val = e.target.value;
                if (val.startsWith("+91")) val = val.slice(3);
                const digits = val.replace(/\D/g, "").slice(0, 10);
                form.setValue("contactPhone", digits ? `+91${digits}` : "", {
                  shouldValidate: true,
                });
              }}
            />
          </div>
          {form.formState.errors.contactPhone ? (
            <FieldWarn>{form.formState.errors.contactPhone.message}</FieldWarn>
          ) : (
            <p className={helpClassName}>
              So we can reach you with support and collaboration updates.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="brand-website" className={labelClassName}>
            Website URL
          </Label>
          <Input
            id="brand-website"
            type="url"
            placeholder="https://yourbrand.com"
            autoComplete="url"
            disabled={pendingAny}
            className={inputClassName}
            {...form.register("website")}
          />
          {form.formState.errors.website ? (
            <FieldWarn>{form.formState.errors.website.message}</FieldWarn>
          ) : (
            <p className={helpClassName}>
              Optional — helps creators learn about your brand before they
              collaborate.
            </p>
          )}
        </div>

        <div>
          <Label className={labelClassName}>Brand logo</Label>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (pendingAny) return;
              handleLogoFile(event.dataTransfer.files[0] ?? null);
            }}
            onClick={() => logoInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer items-center gap-[15px] rounded-[14px] border border-dashed p-[19px] transition-colors max-sm:flex-col max-sm:items-start",
              logoError
                ? "border-red-300 bg-red-50/40"
                : "border-plum-300 bg-plum-50",
            )}
          >
            <input
              ref={logoInputRef}
              type="file"
              accept={ACCEPTED_LOGO_TYPES.join(",")}
              className="hidden"
              disabled={pendingAny}
              onChange={(event) => {
                handleLogoFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <span className="border-foreground/16 grid size-10 shrink-0 place-items-center rounded-[10px] border bg-white">
              <Upload className="text-plum-700 size-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="mb-[3px] text-[14.5px] font-semibold">
                Drop your logo here, or{" "}
                <span className="border-foreground/16 border-b">browse</span>
              </div>
              <div className="text-muted-foreground text-[12.5px]">
                JPG, PNG or WebP up to 5 MB. Optional — you can add it later.
              </div>
              {logoError ? (
                <p className="mt-1 text-xs text-red-500">{logoError}</p>
              ) : null}
            </div>
          </div>

          {logoFile ? (
            <div className="border-foreground/16 mt-3 flex items-center gap-3.5 rounded-[14px] border bg-white px-4 py-3">
              <span className="bg-plum-50 border-plum-150 grid size-10 shrink-0 place-items-center rounded-[10px] border">
                <Upload className="text-plum-700 size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold">
                  {logoFile.name}
                </p>
                <p className="text-muted-foreground text-[12.5px]">
                  {formatBytes(logoFile.size)} &middot;{" "}
                  {logoFile.type || "image"}
                </p>
              </div>
              <button
                type="button"
                disabled={pendingAny}
                onClick={(e) => {
                  e.stopPropagation();
                  clearLogo();
                }}
                className="text-muted-foreground hover:bg-ash-150 hover:text-foreground ml-2 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors"
                aria-label="Remove logo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-start gap-[11px]">
            <Checkbox
              id="terms"
              checked={form.watch("termsAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("termsAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="border-foreground/25 data-[state=checked]:bg-plum-700 data-[state=checked]:border-plum-700 mt-px size-[17px] shrink-0 rounded-[4px] data-[state=checked]:text-white"
            />
            <Label
              htmlFor="terms"
              className="text-muted-foreground block min-w-0 flex-1 text-sm leading-[1.55] font-normal"
            >
              I agree to the{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                className="text-plum-700 font-medium hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="text-plum-700 font-medium hover:underline"
              >
                Privacy Policy
              </Link>
              , and confirm I&rsquo;m authorised to represent this brand.
            </Label>
          </div>

          <div className="flex items-start gap-[11px]">
            <Checkbox
              id="brand-guidelines"
              checked={form.watch("guidelinesAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("guidelinesAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="border-foreground/25 data-[state=checked]:bg-plum-700 data-[state=checked]:border-plum-700 mt-px size-[17px] shrink-0 rounded-[4px] data-[state=checked]:text-white"
            />
            <Label
              htmlFor="brand-guidelines"
              className="text-muted-foreground block min-w-0 flex-1 text-sm leading-[1.55] font-normal"
            >
              I have read and agree to the{" "}
              <Link
                href="/legal/brand-guidelines"
                target="_blank"
                className="text-plum-700 font-medium hover:underline"
              >
                Brand Guidelines
              </Link>
              .
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={pendingAny}
          className={cn(
            "h-auto w-full rounded-xl border p-4 text-[15.5px] font-semibold transition-opacity",
            formIsValid
              ? "bg-foreground border-foreground hover:bg-foreground text-white hover:opacity-90 disabled:opacity-70"
              : "border-foreground/9 bg-[#F4F1F1] text-foreground/38 hover:bg-[#F4F1F1] hover:text-foreground/38",
          )}
        >
          {pendingSubmit ? (
            <>
              <Spinner className="size-4" aria-hidden />
              {isUploading ? "Uploading assets..." : "Creating profile..."}
            </>
          ) : (
            <>Create my brand profile</>
          )}
        </Button>
      </div>
    </form>
  );
}
