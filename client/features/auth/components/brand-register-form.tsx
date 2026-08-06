"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Building2, Eye, EyeOff, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
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
  brandName: z.string().min(1, "Brand name is required"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
  guidelinesAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the Brand Guidelines",
  }),
});

type BrandSignupData = z.infer<typeof brandSignupSchema>;

const SIGNUP_FIELD_LABELS: Partial<Record<keyof BrandSignupData, string>> = {
  email: "Account email",
  password: "Password (at least 8 characters)",
  contactFullName: "Contact name",
  contactPhone: "Phone number",
  brandName: "Brand name",
  termsAccepted: "Terms acceptance",
  guidelinesAccepted: "Brand Guidelines acceptance",
};

/** Mobile-only wizard steps. Desktop (xl:) shows all sections at once. */
const STEP_TITLES = ["Account", "Brand"] as const;
const STEP_FIELDS: (keyof BrandSignupData)[][] = [
  ["email", "password"],
  [
    "contactFullName",
    "contactPhone",
    "brandName",
    "termsAccepted",
    "guidelinesAccepted",
  ],
];
const LAST_STEP = STEP_TITLES.length - 1;

const labelClassName =
  "inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]";

const inputClassName =
  "h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#3e76ef] focus-visible:ring-[3px] focus-visible:ring-[#3e76ef]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800";

const prefixedFieldClassName =
  "flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800";

function getBrandSignupBlockers(values: BrandSignupData): string[] {
  const blockers: string[] = [];
  const parsed = brandSignupSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BrandSignupData | undefined;
      const label = key ? SIGNUP_FIELD_LABELS[key] : undefined;
      if (label && !blockers.includes(label)) blockers.push(label);
    }
  }
  return blockers;
}

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
      brandName: "",
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
        brand_name: variables.brandName,
        phone: variables.contactPhone,
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

  const signupFormValues = form.watch();
  const signupBlockers = useMemo(
    () => getBrandSignupBlockers(signupFormValues),
    [signupFormValues],
  );
  const isSignupComplete = signupBlockers.length === 0;

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

      registerBrandMutation.mutate({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        contactFullName: data.contactFullName.trim(),
        contactPhone: data.contactPhone.trim(),
        brandName: data.brandName.trim(),
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

  const loginHref = `/login?role=brand${
    searchParams.get("callbackUrl")
      ? `&callbackUrl=${encodeURIComponent(searchParams.get("callbackUrl")!)}`
      : ""
  }`;

  if (!showEmailForm) {
    return (
      <div className="flex min-w-0 flex-1 flex-col bg-[#fdfcfb] dark:bg-slate-950">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 md:px-8 dark:border-slate-800">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start lg:gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                Create your brand profile
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose how you want to sign up.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href={loginHref}
                className="font-semibold text-slate-900 hover:underline dark:text-slate-50"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 md:px-8">
          <div className="mx-auto w-full max-w-md space-y-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-full border-slate-200 bg-white text-[15px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              disabled={pendingAny}
              onClick={handleGoogleSignup}
            >
              {googleLoading ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                <GoogleMark className="size-5" />
              )}
              Sign up with Google
            </Button>

            <Button
              type="button"
              className="h-12 w-full rounded-full bg-[#3e76ef] text-[15px] font-bold text-white hover:bg-[#2d5cc5]"
              disabled={pendingAny}
              onClick={() => setShowEmailForm(true)}
            >
              Sign up with email
            </Button>

            <p className="pt-4 text-center text-[13px] text-[#8B8489]">
              Are you a creator?{" "}
              <Link
                href="/register/creator"
                className="font-bold text-slate-950 hover:underline dark:text-slate-50"
              >
                Sign up as a creator
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-w-0 flex-col bg-[#fdfcfb] dark:bg-slate-950 xl:min-h-0 xl:h-full"
    >
      <div className="shrink-0 sticky top-0 z-20 border-b border-slate-200 bg-[#fdfcfb] px-4 py-3 sm:px-6 sm:py-4 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div>
            <button
              type="button"
              onClick={() => {
                setShowEmailForm(false);
                setCurrentStep(0);
              }}
              className="mb-2 text-sm font-semibold text-[#3e76ef] hover:underline"
            >
              ← Other signup options
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Sign up with email
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You can add website, categories, and more from your profile later.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm lg:items-end">
            <p className="text-slate-500">
              Already have an account?{" "}
              <Link
                href={loginHref}
                className="font-semibold text-slate-900 hover:underline dark:text-slate-50"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 xl:hidden">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>
              Step {currentStep + 1} of {STEP_TITLES.length}:{" "}
              {STEP_TITLES[currentStep]}
            </span>
            <span>
              {Math.round(((currentStep + 1) / STEP_TITLES.length) * 100)}%
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEP_TITLES.map((title, i) => (
              <div
                key={title}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= currentStep
                    ? "bg-[#3e76ef]"
                    : "bg-slate-200 dark:bg-slate-800",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 px-4 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8 md:px-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--ink-4)_transparent]">
        <div className="space-y-6">
          <div
            className={cn(
              currentStep === 0 ? "block" : "hidden",
              "xl:block",
              "space-y-3",
            )}
          >
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                1
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Secure Your Account
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="brand-email" className={labelClassName}>
                  Account email <span className="text-red-500">*</span>
                </Label>
                <div className={prefixedFieldClassName}>
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <Input
                    id="brand-email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    disabled={pendingAny}
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Used for login. Contact email can be set later in profile.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-col items-start gap-1 lg:flex-row lg:items-center lg:gap-2">
                  <Label htmlFor="brand-password" className={labelClassName}>
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    min 8 chars, mix letters + numbers + symbol
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="brand-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    disabled={pendingAny}
                    className={cn(inputClassName, "pr-10")}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={cn(
              currentStep === 1 ? "block" : "hidden",
              "xl:block",
              "space-y-3",
            )}
          >
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                2
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                About Your Brand
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="brand-contact-name" className={labelClassName}>
                  Contact name <span className="text-red-500">*</span>
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
                  <p className="text-xs text-red-500">
                    {form.formState.errors.contactFullName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label htmlFor="brand-phone" className={labelClassName}>
                  Phone number <span className="text-red-500">*</span>
                </Label>
                <div className={prefixedFieldClassName}>
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[15px] font-semibold text-[#8b8489]">
                    +91
                  </div>
                  <Input
                    id="brand-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                    disabled={pendingAny}
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
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
                <p className="text-xs text-slate-500">
                  So we can reach you with support and collaboration updates.
                </p>
                {form.formState.errors.contactPhone ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.contactPhone.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label htmlFor="brand-name" className={labelClassName}>
                  Brand name <span className="text-red-500">*</span>
                </Label>
                <div className={prefixedFieldClassName}>
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <Building2 className="size-4" />
                  </div>
                  <Input
                    id="brand-name"
                    placeholder="Acme Corp"
                    disabled={pendingAny}
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    {...form.register("brandName")}
                  />
                </div>
                {form.formState.errors.brandName ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.brandName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className={labelClassName}>Brand logo</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Optional — you can upload this later from your profile.
                  </p>
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (pendingAny) return;
                    handleLogoFile(event.dataTransfer.files[0] ?? null);
                  }}
                  onClick={() => logoInputRef.current?.click()}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border-2 border-dashed bg-[#fdfcfb] px-6 py-4 transition-colors dark:bg-slate-900/50 cursor-pointer",
                    logoError
                      ? "border-red-300"
                      : "border-slate-200 hover:bg-slate-50 hover:border-[#3e76ef] dark:border-slate-800 dark:hover:border-[#3e76ef]",
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
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e9f0fe] text-[#3e76ef] dark:bg-blue-500/20">
                    <Upload className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white">
                      Drop your logo here, or{" "}
                      <span className="text-[#3e76ef] hover:text-[#2d5cc5] underline decoration-[#3e76ef] underline-offset-2">
                        browse
                      </span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      JPG, PNG, WebP up to 5 MB
                    </p>
                    {logoError ? (
                      <p className="mt-1 text-xs text-red-500">{logoError}</p>
                    ) : null}
                  </div>
                </div>

                {logoFile ? (
                  <div className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3e76ef] to-[#8b5cf6] text-white">
                      <Upload className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-bold text-slate-900 dark:text-white">
                        {logoFile.name}
                      </p>
                      <p className="mt-0.5 text-[13px] text-slate-500">
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
                      className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      aria-label="Remove logo"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 sticky bottom-0 z-10 space-y-4 border-t border-slate-200 bg-[#fdfcfb] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        {currentStep < LAST_STEP ? (
          <div className="flex items-center gap-3 xl:hidden">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="h-11 rounded-full px-6 text-[15px] font-bold"
              >
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleNextStep}
              className="h-11 flex-1 rounded-full bg-[#3e76ef] text-[15px] font-bold text-white hover:bg-[#2d5cc5] dark:bg-[#3e76ef] dark:hover:bg-[#2d5cc5]"
            >
              Next
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            currentStep === LAST_STEP ? "space-y-4" : "hidden",
            "xl:block xl:space-y-4",
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={form.watch("termsAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("termsAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="mt-0.5 shrink-0 h-4 w-4 border border-slate-300 accent-[#3e76ef] data-[state=checked]:bg-[#3e76ef] data-[state=checked]:border-[#3e76ef] data-[state=checked]:text-white dark:border-slate-600"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="terms"
                className="block min-w-0 text-[13px] font-normal leading-snug text-slate-600 dark:text-slate-400"
              >
                I agree to the{" "}
                <Link
                  href="/legal/terms"
                  target="_blank"
                  className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
                >
                  Terms of Service
                </Link>
                {", "}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
                >
                  Privacy Policy
                </Link>
                {", and confirm I'm authorized to represent this brand."}
              </Label>
              {form.formState.errors.termsAccepted ? (
                <p className="text-xs text-red-500">
                  {form.formState.errors.termsAccepted.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="brand-guidelines"
              checked={form.watch("guidelinesAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("guidelinesAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="mt-0.5 shrink-0 h-4 w-4 border border-slate-300 accent-[#3e76ef] data-[state=checked]:bg-[#3e76ef] data-[state=checked]:border-[#3e76ef] data-[state=checked]:text-white dark:border-slate-600"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="brand-guidelines"
                className="block min-w-0 text-[13px] font-normal leading-snug text-slate-600 dark:text-slate-400"
              >
                I have read and agree to the{" "}
                <Link
                  href="/legal/brand-guidelines"
                  target="_blank"
                  className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
                >
                  Brand Guidelines
                </Link>
                .
              </Label>
              {form.formState.errors.guidelinesAccepted ? (
                <p className="text-xs text-red-500">
                  {form.formState.errors.guidelinesAccepted.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!isSignupComplete && signupBlockers.length > 0 && !pendingSubmit ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Still needed: {signupBlockers.join(" · ")}
              </p>
            ) : null}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              <Button
                type="submit"
                disabled={!isSignupComplete || pendingAny}
                className={cn(
                  "h-11 w-full rounded-full text-[15px] font-bold transition-colors lg:flex-1",
                  isSignupComplete
                    ? "bg-[#3e76ef] text-white hover:bg-[#2d5cc5] disabled:opacity-70 dark:bg-[#3e76ef] dark:hover:bg-[#2d5cc5]"
                    : "bg-[#F2F2F2] text-[#8B8489] hover:bg-[#E8E8E8] hover:text-[#7A7579] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                )}
              >
                {pendingSubmit ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    {isUploading ? "Uploading assets..." : "Creating profile..."}
                  </>
                ) : (
                  <>Create my brand profile &rarr;</>
                )}
              </Button>

              <div className="w-full text-center text-[11px] text-[#8B8489] leading-tight lg:w-auto lg:shrink-0 lg:text-right">
                Are you a creator? <br />
                <Link
                  href="/register/creator"
                  className="font-bold text-slate-950 hover:underline dark:text-slate-50 text-[13px]"
                >
                  Sign up as a creator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
