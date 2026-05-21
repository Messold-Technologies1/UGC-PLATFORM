"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  X,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { PhoneVerificationField } from "./phone-verification-field";

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
  phoneVerified: z.boolean().refine((val) => val === true, {
    message: "Please verify your phone number",
  }),
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  bio: z.string().min(10, "Please write a short bio").max(5000),
  instagramUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  portfolioVideoLink: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
});

type CreatorSignupData = z.infer<typeof creatorSignupSchema>;

const CATEGORIES = [
  { slug: "fitness", label: "Fitness / Gym", icon: Activity },
  { slug: "food", label: "Food / Cooking", icon: Utensils },
  { slug: "travel", label: "Travel", icon: Plane },
  { slug: "technology", label: "Technology / Gadgets", icon: Smartphone },
  { slug: "lifestyle", label: "Home / Lifestyle", icon: Home },
  { slug: "health", label: "Health / Wellness", icon: Heart },
];

export function CreatorRegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [videoUploadType, setVideoUploadType] = useState<"upload" | "drive">(
    "upload",
  );

  const form = useForm<CreatorSignupData>({
    resolver: zodResolver(creatorSignupSchema),
    defaultValues: {
      name: "",
      age: "" as unknown as number,
      city: "",
      state: "",
      country: "India",
      email: "",
      bio: "",
      instagramUrl: "",
      portfolioVideoLink: "",
      categories: [],
      password: "",
      termsAccepted: false,
      phone: "",
      phoneVerified: false,
    },
  });

  const onSubmit = (data: CreatorSignupData) => {
    console.log("Form data:", data);
    // API integration goes here
  };

  const selectedCategories = form.watch("categories");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!categoriesOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoriesOpen]);

  const handleVerifiedChange = useCallback(
    (verified: boolean) => {
      form.setValue("phoneVerified", verified, {
        shouldValidate: true,
      });
    },
    [form],
  );

  const handleVerified = useCallback(() => {
    const phoneInput = (
      document.getElementById("creator-signup-phone") as HTMLInputElement
    )?.value;
    form.setValue("phone", `+91${phoneInput}`);
  }, [form]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex h-full flex-col bg-[#fdfcfb] dark:bg-slate-950"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-[#fdfcfb] py-4 px-6 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Create your creator profile
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <p className="text-slate-500">
              Already a creator?{" "}
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

      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
        <div className="space-y-6">
          {/* Section 1: About You */}
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
                  placeholder="Aanya Kapoor"
                  className="h-10 rounded-lg bg-white dark:bg-slate-950"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="22"
                    className="h-10 rounded-lg bg-white dark:bg-slate-950"
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
                    onValueChange={(val) => form.setValue("gender", val as any)}
                    defaultValue={form.getValues("gender")}
                  >
                    <SelectTrigger
                      id="gender"
                      className="h-10 rounded-lg bg-white dark:bg-slate-950"
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
            </div>
          </div>

          {/* Section 2: Contact & Verification */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                2
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Contact & Verification
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
                <PhoneVerificationField
                  idPrefix="creator-signup"
                  onVerifiedChange={handleVerifiedChange}
                  onVerified={handleVerified}
                />
                {form.formState.errors.phoneVerified && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phoneVerified.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="email"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center h-10 rounded-lg border border-slate-200 bg-white overflow-hidden dark:bg-slate-950 dark:border-slate-800 focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2 dark:focus-within:ring-slate-300">
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

          {/* Section 3: About Your Content */}
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
                <span className="text-[11px] text-slate-400">
                  2-3 sentences
                </span>
              </div>
              <Textarea
                id="bio"
                placeholder="Skincare-first creator with a soft, studio-lit style. I craft glow-up demos and ritual reels for D2C beauty brands."
                className="min-h-[80px] resize-y rounded-lg bg-white p-3 text-sm dark:bg-slate-950"
                {...form.register("bio")}
              />
              {form.formState.errors.bio && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Portfolio */}
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
                <div className="flex items-center h-10 rounded-lg border border-slate-200 bg-white overflow-hidden dark:bg-slate-950 dark:border-slate-800 focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2 dark:focus-within:ring-slate-300">
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <Instagram className="size-4" />
                  </div>
                  <Input
                    id="instagramUrl"
                    placeholder="https://instagram.com/yourhandle"
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
                    Portfolio video <span className="text-red-500">*</span>
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload directly or share a Drive / Dropbox link.
                  </p>
                </div>

                <div className="flex gap-2 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setVideoUploadType("upload")}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors",
                      videoUploadType === "upload"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                    )}
                  >
                    <Upload className="size-3.5" />
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoUploadType("drive")}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors",
                      videoUploadType === "drive"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                    )}
                  >
                    <svg
                      className="size-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12.01 2.25L2.61 18.52h6.14l6.33-10.96-3.07-5.31zm10.23 18.06h-12L4.09 9.35l6 10.4 12.15.56zm-15.53-2.02l3.07-5.31 9.4 16.28h-6.14l-6.33-10.97z" />
                    </svg>
                    Drive link
                  </button>
                </div>

                {videoUploadType === "upload" ? (
                  <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-[#fdfcfb] px-6 py-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/20">
                      <Video className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Drop your reel here, or{" "}
                        <button
                          type="button"
                          className="text-red-500 underline decoration-red-500 underline-offset-2 hover:text-red-600"
                        >
                          browse
                        </button>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        MP4, MOV up to 200 MB · 9:16 vertical preferred
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="size-4" />
                    </div>
                    <Input
                      placeholder="https://drive.google.com/..."
                      className="h-10 pl-10 rounded-lg bg-white dark:bg-slate-950"
                      {...form.register("portfolioVideoLink")}
                    />
                    {form.formState.errors.portfolioVideoLink && (
                      <p className="mt-1.5 text-xs text-red-500">
                        {form.formState.errors.portfolioVideoLink.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Categories */}
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
                <button
                  type="button"
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  className={cn(
                    "flex w-full items-center justify-between h-auto min-h-10 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-950",
                    selectedCategories.length === 0
                      ? "border-slate-200 text-slate-500"
                      : "border-red-400 text-slate-900 dark:text-slate-50 dark:border-red-500",
                  )}
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedCategories.length > 0
                      ? selectedCategories.map((slug) => {
                          const label = CATEGORIES.find(
                            (c) => c.slug === slug,
                          )?.label;
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
                  <ChevronDown className={cn("ml-2 size-4 shrink-0 opacity-50 transition-transform", categoriesOpen && "rotate-180")} />
                </button>
                {categoriesOpen && (
                  <div className="mt-1 rounded-lg border border-slate-200 bg-white p-2 max-h-80 overflow-y-auto dark:bg-slate-950 dark:border-slate-800">
                    {CATEGORIES.map((category) => {
                      const isSelected = selectedCategories.includes(
                        category.slug,
                      );
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
                            <category.icon className="size-4" />
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
                    })}
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

          {/* Section 6: Secure Your Account */}
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
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="password"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Password <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  · min 8 chars, mix letters + numbers + symbol
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  className="h-10 pr-10 rounded-lg bg-white dark:bg-slate-950"
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

      {/* Footer */}
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
            className="mt-[4px] shrink-0 h-4 w-4 border border-slate-300 accent-[#ef3e51] data-[state=checked]:bg-[#ef3e51] data-[state=checked]:border-[#ef3e51] data-[state=checked]:text-white dark:border-slate-600"
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
                Creator Terms
              </Link>
              {", "}
              <Link
                href="/privacy"
                className="font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
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

        <div className="flex items-center gap-6">
          <Button
            type="submit"
            className="h-11 flex-1 rounded-full bg-[#F2F2F2] text-[15px] font-bold text-[#8B8489] hover:bg-[#E8E8E8] hover:text-[#7A7579] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Create my creator profile &rarr;
          </Button>

          <div className="text-right text-[11px] text-[#8B8489] leading-tight">
            Hiring instead? <br />
            <Link
              href="/signup/brand"
              className="font-bold text-slate-950 hover:underline dark:text-slate-50 text-[13px]"
            >
              Sign up as a brand
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
