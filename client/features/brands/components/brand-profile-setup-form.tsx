"use client";

import { motion, type Variants } from "framer-motion";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  useSubmitBrandProfileMutation,
  useUploadBrandLogoMutation,
  useUploadBrandPronunciationMutation,
} from "@/features/brands/hooks/use-brand-profile-form-mutation";
import { useAuth } from "@/providers/auth-provider";
import type { BrandProfileItemApi } from "@/features/brands/api/types";
import {
  type UpdateBrandProfilePayload,
} from "@/features/brands/api/update-brand-profile";
import {
  brandCategoryOptionsQueryKey,
  fetchBrandCategoryOptions,
} from "@/features/brands/api/fetch-brand-category-options";
import type { BrandCategoryApi } from "@/features/brands/api/brand-category-types";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/features/auth/api/phone-otp";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const PHONE_OTP_RESEND_SECONDS = 60;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;
const brandProductTypeValues = ["PHYSICAL", "DIGITAL", "BOTH"] as const;
const brandCategoryValues = [
  "APPAREL_AND_FASHION",
  "ELECTRONICS_AND_GADGETS",
  "HEALTH_AND_BEAUTY",
  "FOOD_AND_BEVERAGES",
  "HOME_AND_LIFESTYLE",
  "SPORTS_AND_FITNESS",
  "TOYS_AND_KIDS",
  "PETS_AND_ANIMALS",
  "AUTOMOBILE_AND_VEHICLES",
  "REAL_ESTATE",
  "RESTAURANTS_AND_CAFES",
  "CLINICS_AND_HEALTHCARE",
  "SALONS_AND_PERSONAL_CARE",
  "EDUCATION_AND_COACHING",
  "TRAVEL_AND_HOSPITALITY",
  "LOCAL_BUSINESSES",
  "SAAS_AND_APPS",
  "PROFESSIONAL_SERVICES",
  "OTHER",
] as const;

const brandProfileSetupSchema = z.object({
  contactFullName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  brandName: z.string().trim().min(1, "Brand name is required"),
  brandPronunciation: z.string(),
  website: z
    .string()
    .refine(
      (value) => !value.trim() || Boolean(normalizeOptionalUrl(value)),
      "Website must be a valid http(s) URL",
    ),
  instagramUrl: z
    .string()
    .refine(
      (value) => !value.trim() || Boolean(normalizeOptionalUrl(value)),
      "Instagram URL must be a valid http(s) URL",
    ),
  productType: z.union([z.literal(""), z.enum(brandProductTypeValues)]),
  categories: z.array(z.enum(brandCategoryValues)),
  otherCategoryText: z.string(),
});

type BrandProfileSetupFormValues = z.infer<typeof brandProfileSetupSchema>;

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

function normalizePhoneForOtp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("+")) return trimmed;
  return `+${trimmed.replace(/\D/g, "")}`;
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

function phoneOtpErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait before trying again.";
    }
    if (error.response?.status === 503) {
      return "Phone verification is temporarily unavailable.";
    }
  }

  const message = readApiErrorMessage(error);
  if (message && message !== "Invalid request.") return message;
  return fallback;
}

export type BrandProfileSetupFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  initialProfile?: BrandProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
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
  const { user, refreshUser } = useAuth();

  const { data: categoryOptionRows = [] } = useQuery({
    queryKey: brandCategoryOptionsQueryKey,
    queryFn: fetchBrandCategoryOptions,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const defaultFormValues = useMemo<BrandProfileSetupFormValues>(
    () => ({
      contactFullName: initialProfile?.contactFullName ?? user?.name ?? "",
      contactEmail: initialProfile?.contactEmail ?? user?.email ?? "",
      contactPhone: initialProfile?.contactPhone ?? "",
      brandName: initialProfile?.brandName ?? "",
      brandPronunciation: initialProfile?.brandPronunciation ?? "",
      website: initialProfile?.website ?? "",
      instagramUrl: initialProfile?.instagramUrl ?? "",
      productType: initialProfile?.productType ?? "",
      categories: initialProfile?.categories ?? [],
      otherCategoryText: initialProfile?.otherCategoryLabel ?? "",
    }),
    [initialProfile, user?.email, user?.name],
  );

  const form = useForm<BrandProfileSetupFormValues>({
    resolver: zodResolver(brandProfileSetupSchema),
    defaultValues: defaultFormValues,
  });

  const brandName = useWatch({ control: form.control, name: "brandName" }) ?? "";
  const contactFullName =
    useWatch({ control: form.control, name: "contactFullName" }) ?? "";
  const contactEmail =
    useWatch({ control: form.control, name: "contactEmail" }) ?? "";
  const contactPhone =
    useWatch({ control: form.control, name: "contactPhone" }) ?? "";
  const website = useWatch({ control: form.control, name: "website" }) ?? "";
  const selectedCategories =
    useWatch({ control: form.control, name: "categories" }) ?? [];
  const productType =
    useWatch({ control: form.control, name: "productType" }) ?? "";
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);

  const normalizedContactPhone = useMemo(
    () => normalizePhoneForOtp(contactPhone),
    [contactPhone],
  );
  const contactPhoneVerified =
    Boolean(normalizedContactPhone) && verifiedPhone === normalizedContactPhone;
  const activeOtpPhone =
    otpSentToPhone === normalizedContactPhone ? otpSentToPhone : null;
  const resendSecondsRemaining = useMemo(() => {
    if (!otpResendAvailableAt) return 0;
    return Math.max(
      0,
      Math.ceil(
        (otpResendAvailableAt -
          (otpClockTick || otpResendAvailableAt - PHONE_OTP_RESEND_SECONDS * 1000)) /
          1000,
      ),
    );
  }, [otpClockTick, otpResendAvailableAt]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoriesDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!initialProfile?.contactEmail && user?.email && !form.getValues("contactEmail")) {
      form.setValue("contactEmail", user.email);
    }
    if (
      !initialProfile?.contactFullName &&
      user?.name &&
      !form.getValues("contactFullName")
    ) {
      form.setValue("contactFullName", user.name);
    }
  }, [form, initialProfile?.contactEmail, initialProfile?.contactFullName, user?.email, user?.name]);

  useEffect(() => {
    if (!otpResendAvailableAt) {
      return;
    }

    const intervalId = window.setInterval(() => setOtpClockTick(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [otpResendAvailableAt]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initialProfile?.logoUrl ?? null,
  );
  const [pendingLogoKey, setPendingLogoKey] = useState<string | null>(
    initialProfile?.logoKey ?? null,
  );
  const [pendingPronunciationAudioKey, setPendingPronunciationAudioKey] =
    useState<string | null>(
      initialProfile?.brandPronunciationAudioKey ?? null,
    );
  const [pronunciationAudioPreviewUrl, setPronunciationAudioPreviewUrl] =
    useState<string | null>(initialProfile?.brandPronunciationAudioUrl ?? null);
  const uploadBrandLogoMutation = useUploadBrandLogoMutation(mode);
  const uploadPronunciationMutation = useUploadBrandPronunciationMutation(mode);
  const submitBrandProfileMutation = useSubmitBrandProfileMutation({
    mode,
    onSuccess,
  });
  const sendPhoneOtpMutation = useMutation({
    mutationKey: ["auth", "phone", "send-otp"],
    mutationFn: sendPhoneOtp,
    onSuccess: (_result, variables) => {
      const now = Date.now();
      setOtpSentToPhone(variables.phone);
      setVerifiedPhone(null);
      setOtpCode("");
      setOtpError(null);
      setOtpClockTick(now);
      setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      toast.success("Verification code sent");
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 429) {
        const now = Date.now();
        setOtpClockTick(now);
        setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      }
      toast.error(
        phoneOtpErrorMessage(
          error,
          "Could not send verification code. Check the number and try again.",
        ),
      );
    },
  });
  const verifyPhoneOtpMutation = useMutation({
    mutationKey: ["auth", "phone", "verify-otp"],
    mutationFn: verifyPhoneOtp,
    onSuccess: (result, variables) => {
      if (!result.phoneVerified) {
        const message = "Incorrect or expired code.";
        setOtpError(message);
        toast.error(message);
        return;
      }

      setVerifiedPhone(variables.phone);
      setOtpSentToPhone(null);
      setOtpCode("");
      setOtpError(null);
      setOtpResendAvailableAt(null);
      form.setValue("contactPhone", variables.phone, {
        shouldDirty: true,
        shouldTouch: true,
      });
      void refreshUser();
      toast.success("Mobile number verified");
    },
    onError: (error) => {
      const message = phoneOtpErrorMessage(
        error,
        "Could not verify the code. Try again.",
      );
      setOtpError(message);
      toast.error(message);
    },
  });
  const phoneOtpPending =
    sendPhoneOtpMutation.isPending || verifyPhoneOtpMutation.isPending;
  const pending = submitBrandProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);
  const uploadingLogo = uploadBrandLogoMutation.isPending;
  const uploadingPronunciation = uploadPronunciationMutation.isPending;

  const title = useMemo(() => {
    return "Edit your brand profile";
  }, []);

  const description = useMemo(() => {
    return "Update your brand details and logo.";
  }, []);

  const toggleCategory = useCallback((value: BrandCategoryApi) => {
    const current = form.getValues("categories");
    form.setValue(
      "categories",
      current.includes(value)
        ? current.filter((category) => category !== value)
        : [...current, value],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  }, [form]);

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(brandName.trim()),
      Boolean(contactFullName.trim()),
      Boolean(contactEmail.trim()),
      Boolean(contactPhone.trim()),
      Boolean(website.trim()),
      Boolean(logoPreviewUrl || pendingLogoKey),
      selectedCategories.length > 0,
      Boolean(productType),
    ];
    const completed = checkpoints.filter(Boolean).length;
    const total = checkpoints.length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [
    brandName,
    contactFullName,
    contactEmail,
    contactPhone,
    website,
    logoPreviewUrl,
    pendingLogoKey,
    selectedCategories.length,
    productType,
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

  const handlePronunciationBlob = useCallback(
    (blob: Blob) => {
      uploadPronunciationMutation.mutate(blob, {
        onSuccess: (result) => {
          if (!result) return;
          setPendingPronunciationAudioKey(result.key);
          setPronunciationAudioPreviewUrl(result.cdnUrl);
        },
      });
    },
    [uploadPronunciationMutation],
  );

  const clearPronunciationAudio = useCallback(() => {
    setPendingPronunciationAudioKey(null);
    setPronunciationAudioPreviewUrl(null);
  }, []);

  const handleSendPhoneOtp = useCallback(() => {
    const phone = normalizePhoneForOtp(form.getValues("contactPhone"));
    if (!PHONE_E164_REGEX.test(phone)) {
      const message = "Enter a mobile number in E.164 format, like +919876543210.";
      form.setError("contactPhone", { message });
      toast.error(message);
      return;
    }

    if (contactPhoneVerified) {
      toast.message("Mobile number is already verified");
      return;
    }

    form.clearErrors("contactPhone");
    form.setValue("contactPhone", phone, {
      shouldDirty: true,
      shouldTouch: true,
    });
    sendPhoneOtpMutation.mutate({ phone });
  }, [contactPhoneVerified, form, sendPhoneOtpMutation]);

  const handleVerifyPhoneOtp = useCallback(() => {
    const phone = normalizePhoneForOtp(form.getValues("contactPhone"));
    const code = otpCode.trim();

    if (!otpSentToPhone || phone !== otpSentToPhone) {
      const message = "Send a new verification code for this mobile number.";
      setOtpError(message);
      toast.error(message);
      return;
    }

    if (!OTP_CODE_REGEX.test(code)) {
      const message = "Enter the verification code from the SMS.";
      setOtpError(message);
      toast.error(message);
      return;
    }

    setOtpError(null);
    verifyPhoneOtpMutation.mutate({ phone, code });
  }, [form, otpCode, otpSentToPhone, verifyPhoneOtpMutation]);

  const handleSubmit = useCallback(
    (values: BrandProfileSetupFormValues) => {
      const name = values.brandName.trim();
      if (!name) {
        toast.error("Brand name is required");
        return;
      }

      const fullName = values.contactFullName.trim();
      const email = values.contactEmail.trim();
      const phone = normalizePhoneForOtp(values.contactPhone);
      const initialPhone = normalizePhoneForOtp(initialProfile?.contactPhone ?? "");
      const phoneChanged = phone !== initialPhone;

      if (!fullName) {
        form.setError("contactFullName", { message: "Name is required" });
        toast.error("Name is required");
        return;
      }
      if (!email) {
        form.setError("contactEmail", { message: "Email is required" });
        toast.error("Email is required");
        return;
      }
      if (!PHONE_E164_REGEX.test(phone)) {
        const message =
          "Enter a mobile number in E.164 format, like +919876543210.";
        form.setError("contactPhone", {
          message,
        });
        toast.error(message);
        return;
      }
      if (phoneChanged && verifiedPhone !== phone) {
        const message = "Verify your new mobile number before saving changes.";
        form.setError("contactPhone", { message });
        toast.error(message);
        return;
      }
      if (values.categories.includes("OTHER") && !values.otherCategoryText.trim()) {
        const message = "Enter a custom category for Other.";
        form.setError("otherCategoryText", { message });
        toast.error(message);
        return;
      }



      const payload: UpdateBrandProfilePayload = {
        brandName: name,
        contactFullName: fullName,
        contactEmail: email,
        contactPhone: phone,
        logoKey: pendingLogoKey,
        website: normalizeOptionalUrl(values.website) ?? null,
        instagramUrl: normalizeOptionalUrl(values.instagramUrl) ?? null,
        productType: values.productType || null,
        categories: values.categories,
        otherCategoryLabel: values.categories.includes("OTHER")
          ? values.otherCategoryText.trim()
          : null,
        brandPronunciation: values.brandPronunciation.trim()
          ? values.brandPronunciation.trim()
          : null,
        brandPronunciationAudioKey: pendingPronunciationAudioKey,
      };

      submitBrandProfileMutation.mutate({ payload });
    },
    [
      mode,
      form,
      initialProfile?.contactPhone,
      pendingLogoKey,
      pendingPronunciationAudioKey,
      submitBrandProfileMutation,
      verifiedPhone,
    ],
  );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.header variants={itemVariants} className="space-y-1">
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
      </motion.header>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="brand-contact-full-name">Name</Label>
                <Input
                  id="brand-contact-full-name"
                  placeholder="Your full name"
                  autoComplete="name"
                  disabled={pending}
                  aria-invalid={
                    form.formState.errors.contactFullName ? true : undefined
                  }
                  {...form.register("contactFullName")}
                />
                {form.formState.errors.contactFullName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.contactFullName.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-contact-email">Email</Label>
                <Input
                  id="brand-contact-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={pending}
                  aria-invalid={
                    form.formState.errors.contactEmail ? true : undefined
                  }
                  {...form.register("contactEmail")}
                />
                {form.formState.errors.contactEmail ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.contactEmail.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-contact-phone">Mobile</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="brand-contact-phone"
                    placeholder="+919876543210"
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={pending || phoneOtpPending}
                    aria-invalid={
                      form.formState.errors.contactPhone ? true : undefined
                    }
                    className="min-w-0 sm:flex-1"
                    {...form.register("contactPhone")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendPhoneOtp}
                    disabled={
                      pending ||
                      phoneOtpPending ||
                      contactPhoneVerified ||
                      (resendSecondsRemaining > 0 && Boolean(activeOtpPhone))
                    }
                    className="shrink-0 sm:w-28"
                  >
                    {sendPhoneOtpMutation.isPending ? (
                      <>
                        <Spinner className="size-4" aria-hidden />
                        Sending...
                      </>
                    ) : contactPhoneVerified ? (
                      "Verified"
                    ) : resendSecondsRemaining > 0 &&
                      activeOtpPhone ? (
                      `${resendSecondsRemaining}s`
                    ) : activeOtpPhone ? (
                      "OTP sent"
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </div>
                {form.formState.errors.contactPhone ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.contactPhone.message}
                  </p>
                ) : null}
                {contactPhoneVerified ? (
                  <p className="text-xs font-medium text-green-600">
                    Mobile number verified.
                  </p>
                ) : null}
                {activeOtpPhone && !contactPhoneVerified ? (
                  <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <Label htmlFor="brand-contact-phone-otp">
                      Verification code
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="brand-contact-phone-otp"
                        value={otpCode}
                        onChange={(event) => {
                          setOtpError(null);
                          setOtpCode(
                            event.target.value.replace(/\D/g, "").slice(0, 10),
                          );
                        }}
                        placeholder="123456"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={10}
                        disabled={pending || phoneOtpPending}
                        aria-invalid={otpError ? true : undefined}
                        className="sm:flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        disabled={pending || phoneOtpPending || !otpCode.trim()}
                        className="sm:w-28"
                      >
                        {verifyPhoneOtpMutation.isPending ? (
                          <Spinner className="size-4" aria-hidden />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the code sent to {activeOtpPhone}.
                    </p>
                    {otpError ? (
                      <p className="text-xs text-destructive">{otpError}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-2">
          <Label htmlFor="brand-name">Brand name</Label>
          <Input
            id="brand-name"
            placeholder="How you appear to creators"
            autoComplete="organization"
            disabled={pending}
            required
            aria-invalid={form.formState.errors.brandName ? true : undefined}
            {...form.register("brandName")}
          />
          {form.formState.errors.brandName ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.brandName.message}
            </p>
          ) : null}
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-2">
          <Label htmlFor="brand-pronunciation">
            Phonetic spelling (optional)
          </Label>
          <Input
            id="brand-pronunciation"
            placeholder="ACK-mee"
            disabled={pending}
            {...form.register("brandPronunciation")}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <BrandPronunciationAudioField
          disabled={pending}
          uploading={uploadingPronunciation}
          audioUrl={pronunciationAudioPreviewUrl}
          hasRecording={Boolean(
            pendingPronunciationAudioKey && pronunciationAudioPreviewUrl,
          )}
          onRecordingReady={handlePronunciationBlob}
          onRemove={clearPronunciationAudio}
        />
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-2">
          <Label htmlFor="brand-website">Brand website (optional)</Label>
          <Input
            id="brand-website"
            placeholder="https://acme.com"
            autoComplete="url"
            inputMode="url"
            disabled={pending}
            aria-invalid={form.formState.errors.website ? true : undefined}
            {...form.register("website")}
          />
          {form.formState.errors.website ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.website.message}
            </p>
          ) : null}
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-2">
            <Label htmlFor="brand-instagram">
              Brand Instagram URL (optional)
            </Label>
            <Input
              id="brand-instagram"
              placeholder="https://instagram.com/yourbrand"
              autoComplete="url"
              inputMode="url"
              disabled={pending}
              aria-invalid={
                form.formState.errors.instagramUrl ? true : undefined
              }
              {...form.register("instagramUrl")}
            />
            {form.formState.errors.instagramUrl ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.instagramUrl.message}
              </p>
            ) : null}
          </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
            <Label>Categories (optional)</Label>
            <p className="text-xs text-muted-foreground">Select all that apply.</p>
            <div className="relative" ref={dropdownRef}>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isCategoriesDropdownOpen}
                className="w-full justify-between"
                onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                disabled={pending}
              >
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} selected`
                  : "Select categories..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              {isCategoriesDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                  <div className="max-h-60 overflow-y-auto p-1">
                    {categoryOptionRows.map((opt) => (
                      <div key={opt.value} className="flex flex-col">
                        <label
                          className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={selectedCategories.includes(
                              opt.value as BrandCategoryApi,
                            )}
                            onCheckedChange={() =>
                              toggleCategory(opt.value as BrandCategoryApi)
                            }
                            disabled={pending}
                          />
                          <span>{opt.label}</span>
                        </label>
                        {opt.value === "OTHER" && selectedCategories.includes("OTHER") && (
                          <div className="px-2 pb-2 pt-1 animate-in fade-in slide-in-from-top-1">
                            <Input
                              id="other-category-input"
                              placeholder="Enter custom category"
                              disabled={pending}
                              className="h-8 text-xs"
                              autoFocus
                              aria-invalid={
                                form.formState.errors.otherCategoryText
                                  ? true
                                  : undefined
                              }
                              {...form.register("otherCategoryText")}
                            />
                            {form.formState.errors.otherCategoryText ? (
                              <p className="mt-1 text-xs text-destructive">
                                {form.formState.errors.otherCategoryText.message}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

        <motion.fieldset variants={itemVariants} className="space-y-2 rounded-xl border border-border/60 p-4">
            <legend className="text-sm font-medium text-foreground px-1">
              Product type (optional)
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {(
                [
                  ["PHYSICAL", "Physical"],
                  ["DIGITAL", "Digital"],
                  ["BOTH", "Both"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="productType"
                    value={value}
                    disabled={pending}
                    className="size-4 accent-primary dark:scheme-dark"
                    checked={productType === value}
                    onChange={() =>
                      form.setValue("productType", value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="productType"
                  value=""
                  checked={productType === ""}
                  disabled={pending}
                  className="size-4 accent-primary dark:scheme-dark"
                  onChange={() =>
                    form.setValue("productType", "", {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                />
                Prefer not to say
              </label>
            </div>
          </motion.fieldset>

        <motion.div variants={itemVariants}>
          <BrandLogoField
          previewUrl={logoPreviewUrl}
          accept={LOGO_ACCEPT}
          disabled={pending || uploadingLogo}
          uploading={uploadingLogo}
          fileInputRef={fileInputRef}
          onSelectFile={(file) => void handleLogoSelected(file)}
          onRemove={clearLogo}
        />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={
              pending ||
              phoneOtpPending ||
              uploadingLogo ||
              uploadingPronunciation
            }
          >
            {pending ? (
              variant === "onboarding" ? (
                mode === "update" ? (
                  "Saving…"
                ) : (
                  "Creating…"
                )
              ) : (
                <>
                  <Spinner className="size-4" aria-hidden />
                  {mode === "update" ? "Saving…" : "Creating…"}
                </>
              )
            ) : mode === "update" ? (
              "Save changes"
            ) : (
              "Create profile"
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
