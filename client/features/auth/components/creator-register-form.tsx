"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { State, City } from "country-state-city";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import {
  Eye,
  EyeOff,
  Upload,
  Video,
  Instagram,
  Check,
  Activity,
  Utensils,
  Plane,
  Smartphone,
  Home,
  Heart,
  Shirt,
  Sparkles,
  Tag,
  X,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import {
  presignCreatorPortfolioVideo,
  putFileToPresignedUrl,
  registerCreator,
  sendSignupPhoneOtp,
} from "@/features/auth/api/creator-signup";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { useCreatorCategorySuggestionsQuery } from "@/features/creators/hooks/use-creator-suggestion-queries";
import { cn } from "@/lib/utils";

const PHONE_OTP_RESEND_SECONDS = 60;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;
/** Set to true when signup OTP verification is re-enabled (matches server). */
const SIGNUP_OTP_VERIFICATION_ENABLED = false;
const MAX_PORTFOLIO_VIDEO_BYTES = 200 * 1024 * 1024;
const ACCEPTED_PORTFOLIO_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
const GOOGLE_DRIVE_LINK_REGEX =
  /^https:\/\/(drive\.google\.com|docs\.google\.com)\/.+/i;

type PortfolioInputMode = "upload" | "drive";

function isValidGoogleDriveLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return GOOGLE_DRIVE_LINK_REGEX.test(trimmed);
}

const creatorSignupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  age: z
    .number({ message: "Age is required and must be a number" })
    .min(13, "Must be at least 13")
    .max(120, "Invalid age"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    message: "Gender is required",
  }),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone is required"),
  phoneOtpCode: SIGNUP_OTP_VERIFICATION_ENABLED
    ? z
        .string()
        .regex(OTP_CODE_REGEX, "Enter the verification code from the SMS")
    : z.string().optional().or(z.literal("")),
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  bio: z.string().min(10, "Please write a short bio").max(5000),
  instagramUrl: z
    .string()
    .min(1, "Instagram handle is required")
    .max(500),
  driveLink: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || isValidGoogleDriveLink(val), {
      message: "Enter a valid Google Drive sharing link",
    }),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
});

type CreatorSignupData = z.infer<typeof creatorSignupSchema>;

const SIGNUP_FIELD_LABELS: Partial<Record<keyof CreatorSignupData, string>> = {
  name: "Full name",
  age: "Age",
  gender: "Gender",
  city: "City",
  state: "State",
  country: "Country",
  phone: "Phone number",
  phoneOtpCode: "Phone verification code",
  email: "Email",
  bio: "Short bio (at least 10 characters)",
  instagramUrl: "Instagram handle",
  driveLink: "Google Drive portfolio link",
  categories: "At least one category",
  password: "Password (at least 8 characters)",
  termsAccepted: "Terms acceptance",
};

function getCreatorSignupBlockers(
  values: CreatorSignupData,
  ctx: {
    activeOtpPhone: string | null;
    hasPortfolioVideo: boolean;
    portfolioInputMode: PortfolioInputMode;
  },
): string[] {
  const blockers: string[] = [];
  if (ctx.portfolioInputMode === "drive") {
    if (!isValidGoogleDriveLink(values.driveLink ?? "")) {
      blockers.push("Google Drive portfolio link");
    }
  } else if (!ctx.hasPortfolioVideo) {
    blockers.push("Upload at least one portfolio video");
  }
  // if (SIGNUP_OTP_VERIFICATION_ENABLED) {
  //   const phone = values.phone.trim();
  //   if (!ctx.activeOtpPhone || phone !== ctx.activeOtpPhone) {
  //     blockers.push("Verify your phone with OTP");
  //   }
  // }

  const parsed = creatorSignupSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreatorSignupData | undefined;
      const label = key ? SIGNUP_FIELD_LABELS[key] : undefined;
      if (label && !blockers.includes(label)) blockers.push(label);
    }
  }
  return blockers;
}

function isCreatorSignupReady(
  values: CreatorSignupData,
  ctx: {
    activeOtpPhone: string | null;
    hasPortfolioVideo: boolean;
    portfolioInputMode: PortfolioInputMode;
  },
): boolean {
  return getCreatorSignupBlockers(values, ctx).length === 0;
}

const CATEGORY_SUGGESTIONS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

const CATEGORY_ICON_BY_SLUG: Record<string, LucideIcon> = {
  fashion: Shirt,
  beauty_skincare: Sparkles,
  fitness_gym: Activity,
  food_cooking: Utensils,
  travel: Plane,
  technology_gadgets: Smartphone,
  home_lifestyle: Home,
  health_wellness: Heart,
};

const DEFAULT_CATEGORY_ICON = Tag;

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

function creatorSignupErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait before trying again.";
    }
    if (error.response?.status === 503) {
      return "This service is temporarily unavailable.";
    }
  }

  return readApiErrorMessage(error) ?? fallback;
}

function normalizePhoneForSignup(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("+")) return trimmed;
  return `+${trimmed.replace(/\D/g, "")}`;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validatePortfolioVideoFile(file: File): string | null {
  if (
    !ACCEPTED_PORTFOLIO_VIDEO_TYPES.includes(
      file.type as (typeof ACCEPTED_PORTFOLIO_VIDEO_TYPES)[number],
    )
  ) {
    return "Upload an MP4, MOV, or WebM video.";
  }
  if (file.size > MAX_PORTFOLIO_VIDEO_BYTES) {
    return "Portfolio video must be 200 MB or smaller.";
  }
  return null;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function CreatorRegisterForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);
  const [portfolioVideoFiles, setPortfolioVideoFiles] = useState<File[]>([]);
  const [portfolioVideoTempKeys, setPortfolioVideoTempKeys] = useState<string[]>(
    [],
  );
  const [portfolioVideoError, setPortfolioVideoError] = useState<string | null>(
    null,
  );
  const [portfolioVideoStatus, setPortfolioVideoStatus] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");
  const [portfolioInputMode, setPortfolioInputMode] =
    useState<PortfolioInputMode>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categorySuggestionsQuery = useCreatorCategorySuggestionsQuery({
    staleTime: CATEGORY_SUGGESTIONS_CACHE_MS,
    gcTime: CATEGORY_SUGGESTIONS_CACHE_MS,
  });

  const categoryOptions = useMemo(
    () =>
      (categorySuggestionsQuery.data ?? [])
        .map((item) => ({
          slug: item.slug?.trim() ?? "",
          label: item.name.trim(),
        }))
        .filter((item) => item.slug && item.label),
    [categorySuggestionsQuery.data],
  );

  const categoryLabelBySlug = useMemo(
    () => new Map(categoryOptions.map((c) => [c.slug, c.label])),
    [categoryOptions],
  );

  const form = useForm<CreatorSignupData>({
    resolver: zodResolver(creatorSignupSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      age: "" as unknown as number,
      city: "",
      state: "",
      country: "India",
      email: "",
      bio: "",
      instagramUrl: "",
      driveLink: "",
      categories: [],
      password: "",
      termsAccepted: false,
      phone: "",
      phoneOtpCode: "",
    },
  });

  const watchState = form.watch("state");
  
  const indiaStates = useMemo(() => State.getStatesOfCountry("IN"), []);
  
  const selectedStateCode = useMemo(() => {
    return indiaStates.find((s) => s.name === watchState)?.isoCode || "";
  }, [indiaStates, watchState]);

  const stateCities = useMemo(() => {
    if (!selectedStateCode) return [];
    const cities = City.getCitiesOfState("IN", selectedStateCode);
    return Array.from(new Set(cities.map((c) => c.name)));
  }, [selectedStateCode]);

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

  const sendSignupPhoneOtpMutation = useMutation({
    mutationKey: ["auth", "signup", "phone", "send-otp"],
    mutationFn: sendSignupPhoneOtp,
    onSuccess: (_result, variables) => {
      const now = Date.now();
      setOtpSentToPhone(variables.phone);
      setPhoneError(null);
      setOtpClockTick(now);
      setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      form.setValue("phone", variables.phone, { shouldValidate: true });
      form.setValue("phoneOtpCode", "");
      form.clearErrors("phoneOtpCode");
      toast.success("Verification code sent");
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 429) {
        const now = Date.now();
        setOtpClockTick(now);
        setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      }
      const message = creatorSignupErrorMessage(
        error,
        "Could not send verification code. Check the number and try again.",
      );
      setPhoneError(message);
      toast.error(message);
    },
  });

  const registerCreatorMutation = useMutation({
    mutationKey: ["auth", "register", "creator"],
    mutationFn: registerCreator,
    onSuccess: (result) => {
      toast.success("Creator profile created");
      queryClient.setQueryData(authMeQueryKey, result.user);
      const callback = searchParams.get("callbackUrl");
      const target = resolveImmediatePostAuthPath(result.user, callback);
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => {
      toast.error(
        creatorSignupErrorMessage(
          error,
          "Could not create creator profile. Please try again.",
        ),
      );
    },
  });

  const pendingSubmit =
    registerCreatorMutation.isPending || portfolioVideoStatus === "uploading";
  const pendingAny = pendingSubmit || sendSignupPhoneOtpMutation.isPending;

  const signupFormValues = form.watch();
  const hasPortfolioVideo =
    portfolioVideoFiles.length > 0 || portfolioVideoTempKeys.length > 0;
  const signupBlockers = useMemo(
    () =>
      getCreatorSignupBlockers(signupFormValues, {
        activeOtpPhone,
        hasPortfolioVideo,
        portfolioInputMode,
      }),
    [signupFormValues, activeOtpPhone, hasPortfolioVideo, portfolioInputMode],
  );
  const isSignupComplete = signupBlockers.length === 0;

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
    form.setValue("phone", phone, { shouldValidate: true });
    form.setValue("phoneOtpCode", "");
    form.clearErrors("phoneOtpCode");
    sendSignupPhoneOtpMutation.mutate({ phone });
  }, [form, phoneInput, sendSignupPhoneOtpMutation]);

  const handlePortfolioVideoFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files);
      let error: string | null = null;
      for (const file of newFiles) {
        error = validatePortfolioVideoFile(file);
        if (error) break;
      }

      if (error) {
        setPortfolioVideoError(error);
        toast.error(error);
        return;
      }

      setPortfolioVideoFiles((prev) => [...prev, ...newFiles]);
      setPortfolioVideoTempKeys([]);
      setPortfolioVideoStatus("idle");
      setPortfolioVideoError(null);
    },
    [],
  );

  const uploadPortfolioVideos = useCallback(
    async (email: string): Promise<string[]> => {
      if (
        portfolioVideoTempKeys.length === portfolioVideoFiles.length &&
        portfolioVideoFiles.length > 0
      ) {
        return portfolioVideoTempKeys;
      }
      if (portfolioVideoFiles.length === 0) {
        throw new Error(
          "Upload at least one portfolio video before creating your profile.",
        );
      }

      setPortfolioVideoStatus("uploading");
      setPortfolioVideoError(null);

      const keys: string[] = [];
      for (const file of portfolioVideoFiles) {
        const presign = await presignCreatorPortfolioVideo({
          email,
          contentType: file.type,
          contentLength: file.size,
        });
        await putFileToPresignedUrl(file, presign);
        keys.push(presign.key);
      }

      setPortfolioVideoTempKeys(keys);
      setPortfolioVideoStatus("uploaded");
      return keys;
    },
    [portfolioVideoFiles, portfolioVideoTempKeys],
  );

  const onSubmit = async (data: CreatorSignupData) => {
    // if (SIGNUP_OTP_VERIFICATION_ENABLED) {
    //   if (!activeOtpPhone || data.phone !== activeOtpPhone) {
    //     const message = "Send a verification code for this mobile number.";
    //     setPhoneError(message);
    //     toast.error(message);
    //     return;
    //   }
    // }

    const driveLink = normalizeOptionalText(data.driveLink);
    const useDrivePortfolio = portfolioInputMode === "drive";

    if (useDrivePortfolio) {
      if (!isValidGoogleDriveLink(driveLink ?? "")) {
        const message =
          "Paste a valid Google Drive link (Anyone with the link → Viewer).";
        form.setError("driveLink", { message });
        toast.error(message);
        return;
      }
    } else if (
      portfolioVideoFiles.length === 0 &&
      portfolioVideoTempKeys.length === 0
    ) {
      const message =
        "Upload at least one portfolio video before creating your profile.";
      setPortfolioVideoError(message);
      toast.error(message);
      return;
    }

    try {
      const email = data.email.trim().toLowerCase();
      const portfolioVideoKeys = useDrivePortfolio
        ? []
        : await uploadPortfolioVideos(email);
      registerCreatorMutation.mutate({
        email,
        password: data.password,
        name: data.name.trim(),
        phone: data.phone.trim(),
        ...(SIGNUP_OTP_VERIFICATION_ENABLED
          ? { phoneOtpCode: data.phoneOtpCode?.trim() ?? "" }
          : {}),
        age: data.age,
        gender: data.gender,
        city: data.city.trim(),
        state: data.state.trim(),
        country: data.country.trim(),
        bio: normalizeOptionalText(data.bio),
        instagramUrl: normalizeOptionalText(data.instagramUrl),
        driveLink: useDrivePortfolio ? driveLink : undefined,
        categorySlugs: data.categories,
        portfolioSignupVideoTempKeys:
          portfolioVideoKeys.length > 0 ? portfolioVideoKeys : undefined,
      });
    } catch (error) {
      setPortfolioVideoStatus("idle");
      const message = creatorSignupErrorMessage(
        error,
        "Could not upload portfolio video. Please try again.",
      );
      setPortfolioVideoError(message);
      toast.error(message);
    }
  };

  const selectedCategories = form.watch("categories");
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
      className="flex min-w-0 flex-col bg-[#fdfcfb] dark:bg-slate-950 xl:min-h-0 xl:h-full"
    >
      <div className="shrink-0 sticky top-0 z-20 border-b border-slate-200 bg-[#fdfcfb] px-4 py-3 sm:px-6 sm:py-4 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Create your creator profile
            </h1>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm lg:items-end">
            <p className="text-slate-500">
              Already a creator?{" "}
              <Link
                href="/login?role=creator"
                className="font-semibold text-slate-900 hover:underline dark:text-slate-50"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 px-4 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8 md:px-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--ink-4)_transparent]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                1
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                About You
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="name"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Full name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="age"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Age <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g. 24"
                    className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                    {...form.register("age", { valueAsNumber: true })}
                  />
                  {form.formState.errors.age && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.age.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="gender"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.watch("gender")}
                    onValueChange={(val) =>
                      form.setValue("gender", val as CreatorSignupData["gender"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger
                      id="gender"
                      className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus:border-[#ef3e51] focus:ring-[3px] focus:ring-[#ef3e51]/[0.13] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-700 dark:focus:ring-slate-800"
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.gender && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.gender.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-1">
                <Label
                  htmlFor="country"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="country"
                  value="India"
                  readOnly
                  className="h-[42px] rounded-[11px] border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                  {...form.register("country")}
                />
                {form.formState.errors.country && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.country.message}
                  </p>
                )}
              </div>
           
                <div className="space-y-1">
                  <Label
                    htmlFor="state"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      const selectedState = indiaStates.find((s) => s.isoCode === val);
                      if (selectedState) {
                        form.setValue("state", selectedState.name, { shouldValidate: true });
                        form.setValue("city", "", { shouldValidate: true });
                      }
                    }}
                    value={selectedStateCode}
                  >
                    <SelectTrigger
                      id="state"
                      className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus:border-[#ef3e51] focus:ring-[3px] focus:ring-[#ef3e51]/[0.13] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-700 dark:focus:ring-slate-800"
                    >
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {indiaStates.map((state) => (
                        <SelectItem key={state.isoCode} value={state.isoCode}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.state && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.state.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="city"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={(val) => form.setValue("city", val, { shouldValidate: true })}
                    value={form.watch("city")}
                    disabled={!selectedStateCode}
                  >
                    <SelectTrigger
                      id="city"
                      className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus:border-[#ef3e51] focus:ring-[3px] focus:ring-[#ef3e51]/[0.13] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-700 dark:focus:ring-slate-800"
                    >
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateCities.map((cityName) => (
                        <SelectItem key={cityName} value={cityName}>
                          {cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.city && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                2
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                {SIGNUP_OTP_VERIFICATION_ENABLED
                  ? "Contact & Verification"
                  : "Contact"}
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="phone"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Phone number <span className="text-red-500">*</span>
                </Label>
                <div className="grid gap-3">
                  <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden w-full transition-[border-color,box-shadow] duration-150 focus-within:border-[#ef3e51] focus-within:ring-[3px] focus-within:ring-[#ef3e51]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800 dark:focus-within:border-slate-700 dark:focus-within:ring-slate-800">
                    <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-4 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[15px] font-semibold text-[#8b8489]">
                      +91
                    </div>
                    <Input
                      id="creator-signup-phone"
                      placeholder="0123456789"
                      autoComplete="tel-national"
                      inputMode="tel"
                      disabled={pendingAny}
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
                        form.setValue("phone", next, {
                          shouldValidate: true,
                        });
                        form.setValue("phoneOtpCode", "");
                        form.clearErrors("phoneOtpCode");
                      }}
                    />
                    {SIGNUP_OTP_VERIFICATION_ENABLED ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSendPhoneOtp}
                        disabled={
                          pendingAny ||
                          !PHONE_E164_REGEX.test(normalizedPhone) ||
                          (resendSecondsRemaining > 0 && Boolean(activeOtpPhone))
                        }
                        className={cn(
                          "h-full rounded-none px-5 text-[14px] font-bold transition-colors border-l border-slate-200 dark:border-slate-800",
                          activeOtpPhone
                            ? "bg-[#f4f1f1] text-[#ef3e51] hover:bg-black hover:text-white dark:bg-slate-900 dark:hover:bg-white dark:hover:text-black disabled:text-slate-400 disabled:bg-[#f4f1f1] dark:disabled:bg-slate-900 disabled:opacity-70"
                            : "bg-[#f4f1f1] text-[#8b8489] hover:bg-black hover:text-white dark:bg-slate-900 dark:hover:bg-white dark:hover:text-black dark:text-slate-300 disabled:opacity-70",
                        )}
                      >
                        {sendSignupPhoneOtpMutation.isPending
                          ? "Sending..."
                          : resendSecondsRemaining > 0 && activeOtpPhone
                            ? `Resend ${resendSecondsRemaining}s`
                            : activeOtpPhone
                              ? "Resend"
                              : "Send OTP"}
                      </Button>
                    ) : null}
                  </div>
                  {SIGNUP_OTP_VERIFICATION_ENABLED ? (
                    <>
                      {phoneError ? (
                        <p className="text-xs text-red-500">{phoneError}</p>
                      ) : activeOtpPhone ? (
                        <p className="text-xs font-medium text-green-600 dark:text-green-500">
                          Enter the verification code from the SMS
                        </p>
                      ) : null}
                      {activeOtpPhone ? (
                        <div className="mt-[10px] overflow-x-auto rounded-[11px] border border-[#ffebed] bg-[#fff5f6] px-3 py-2.5 dark:border-red-500/20 dark:bg-red-500/10 sm:px-[12px] sm:py-[10px]">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-[10px]">
                            <Label
                              htmlFor="creator-signup-phone-otp"
                              className="text-[13px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap"
                            >
                              Enter OTP
                            </Label>
                            <div className="relative flex items-center gap-1.5 group sm:gap-2">
                              <style>{`
                            @keyframes otp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                          `}</style>
                              <Input
                                id="creator-signup-phone-otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                disabled={pendingAny}
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
                                      "relative flex size-9 items-center justify-center rounded-xl border bg-white text-lg font-bold shadow-[0_2px_4px_rgb(0,0,0,0.02)] transition-colors sm:size-[42px] sm:text-[20px] dark:bg-slate-900",
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
                        </div>
                      ) : null}
                    </>
                  ) : phoneError ? (
                    <p className="text-xs text-red-500">{phoneError}</p>
                  ) : null}
                </div>
                {form.formState.errors.phone && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phone.message}
                  </p>
                )}
                {SIGNUP_OTP_VERIFICATION_ENABLED &&
                form.formState.errors.phoneOtpCode ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phoneOtpCode.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="email"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#ef3e51] focus-within:ring-[3px] focus-within:ring-[#ef3e51]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800 dark:focus-within:border-slate-700 dark:focus-within:ring-slate-800">
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
                    placeholder="you@example.com"
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                3
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                About Your Content
              </h2>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <Label
                  htmlFor="bio"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Short bio <span className="text-red-500">*</span>
                </Label>
                <span
                  className={cn(
                    "text-[11px]",
                    (form.watch("bio")?.length ?? 0) < 10
                      ? "text-slate-400"
                      : "text-green-600 dark:text-green-500",
                  )}
                >
                  {(form.watch("bio")?.length ?? 0) < 10
                    ? `${form.watch("bio")?.length ?? 0}/10 characters minimum`
                    : "2-3 sentences"}
                </span>
              </div>
              <Textarea
                id="bio"
                placeholder="Skincare-first creator with a soft, studio-lit style. I craft glow-up demos and ritual reels for D2C beauty brands."
                className="min-h-[80px] resize-y rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white p-3 text-sm transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:bg-slate-950 dark:border-slate-800 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                {...form.register("bio")}
              />
              {form.formState.errors.bio && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                4
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Portfolio
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="instagram"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Instagram handle <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#ef3e51] focus-within:ring-[3px] focus-within:ring-[#ef3e51]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800 dark:focus-within:border-slate-700 dark:focus-within:ring-slate-800">
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <Instagram className="size-4" />
                  </div>
                  <Input
                    id="instagramUrl"
                    placeholder="@yourhandle"
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

              <div className="space-y-3">
                <div>
                  <Label className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                    Portfolio <span className="text-red-500">*</span>
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload reels directly or share a Google Drive folder.
                  </p>
                </div>

                <div className="flex w-full gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900 sm:w-fit">
                  <button
                    type="button"
                    disabled={pendingAny}
                    onClick={() => {
                      setPortfolioInputMode("upload");
                      setPortfolioVideoError(null);
                      form.clearErrors("driveLink");
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 sm:flex-none sm:px-4",
                      portfolioInputMode === "upload"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                    )}
                  >
                    <Upload className="size-3.5" />
                    Upload file
                  </button>
                  <button
                    type="button"
                    disabled={pendingAny}
                    onClick={() => {
                      setPortfolioInputMode("drive");
                      setPortfolioVideoError(null);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 sm:flex-none sm:px-4",
                      portfolioInputMode === "drive"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                    )}
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
                  </button>
                </div>

                {portfolioInputMode === "drive" ? (
                  <div className="space-y-2">
                    <Input
                      id="driveLink"
                      placeholder="https://drive.google.com/drive/folders/..."
                      disabled={pendingAny}
                      className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] bg-white text-sm transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] dark:border-slate-800 dark:bg-slate-950"
                      {...form.register("driveLink")}
                    />
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                      <p className="font-bold">Before you paste your link</p>
                      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                        In Google Drive, open <span className="font-semibold">Share</span>{" "}
                        and enable{" "}
                        <span className="font-semibold">
                          &quot;Anyone with the link&quot;
                        </span>{" "}
                        → <span className="font-semibold">Viewer</span> access so
                        our team can review your portfolio.
                      </p>
                    </div>
                    {form.formState.errors.driveLink && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.driveLink.message}
                      </p>
                    )}
                  </div>
                ) : (
                <>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (pendingAny) return;
                    handlePortfolioVideoFiles(event.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed bg-[#fdfcfb] px-4 py-4 transition-colors dark:bg-slate-900/50 cursor-pointer lg:flex-row lg:items-center lg:gap-4 lg:px-6",
                    portfolioVideoError
                      ? "border-red-300"
                      : "border-slate-200 hover:bg-slate-50 hover:border-[#ef3e51] dark:border-slate-800 dark:hover:border-[#ef3e51]",
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_PORTFOLIO_VIDEO_TYPES.join(",")}
                    className="hidden"
                    disabled={pendingAny}
                    onChange={(event) => {
                      handlePortfolioVideoFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffebed] text-[#ef3e51] dark:bg-red-500/20">
                    <Video className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 sm:text-[15px] dark:text-white">
                      Drop your reels here, or{" "}
                      <span className="text-[#ef3e51] hover:text-[#d93849] underline decoration-[#ef3e51] underline-offset-2">
                        browse
                      </span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      MP4, MOV up to 200 MB per file &middot; 9:16 vertical preferred
                    </p>
                    {portfolioVideoError ? (
                      <p className="mt-1 text-xs text-red-500">
                        {portfolioVideoError}
                      </p>
                    ) : null}
                  </div>
                </div>

                {portfolioVideoFiles.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 mt-3 lg:grid-cols-3">
                    {portfolioVideoFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:gap-4 lg:px-4"
                      >
                        <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ef3e51] to-[#8b5cf6] text-white">
                          {portfolioVideoStatus === "uploading" ? (
                            <Spinner className="size-6 text-white" aria-hidden />
                          ) : (
                            <Video className="size-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate dark:text-white sm:text-[16px]">
                            {file.name}
                          </p>
                          <p className="text-[13px] text-slate-500 mt-0.5">
                            {formatBytes(file.size)} &middot;{" "}
                            {file.type || "video"}
                            {portfolioVideoStatus === "uploading" &&
                              " (Uploading...)"}
                            {portfolioVideoStatus === "uploaded" && " (Uploaded)"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={pendingAny}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPortfolioVideoFiles((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                            setPortfolioVideoTempKeys([]);
                            setPortfolioVideoStatus("idle");
                            if (portfolioVideoFiles.length === 1) {
                              setPortfolioVideoError(null);
                            }
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 sm:ml-2 self-end sm:self-auto"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                5
              </div>
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Categories
                <span className="text-[10px] lowercase tracking-normal opacity-70">
                  (multi-select)
                </span>
              </h2>
            </div>

            <div className="space-y-1">
              <div ref={categoriesRef}>
                <div
                  role="combobox"
                  aria-expanded={categoriesOpen}
                  tabIndex={0}
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCategoriesOpen(!categoriesOpen);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between min-h-[42px] rounded-[11px] border bg-white px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 dark:bg-slate-950 cursor-pointer outline-none",
                    selectedCategories.length === 0
                      ? "border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] text-slate-500 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                      : "border-red-400 text-slate-900 dark:text-slate-50 dark:border-red-500 focus-visible:ring-2 focus-visible:ring-red-100 dark:focus-visible:ring-red-900",
                  )}
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedCategories.length > 0
                      ? selectedCategories.map((slug) => {
                          const label = categoryLabelBySlug.get(slug) ?? slug;
                          return (
                            <div
                              key={slug}
                              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 pl-3 pr-1.5 py-1 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400"
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
                                className="flex size-4 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                              >
                                <X className="size-2.5" />
                              </button>
                            </div>
                          );
                        })
                      : "Select your categories..."}
                  </div>
                  <ChevronDown
                    className={cn(
                      "ml-2 size-4 shrink-0 opacity-50 transition-transform",
                      categoriesOpen && "rotate-180",
                    )}
                  />
                </div>
                {categoriesOpen && (
                  <div className="mt-1 rounded-lg border border-slate-200 bg-white p-2 max-h-80 overflow-y-auto dark:bg-slate-950 dark:border-slate-800 [scrollbar-width:thin] [scrollbar-color:var(--ink-4)_transparent]">
                    {categorySuggestionsQuery.isLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner className="size-5" />
                      </div>
                    ) : categorySuggestionsQuery.isError ? (
                      <p className="px-2 py-3 text-xs text-red-500">
                        Could not load categories. Please refresh and try again.
                      </p>
                    ) : categoryOptions.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-slate-500">
                        No categories available.
                      </p>
                    ) : (
                      categoryOptions.map((category) => {
                        const isSelected = selectedCategories.includes(
                          category.slug,
                        );
                        const CategoryIcon =
                          CATEGORY_ICON_BY_SLUG[category.slug] ??
                          DEFAULT_CATEGORY_ICON;
                        return (
                          <button
                            type="button"
                            key={category.slug}
                            onClick={() => {
                              const current = form.getValues("categories");
                              const checked = !isSelected;
                              const next = checked
                                ? [...current, category.slug]
                                : current.filter((c) => c !== category.slug);
                              form.setValue("categories", next, {
                                shouldValidate: true,
                              });
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 my-1 cursor-pointer text-left",
                              isSelected
                                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                : "text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-900",
                            )}
                          >
                            <div
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                isSelected
                                  ? "bg-red-500 text-white"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800",
                              )}
                            >
                              <CategoryIcon className="size-4" />
                            </div>
                            <span className="flex-1 font-medium">
                              {category.label}
                            </span>
                            <div
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded border",
                                isSelected
                                  ? "border-red-500 bg-red-500 text-white"
                                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950",
                              )}
                            >
                              {isSelected && (
                                <Check className="size-3.5 stroke-[3]" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {form.formState.errors.categories && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.categories.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                6
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Secure Your Account
              </h2>
            </div>

            <div className="space-y-1">
              <div className="flex flex-col items-start gap-1 lg:flex-row lg:items-center lg:gap-2">
                <Label
                  htmlFor="password"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Password <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  min 8 chars, mix letters + numbers + symbol
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  className="h-[42px] pr-10 rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 sticky bottom-0 z-10 space-y-4 border-t border-slate-200 bg-[#fdfcfb] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={form.watch("termsAccepted")}
            onCheckedChange={(checked) =>
              form.setValue("termsAccepted", checked === true, {
                shouldValidate: true,
              })
            }
            className="mt-0.5 shrink-0 h-4 w-4 border border-slate-300 accent-[#ef3e51] data-[state=checked]:bg-[#ef3e51] data-[state=checked]:border-[#ef3e51] data-[state=checked]:text-white dark:border-slate-600"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <Label
              htmlFor="terms"
              className="block min-w-0 text-[13px] font-normal leading-snug text-slate-600 dark:text-slate-400"
            >
              I agree to the{" "}
              <Link
                href="/legal/terms"
                className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
              >
                Terms of Service
              </Link>
              {", "}
              <Link
                href="/legal/privacy"
                className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
              >
                Privacy Policy
              </Link>
              {", and confirm I'm over 13."}
            </Label>
            {form.formState.errors.termsAccepted && (
              <p className="text-xs text-red-500">
                {form.formState.errors.termsAccepted.message}
              </p>
            )}
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
              disabled={!isSignupComplete || pendingSubmit}
              className={cn(
                "h-11 w-full rounded-full text-[15px] font-bold transition-colors lg:flex-1",
                isSignupComplete
                  ? "bg-[#ef3e51] text-white hover:bg-[#d63647] disabled:opacity-70 dark:bg-[#ef3e51] dark:hover:bg-[#d63647]"
                  : "bg-[#F2F2F2] text-[#8B8489] hover:bg-[#E8E8E8] hover:text-[#7A7579] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
              )}
            >
              {pendingSubmit ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Creating profile...
                </>
              ) : (
                <>Create my creator profile &rarr;</>
              )}
            </Button>

          <div className="w-full text-center text-[11px] text-[#8B8489] leading-tight lg:w-auto lg:shrink-0 lg:text-right">
            Hiring instead? <br />
            <Link
              href="/register/brand"
              className="font-bold text-slate-950 hover:underline dark:text-slate-50 text-[13px]"
            >
              Sign up as a brand
            </Link>
          </div>
          </div>
        </div>
      </div>
    </form>
  );
}
