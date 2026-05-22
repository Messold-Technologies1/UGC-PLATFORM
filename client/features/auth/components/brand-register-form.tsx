"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const PHONE_OTP_RESEND_SECONDS = 60;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;
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
    phoneOtpCode: z
      .string()
      .regex(OTP_CODE_REGEX, "Enter the verification code from the SMS"),
    brandName: z.string().min(1, "Brand name is required"),
    brandPronunciation: z.string().optional(),
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

function normalizePhoneForSignup(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("+")) return trimmed;
  return `+${trimmed.replace(/\D/g, "")}`;
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
  const [phoneInput, setPhoneInput] = useState("");
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BrandSignupData>({
    resolver: zodResolver(brandSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      contactFullName: "",
      contactEmail: "",
      contactPhone: "",
      phoneOtpCode: "",
      brandName: "",
      website: "",
      instagramUrl: "",
      categories: [],
      otherCategoryLabel: "",
      termsAccepted: false,
    },
  });

  const normalizedPhone = normalizePhoneForSignup(phoneInput);
  const activeOtpPhone =
    otpSentToPhone === normalizedPhone ? otpSentToPhone : null;
  const resendSecondsRemaining = otpResendAvailableAt
    ? Math.max(
        0,
        Math.ceil(
          (otpResendAvailableAt -
            (otpClockTick ||
              otpResendAvailableAt - PHONE_OTP_RESEND_SECONDS * 1000)) /
            1000,
        ),
      )
    : 0;

  useEffect(() => {
    if (!otpResendAvailableAt) return;
    const intervalId = window.setInterval(
      () => setOtpClockTick(Date.now()),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [otpResendAvailableAt]);

  const handleSendPhoneOtp = useCallback(() => {
    const phone = normalizePhoneForSignup(phoneInput);
    if (!PHONE_E164_REGEX.test(phone)) {
      const message =
        "Enter a mobile number in E.164 format, like +919876543210.";
      setPhoneError(message);
      toast.error(message);
      return;
    }

    setPhoneInput(phone);
    setPhoneError(null);
    form.setValue("contactPhone", phone, { shouldValidate: true });
    form.setValue("phoneOtpCode", "");
    form.clearErrors("phoneOtpCode");

    // Simulate OTP sending for UI purposes
    const now = Date.now();
    setOtpSentToPhone(phone);
    setOtpClockTick(now);
    setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
    toast.success("Verification code sent (Simulated)");
  }, [form, phoneInput]);

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

  const onSubmit = async (data: BrandSignupData) => {
    if (!activeOtpPhone || data.contactPhone !== activeOtpPhone) {
      const message = "Send a verification code for this mobile number.";
      setPhoneError(message);
      toast.error(message);
      return;
    }
    console.log("Brand Registration Submit (UI Only):", data);
    toast.success("Form submitted successfully! Check console for payload.");
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
                href="/login"
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
                        setOtpSentToPhone(null);
                        setPhoneError(null);
                        form.setValue("contactPhone", next, {
                          shouldValidate: true,
                        });
                        form.setValue("phoneOtpCode", "");
                        form.clearErrors("phoneOtpCode");
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSendPhoneOtp}
                      disabled={
                        !PHONE_E164_REGEX.test(normalizedPhone) ||
                        (resendSecondsRemaining > 0 && Boolean(activeOtpPhone))
                      }
                      className={cn(
                        "h-full rounded-none px-5 text-[14px] font-bold transition-colors border-l border-slate-200 dark:border-slate-800",
                        activeOtpPhone
                          ? "bg-[#f4f1f1] text-[#3e76ef] hover:bg-black hover:text-white dark:bg-slate-900 disabled:text-slate-400"
                          : "bg-[#f4f1f1] text-[#8b8489] hover:bg-black hover:text-white dark:bg-slate-900",
                      )}
                    >
                      {resendSecondsRemaining > 0 && activeOtpPhone
                        ? `Resend ${resendSecondsRemaining}s`
                        : activeOtpPhone
                          ? "Resend"
                          : "Send OTP"}
                    </Button>
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-red-500">{phoneError}</p>
                  ) : activeOtpPhone ? (
                    <p className="text-xs font-medium text-green-600 dark:text-green-500">
                      Enter the verification code from the SMS
                    </p>
                  ) : null}
                  {activeOtpPhone ? (
                    <div className="mt-[10px] flex items-center justify-between gap-[10px] rounded-[11px] border border-[#eef5fe] bg-[#f5f9ff] px-[12px] py-[10px] dark:border-blue-500/20 dark:bg-blue-500/10">
                      <div className="flex items-center gap-5">
                        <Label
                          htmlFor="brand-signup-phone-otp"
                          className="text-[13px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap"
                        >
                          Enter OTP
                        </Label>
                        <div className="relative flex items-center gap-2 group">
                          <style>{`@keyframes otp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
                          <Input
                            id="brand-signup-phone-otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            className="absolute inset-0 z-10 w-full h-full bg-transparent text-transparent caret-transparent border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 cursor-text p-0 m-0 opacity-0"
                            value={form.watch("phoneOtpCode")}
                            onChange={(e) => {
                              form.setValue(
                                "phoneOtpCode",
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                                { shouldValidate: true },
                              );
                            }}
                          />
                          {Array.from({ length: 6 }).map((_, i) => {
                            const code = form.watch("phoneOtpCode") || "";
                            const char = code[i];
                            const isActive = code.length === i;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "relative flex size-[42px] items-center justify-center rounded-xl border bg-white text-[20px] font-bold shadow-[0_2px_4px_rgb(0,0,0,0.02)] transition-colors dark:bg-slate-900",
                                  char
                                    ? "border-slate-300 text-slate-900 dark:border-slate-600 dark:text-white"
                                    : "border-slate-200 text-transparent dark:border-slate-800",
                                )}
                              >
                                {char || ""}
                                {isActive && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-focus-within:opacity-100">
                                    <div
                                      className="w-[1.5px] h-5 bg-slate-900 dark:bg-white"
                                      style={{
                                        animation:
                                          "otp-blink 1s step-end infinite",
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-[13px] font-bold text-[#3e76ef] hover:text-[#2c5ac4]"
                        onClick={() => {
                          if (form.getValues("phoneOtpCode").length === 6) {
                            toast.success("OTP verified format.");
                          } else {
                            form.setError("phoneOtpCode", {
                              message: "Enter 6-digit OTP",
                            });
                          }
                        }}
                      >
                        Verify
                      </button>
                    </div>
                  ) : null}
                </div>
                {form.formState.errors.contactPhone && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.contactPhone.message}
                  </p>
                )}
                {form.formState.errors.phoneOtpCode && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phoneOtpCode.message}
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

                <div className="space-y-1">
                  <Label
                    htmlFor="brandPronunciation"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Brand Pronunciation
                  </Label>
                  <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] dark:bg-slate-950 dark:border-slate-800">
                    <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                      <Mic className="size-4" />
                    </div>
                    <Input
                      id="brandPronunciation"
                      placeholder="Ak-mee"
                      className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                      {...form.register("brandPronunciation")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                  Brand Logo
                </Label>
                <div className="relative overflow-hidden rounded-[14px] border-2 border-dashed border-slate-200 hover:border-[#3e76ef]/50 hover:bg-[#3e76ef]/5 transition-colors dark:border-slate-800 dark:hover:border-[#3e76ef]/50 dark:hover:bg-[#3e76ef]/10">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleLogoFile(file);
                      e.target.value = "";
                    }}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    aria-label="Upload brand logo"
                  />
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#f4f1f1] text-[#8b8489] dark:bg-slate-900">
                      <Upload className="size-5" />
                    </div>
                    {logoFile ? (
                      <>
                        <p className="text-[14px] font-bold text-[#3e76ef] truncate max-w-[200px]">
                          {logoFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Click to change image
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                          Upload Brand Logo
                        </p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          JPG, PNG, or WebP up to 5MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {logoError && (
                  <p className="mt-1 text-xs text-red-500">{logoError}</p>
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
                  {[
                    { value: "PHYSICAL", label: "Physical", icon: Package },
                    { value: "DIGITAL", label: "Digital", icon: MonitorPlay },
                    { value: "BOTH", label: "Both", icon: ShoppingBag },
                  ].map((type) => {
                    const isSelected = form.watch("productType") === type.value;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          form.setValue("productType", type.value as any, {
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
            className="h-11 flex-1 rounded-full bg-[#F2F2F2] text-[15px] font-bold text-[#8B8489] hover:bg-[#E8E8E8] hover:text-[#7A7579] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Create my brand profile &rarr;
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
