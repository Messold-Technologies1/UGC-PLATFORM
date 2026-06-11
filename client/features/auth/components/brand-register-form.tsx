"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import {
  Upload,
  Instagram,
  Check,
  Building2,
  Globe,
  ShoppingBag,
  MonitorPlay,
  Package,
  ChevronDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import type { BrandCategoryApi } from "@/features/brands/api/brand-category-types";
import {
  presignBrandSignupLogo,
  presignBrandSignupPronunciation,
  putBlobToPresignedUrl,
  registerBrand,
} from "@/features/auth/api/brand-signup";
import { authMeQueryKey, type AuthUser } from "@/features/auth/hooks/use-me-query";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { cn } from "@/lib/utils";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const brandSignupSchema = z
  .object({
    email: z
      .string()
      .email("Enter a valid email address")
      .min(1, "Email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    contactFullName: z.string().min(1, "Full name is required"),
    contactEmail: z
      .string()
      .email("Enter a valid email address")
      .min(1, "Contact email is required"),
    contactPhone: z.string().min(1, "Phone is required"),
    brandName: z.string().min(1, "Brand name is required"),
    website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    instagramUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    productType: z.enum(["PHYSICAL", "DIGITAL", "BOTH"], {
      message: "Product type is required",
    }),
    categories: z.array(z.string()).min(1, "Select at least one category"),
    otherCategoryLabel: z.string().optional(),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms",
    }),
  })
  .refine(
    (data) => {
      if (
        data.categories.includes("OTHER") &&
        !data.otherCategoryLabel?.trim()
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify your category",
      path: ["otherCategoryLabel"],
    },
  );

type BrandSignupData = z.infer<typeof brandSignupSchema>;

const BRAND_CATEGORIES = [
  { slug: "APPAREL_AND_FASHION", label: "Apparel & Fashion" },
  { slug: "ELECTRONICS_AND_GADGETS", label: "Electronics" },
  { slug: "HEALTH_AND_BEAUTY", label: "Health & Beauty" },
  { slug: "FOOD_AND_BEVERAGES", label: "Food & Beverages" },
  { slug: "HOME_AND_LIFESTYLE", label: "Home & Lifestyle" },
  { slug: "SPORTS_AND_FITNESS", label: "Sports & Fitness" },
  { slug: "TOYS_AND_KIDS", label: "Toys & Kids" },
  { slug: "PETS_AND_ANIMALS", label: "Pets & Animals" },
  { slug: "OTHER", label: "Other" },
];

type SubmitStatus = "idle" | "uploading" | "registering";

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

// function normalizePhoneForSignup(raw: string): string {
//   const trimmed = raw.trim();
//   if (!trimmed) return "";
//   if (!trimmed.startsWith("+")) return trimmed;
//   return `+${trimmed.replace(/\D/g, "")}`;
// }

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function validateLogoFile(file: File): string | null {
  if (
    !ACCEPTED_LOGO_TYPES.includes(
      file.type as (typeof ACCEPTED_LOGO_TYPES)[number],
    )
  ) {
    return "Upload a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 5 MB or smaller.";
  }
  return null;
}

export function BrandRegisterForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoTempKey, setLogoTempKey] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [pronunciationAudioBlob, setPronunciationAudioBlob] =
    useState<Blob | null>(null);
  const [pronunciationAudioTempKey, setPronunciationAudioTempKey] =
    useState<string | null>(null);
  const [pronunciationAudioPreviewUrl, setPronunciationAudioPreviewUrl] =
    useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);

  const form = useForm<BrandSignupData>({
    resolver: zodResolver(brandSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      contactFullName: "",
      contactEmail: "",
      contactPhone: "",
      brandName: "",
      website: "",
      instagramUrl: "",
      categories: [],
      otherCategoryLabel: "",
      termsAccepted: false,
    },
  });

  // const normalizedPhone = normalizePhoneForSignup(phoneInput);

  const pendingSubmit = submitStatus !== "idle";
  const pendingAny = pendingSubmit;

  useEffect(() => {
    return () => {
      if (pronunciationAudioPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pronunciationAudioPreviewUrl);
      }
    };
  }, [pronunciationAudioPreviewUrl]);

  const handleLogoFile = useCallback((file: File | null) => {
    if (!file) return;
    const error = validateLogoFile(file);
    if (error) {
      setLogoFile(null);
      setLogoTempKey(null);
      setLogoError(error);
      toast.error(error);
      return;
    }
    setLogoFile(file);
    setLogoTempKey(null);
    setLogoError(null);
  }, []);

  const handlePronunciationBlob = useCallback((blob: Blob) => {
    setPronunciationAudioBlob(blob);
    setPronunciationAudioTempKey(null);
    setPronunciationAudioPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(blob);
    });
  }, []);

  const clearPronunciationAudio = useCallback(() => {
    setPronunciationAudioBlob(null);
    setPronunciationAudioTempKey(null);
    setPronunciationAudioPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  const uploadLogo = useCallback(
    async (email: string): Promise<string | undefined> => {
      if (logoTempKey) return logoTempKey;
      if (!logoFile) return undefined;

      const presign = await presignBrandSignupLogo({
        email,
        contentType: logoFile.type,
        contentLength: logoFile.size,
      });
      await putBlobToPresignedUrl(logoFile, presign);
      setLogoTempKey(presign.key);
      return presign.key;
    },
    [logoFile, logoTempKey],
  );

  const uploadPronunciationAudio = useCallback(
    async (email: string): Promise<string | undefined> => {
      if (pronunciationAudioTempKey) return pronunciationAudioTempKey;
      if (!pronunciationAudioBlob) return undefined;

      const presign = await presignBrandSignupPronunciation({
        email,
        contentType: pronunciationAudioBlob.type || "audio/webm",
        contentLength: pronunciationAudioBlob.size,
      });
      await putBlobToPresignedUrl(pronunciationAudioBlob, presign);
      setPronunciationAudioTempKey(presign.key);
      setPronunciationAudioPreviewUrl(presign.cdnUrl);
      return presign.key;
    },
    [pronunciationAudioBlob, pronunciationAudioTempKey],
  );

  const onSubmit = async (data: BrandSignupData) => {
    try {
      const email = data.email.trim().toLowerCase();

      if (registeredUser) {
        toast.success("Profile already created");
        queryClient.setQueryData(authMeQueryKey, registeredUser);
        const callback = searchParams.get("callbackUrl");
        const target = resolveImmediatePostAuthPath(registeredUser, callback);
        beginClientNavigation();
        window.location.replace(target);
        return;
      }

      setSubmitStatus("uploading");
      const [logoKey, brandPronunciationAudioKey] = await Promise.all([
        uploadLogo(email),
        uploadPronunciationAudio(email),
      ]);

      setSubmitStatus("registering");
      const result = await registerBrand({
        email,
        password: data.password,
        contactFullName: data.contactFullName.trim(),
        contactEmail: data.contactEmail.trim(),
        contactPhone: data.contactPhone.trim(),
        brandName: data.brandName.trim(),
        ...(logoKey ? { logoKey } : {}),
        ...(brandPronunciationAudioKey ? { brandPronunciationAudioKey } : {}),
        ...(normalizeOptionalText(data.website)
          ? { website: normalizeOptionalText(data.website) }
          : {}),
        ...(normalizeOptionalText(data.instagramUrl)
          ? { instagramUrl: normalizeOptionalText(data.instagramUrl) }
          : {}),
        productType: data.productType,
        categories: data.categories as BrandCategoryApi[],
        ...(data.categories.includes("OTHER")
          ? { otherCategoryLabel: data.otherCategoryLabel?.trim() }
          : {}),
      });

      setRegisteredUser(result.user);

      toast.success("Brand profile created");
      queryClient.setQueryData(authMeQueryKey, result.user);
      const callback = searchParams.get("callbackUrl");
      const target = resolveImmediatePostAuthPath(result.user, callback);
      beginClientNavigation();
      window.location.replace(target);
    } catch (error) {
      toast.error(
        brandSignupErrorMessage(
          error,
          "Could not create brand profile. Please try again.",
        ),
      );
    } finally {
      setSubmitStatus("idle");
    }
  };

  const selectedCategories = form.watch("categories");
  const showOtherCategoryLabel = selectedCategories.includes("OTHER");

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!categoriesOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(e.target as Node)
      ) {
        setCategoriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoriesOpen]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex h-full flex-col bg-[#fdfcfb] dark:bg-slate-950"
    >
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-[#fdfcfb] py-4 px-6 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Create your brand profile
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <p className="text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login?role=brand"
                className="font-semibold text-slate-900 hover:underline dark:text-slate-50"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-8 pt-6 pb-8 [scrollbar-width:thin] [scrollbar-color:var(--ink-4)_transparent]">
        <div className="space-y-6">
          <div className="space-y-3">
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
                <Label
                  htmlFor="email"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Account email <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800">
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
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="password"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8+ characters"
                  className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#3e76ef] focus-visible:ring-[3px] focus-visible:ring-[#3e76ef]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                2
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Contact & Verification
              </h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label
                    htmlFor="contactFullName"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactFullName"
                    placeholder="Jane Doe"
                    className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#3e76ef] focus-visible:ring-[3px] focus-visible:ring-[#3e76ef]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950"
                    {...form.register("contactFullName")}
                  />
                  {form.formState.errors.contactFullName && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.contactFullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="contactEmail"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Contact Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="jane@company.com"
                    className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#3e76ef] focus-visible:ring-[3px] focus-visible:ring-[#3e76ef]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950"
                    {...form.register("contactEmail")}
                  />
                  {form.formState.errors.contactEmail && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.contactEmail.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="contactPhone"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Phone number <span className="text-red-500">*</span>
                </Label>
                <div className="grid gap-3">
                  <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden w-full transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800">
                    <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-4 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[15px] font-semibold text-[#8b8489]">
                      +91
                    </div>
                    <Input
                      id="contactPhone"
                      placeholder="9876543210"
                      autoComplete="tel-national"
                      inputMode="tel"
                      aria-invalid={phoneError ? true : undefined}
                      className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-[15px] font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                      value={
                        phoneInput.startsWith("+91")
                          ? phoneInput.slice(3)
                          : phoneInput
                      }
                      onChange={(event) => {
                        let val = event.target.value;
                        if (val.startsWith("+91")) val = val.slice(3);
                        const digits = val.replace(/\D/g, "");
                        const next = digits ? `+91${digits}` : "";
                        setPhoneInput(next);
                        setPhoneError(null);
                        form.setValue("contactPhone", next, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500">{phoneError}</p>
                  )}
                </div>
                {form.formState.errors.contactPhone && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.contactPhone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                3
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                About Your Brand
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label
                    htmlFor="brandName"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Brand Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] dark:bg-slate-950 dark:border-slate-800">
                    <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                      <Building2 className="size-4" />
                    </div>
                    <Input
                      id="brandName"
                      placeholder="Acme Corp"
                      className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                      {...form.register("brandName")}
                    />
                  </div>
                  {form.formState.errors.brandName && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.brandName.message}
                    </p>
                  )}
                </div>

                <BrandPronunciationAudioField
                  disabled={pendingAny || Boolean(registeredUser)}
                  uploading={
                    submitStatus === "uploading" &&
                    Boolean(pronunciationAudioBlob)
                  }
                  audioUrl={pronunciationAudioPreviewUrl}
                  hasRecording={Boolean(
                    pronunciationAudioBlob || pronunciationAudioTempKey,
                  )}
                  onRecordingReady={handlePronunciationBlob}
                  onRemove={clearPronunciationAudio}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                    Brand Logo
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload your brand's logo directly.
                  </p>
                </div>

                <div className="flex gap-2 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-900">
                  <button
                    type="button"
                    disabled={pendingAny}
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm transition-colors disabled:opacity-60 dark:bg-slate-800 dark:text-white"
                  >
                    <Upload className="size-3.5" />
                    Upload file
                  </button>
                  {/* <button
                    type="button"
                    disabled
                    title="Drive link uploads are coming soon"
                    className="flex cursor-not-allowed items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold text-slate-400 opacity-60 dark:text-slate-500"
                  >
                    <svg
                      className="size-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12.01 2.25 2.61 18.52h6.14l6.33-10.96-3.07-5.31Zm10.23 18.06h-12L4.09 9.35l6 10.4 12.15.56Zm-15.53-2.02 3.07-5.31 9.4 16.28h-6.14l-6.33-10.97Z" />
                    </svg>
                    Drive link
                  </button> */}
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
                      : "border-slate-200 hover:bg-slate-50 hover:border-[#3e76ef] dark:border-slate-800 dark:hover:border-[#3e76ef]"
                  )}
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
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

                {logoFile && (
                  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950 mt-3">
                    <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3e76ef] to-[#8b5cf6] text-white">
                      <Upload className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold text-slate-900 truncate dark:text-white">
                        {logoFile.name}
                      </p>
                      <p className="text-[13px] text-slate-500 mt-0.5">
                        {formatBytes(logoFile.size)} &middot;{" "}
                        {logoFile.type || "image"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pendingAny}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogoFile(null);
                        setLogoTempKey(null);
                        setLogoError(null);
                      }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 ml-2"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                4
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Product Details
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                  Product Type <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "PHYSICAL", label: "Physical", icon: Package },
                    { value: "DIGITAL", label: "Digital", icon: MonitorPlay },
                    { value: "BOTH", label: "Both", icon: ShoppingBag },
                  ] as const).map((type) => {
                    const isSelected = form.watch("productType") === type.value;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          form.setValue("productType", type.value, {
                            shouldValidate: true,
                          })
                        }
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                          isSelected
                            ? "border-[#3e76ef] bg-[#3e76ef]/5 text-[#3e76ef] ring-1 ring-[#3e76ef] dark:bg-[#3e76ef]/10"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700",
                        )}
                      >
                        <Icon className="size-5" />
                        <span className="text-[13px] font-bold">
                          {type.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 rounded-full bg-[#3e76ef] p-0.5 text-white">
                            <Check className="size-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.productType && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.productType.message}
                  </p>
                )}
              </div>

              <div className="space-y-1 relative" ref={categoriesRef}>
                <Label className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                  Categories <span className="text-red-500">*</span>
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCategoriesOpen(!categoriesOpen);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between min-h-[42px] rounded-[11px] border bg-white px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 cursor-pointer dark:bg-slate-950",
                    selectedCategories.length === 0
                      ? "border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] text-slate-500 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                      : "border-[#3e76ef] text-slate-900 dark:text-slate-50 dark:border-[#3e76ef] focus-visible:ring-2 focus-visible:ring-[#3e76ef]/20",
                  )}
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedCategories.length > 0
                      ? selectedCategories.map((slug) => {
                          const label =
                            BRAND_CATEGORIES.find((c) => c.slug === slug)
                              ?.label || slug;
                          return (
                            <div
                              key={slug}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#3e76ef]/10 pl-3 pr-1.5 py-1 text-sm font-semibold text-[#3e76ef] dark:bg-[#3e76ef]/20"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {label}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = selectedCategories.filter(
                                    (c) => c !== slug,
                                  );
                                  form.setValue("categories", next, {
                                    shouldValidate: true,
                                  });
                                }}
                                className="flex size-4 items-center justify-center rounded-full bg-[#3e76ef]/20 text-[#3e76ef] hover:bg-[#3e76ef]/30"
                              >
                                <X className="size-2.5" />
                              </button>
                            </div>
                          );
                        })
                      : "Select categories..."}
                  </div>
                  <ChevronDown
                    className={cn(
                      "ml-2 size-4 shrink-0 opacity-50 transition-transform",
                      categoriesOpen && "rotate-180",
                    )}
                  />
                </div>

                {categoriesOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {BRAND_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategories.includes(
                          cat.slug,
                        );
                        return (
                          <label
                            key={cat.slug}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              isSelected
                                ? "bg-[#3e76ef]/10 text-[#3e76ef] dark:bg-[#3e76ef]/20"
                                : "hover:bg-slate-100 dark:hover:bg-slate-900",
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...selectedCategories, cat.slug]
                                  : selectedCategories.filter(
                                      (s) => s !== cat.slug,
                                    );
                                form.setValue("categories", next, {
                                  shouldValidate: true,
                                });
                              }}
                              className={cn(
                                "border-slate-300 data-[state=checked]:bg-[#3e76ef] data-[state=checked]:border-[#3e76ef] data-[state=checked]:text-white",
                                isSelected ? "border-[#3e76ef]" : "",
                              )}
                            />
                            <span className="font-medium">{cat.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {form.formState.errors.categories && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.categories.message}
                  </p>
                )}
              </div>

              {showOtherCategoryLabel && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <Label
                    htmlFor="otherCategoryLabel"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Please specify <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="otherCategoryLabel"
                    placeholder="What industry is your brand in?"
                    className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#3e76ef] focus-visible:ring-[3px] focus-visible:ring-[#3e76ef]/[0.13] dark:bg-slate-950 dark:border-slate-800"
                    {...form.register("otherCategoryLabel")}
                  />
                  {form.formState.errors.otherCategoryLabel && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.otherCategoryLabel.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                5
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Online Presence
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="website"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Website
                </Label>
                <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <Globe className="size-4" />
                  </div>
                  <Input
                    id="website"
                    placeholder="https://acme.com"
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    {...form.register("website")}
                  />
                </div>
                {form.formState.errors.website && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.website.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="instagramUrl"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Instagram
                </Label>
                <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <Instagram className="size-4" />
                  </div>
                  <Input
                    id="instagramUrl"
                    placeholder="https://instagram.com/acme"
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    {...form.register("instagramUrl")}
                  />
                </div>
                {form.formState.errors.instagramUrl && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.instagramUrl.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 space-y-4 border-t border-slate-200 bg-[#fdfcfb] py-5 px-6 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={form.watch("termsAccepted")}
            onCheckedChange={(checked) =>
              form.setValue("termsAccepted", checked === true, {
                shouldValidate: true,
              })
            }
            className="mt-[4px] shrink-0 h-4 w-4 border border-slate-300 accent-[#3e76ef] data-[state=checked]:bg-[#3e76ef] data-[state=checked]:border-[#3e76ef] data-[state=checked]:text-white dark:border-slate-600"
          />
          <div className="mt-0.5 space-y-1 leading-none">
            <Label
              htmlFor="terms"
              className="text-[13px] font-normal text-slate-600 dark:text-slate-400"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
              >
                Brand Terms
              </Link>
              {", "}
              <Link
                href="/privacy"
                className="font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
              >
                Privacy Policy
              </Link>
              {", and confirm I'm authorized to represent this brand."}
            </Label>
            {form.formState.errors.termsAccepted && (
              <p className="text-xs text-red-500">
                {form.formState.errors.termsAccepted.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Button
            type="submit"
            disabled={pendingAny}
            className="h-11 flex-1 rounded-full bg-[#F2F2F2] text-[15px] font-bold text-[#8B8489] hover:bg-[#E8E8E8] hover:text-[#7A7579] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {submitStatus === "uploading"
              ? "Uploading assets..."
              : submitStatus === "registering"
                ? "Creating profile..."
                : registeredUser
                  ? "Redirecting..."
                  : "Create my brand profile ->"}
          </Button>

          <div className="text-right text-[11px] text-[#8B8489] leading-tight">
            Looking for Brands? <br />
            <Link
              href="/register/creator"
              className="font-bold text-slate-950 hover:underline dark:text-slate-50 text-[13px]"
            >
              Sign up as a creator
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
