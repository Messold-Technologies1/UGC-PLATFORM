"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  UploadCloud,
  Smartphone,
  MessageSquare,
  Megaphone,
  Box,
  BookOpen,
  FileText,
  FileEdit,
  Sparkles,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateBriefMutation } from "@/features/briefs/hooks/use-create-brief-mutation";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";
import { useGetBrandOrderDetailsQuery } from "@/features/orders/hooks/use-get-brand-order-details-query";
import { useBrandProfileStateQuery } from "@/features/brands/hooks/use-brand-profile-state-query";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import {
  presignBrandPronunciationUpload,
  putBlobToPresignedUrl,
} from "@/features/brands/api/presign-brand-pronunciation-upload";
import type {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
  CreateBriefPayload,
} from "@/features/briefs/api/types";

import { OrderProgressSteps } from "@/features/briefs/components/order-progress-steps";
import { PaymentSuccessBanner } from "@/features/briefs/components/payment-success-banner";
import { OrderSummaryCard } from "@/features/briefs/components/order-summary-card";
import { WhatsNextTimeline } from "@/features/briefs/components/whats-next-timeline";

const shootLocationKinds = [
  "CREATOR_OWN_SETUP",
  "OUTDOOR_PUBLIC_LOCATION",
  "BRAND_SELECTED_LOCATION",
  "CREATOR_DECIDES",
] as const;

const durationBuckets = [
  "SEC_0_15",
  "SEC_15_30",
  "SEC_30_45",
  "SEC_45_60",
  "SEC_60_100",
  "NOT_SURE",
] as const;

const contentTypes = [
  "TALKING_VIDEO",
  "PRODUCT_DEMO",
  "TESTIMONIAL",
  "AESTHETIC_REEL",
  "UGC_AD",
  "CREATOR_DECIDES",
] as const;

const toneStyles = [
  "FUNNY",
  "EMOTIONAL",
  "PREMIUM",
  "CASUAL",
  "TRENDY",
  "CREATOR_DECIDES",
] as const;

function optionalUrl(label: string) {
  return z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || z.url().safeParse(value).success, {
      message: `${label} must be a valid URL`,
    });
}

const createBriefSchema = z.object({
  brandName: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  brandLogoUrl: optionalUrl("Brand logo URL"),
  brandPronunciationAudioKey: z.string().trim().optional(),
  brandPronunciationAudioUrl: optionalUrl("Pronunciation audio URL"),
  productName: z.string().trim().optional(),
  productDescription: z.string().trim().optional(),
  productPageUrl: optionalUrl("Product page URL"),
  willShipPhysicalProductToCreator: z.boolean().optional(),
  shootLocationKind: z.enum(shootLocationKinds).optional(),
  shootLocationAddress: z.string().trim().optional(),
  durationBucket: z.enum(durationBuckets).optional(),
  contentType: z.enum(contentTypes).optional(),
  toneStyle: z.enum(toneStyles).optional(),
  referenceLinks: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;

      const invalidLink = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .find((line) => !z.url().safeParse(line).success);

      if (invalidLink) {
        ctx.addIssue({
          code: "custom",
          message: "Each reference link must be a valid URL",
        });
      }
    }),
  finalNotes: z.string().trim().optional(),
});

type CreateBriefValues = z.infer<typeof createBriefSchema>;

function optionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toReferenceLinks(value: string | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toCreateBriefPayload(values: CreateBriefValues): CreateBriefPayload {
  const referenceLinks = toReferenceLinks(values.referenceLinks);

  return {
    brandName: optionalString(values.brandName),
    industry: optionalString(values.industry),
    brandLogoUrl: optionalString(values.brandLogoUrl),
    brandPronunciationAudioKey: optionalString(
      values.brandPronunciationAudioKey,
    ),
    brandPronunciationAudioUrl: optionalString(
      values.brandPronunciationAudioUrl,
    ),
    productName: optionalString(values.productName),
    productDescription: optionalString(values.productDescription),
    productPageUrl: optionalString(values.productPageUrl),
    willShipPhysicalProductToCreator:
      values.willShipPhysicalProductToCreator ?? false,
    shootLocationKind: values.shootLocationKind as
      | BriefShootLocationKind
      | undefined,
    shootLocationAddress: optionalString(values.shootLocationAddress),
    durationBucket: values.durationBucket as BriefDurationBucket | undefined,
    contentType: values.contentType as BriefContentType | undefined,
    toneStyle: values.toneStyle as BriefToneStyle | undefined,
    referenceLinks: referenceLinks.length > 0 ? referenceLinks : undefined,
    finalNotes: optionalString(values.finalNotes),
  };
}

const TONE_OPTIONS: { label: string; apiValue?: BriefToneStyle }[] = [
  { label: "Casual", apiValue: "CASUAL" },
  { label: "Premium", apiValue: "PREMIUM" },
  { label: "Fun / Energetic", apiValue: "FUNNY" },
  { label: "Emotional", apiValue: "EMOTIONAL" },
  { label: "Trendy", apiValue: "TRENDY" },
  { label: "Aesthetic" },
  { label: "Minimal" },
  { label: "Creator decides", apiValue: "CREATOR_DECIDES" },
];

function CreateBriefPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isFromOrder = !!orderId;

  // Fetch order details when redirected from payment
  const {
    data: orderDetailsData,
    isLoading: isOrderLoading,
  } = useGetBrandOrderDetailsQuery(orderId ?? "", {
    enabled: isFromOrder,
  });
  const orderData = orderDetailsData?.order;
  const creatorData = orderDetailsData?.creator;
  const creatorName = creatorData?.displayName;

  const form = useForm<CreateBriefValues>({
    resolver: zodResolver(createBriefSchema),
    defaultValues: {
      willShipPhysicalProductToCreator: false,
    },
  });
  const { data: brandProfileState } = useBrandProfileStateQuery({
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const uploadPronunciationMutation = useMutation({
    mutationKey: ["briefs", "pronunciation-upload"],
    mutationFn: async (blob: Blob) => {
      const presign = await presignBrandPronunciationUpload({
        contentType: blob.type || "audio/webm",
        contentLength: blob.size,
      });
      await putBlobToPresignedUrl(blob, presign);
      return presign;
    },
    onSuccess: (presign) => {
      form.setValue("brandPronunciationAudioKey", presign.key, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue("brandPronunciationAudioUrl", presign.cdnUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Pronunciation audio added");
    },
    onError: () => {
      toast.error("Could not upload pronunciation audio. Try again.");
    },
  });
  const [savedBriefId, setSavedBriefId] = useState<string | null>(null);

  const createBriefMutation = useCreateBriefMutation({
    onSuccess: (result) => {
      if (isFromOrder) {
        // Don't redirect, keep the user here so they can submit the brief
        setSavedBriefId(result.id);
        return;
      }

      router.push(`/brand/briefs/${result.id}`);
    },
  });

  const submitBriefMutation = useSubmitBriefMutation({
    onSuccess: () => {
      router.push(`/brand/orders/${orderId}`);
    },
  });

  const handleSubmitBrief = () => {
    if (!orderId || !savedBriefId) return;
    submitBriefMutation.mutate({ orderId, briefId: savedBriefId });
  };

  const watchShootLocation = useWatch({
    control: form.control,
    name: "shootLocationKind",
  });
  const watchWillShip = useWatch({
    control: form.control,
    name: "willShipPhysicalProductToCreator",
  });
  const watchPronunciationAudioUrl = useWatch({
    control: form.control,
    name: "brandPronunciationAudioUrl",
  });

  useEffect(() => {
    if (brandProfileState?.kind !== "ready") {
      return;
    }

    const profile = brandProfileState.profile;
    const defaults: Partial<CreateBriefValues> = {
      brandName: profile.brandName,
      brandLogoUrl: profile.logoUrl ?? undefined,
      brandPronunciationAudioKey:
        profile.brandPronunciationAudioKey ?? undefined,
      brandPronunciationAudioUrl:
        profile.brandPronunciationAudioUrl ?? undefined,
    };

    (
      Object.entries(defaults) as Array<
        [keyof CreateBriefValues, string | undefined]
      >
    ).forEach(([field, value]) => {
      if (!value) return;
      const fieldState = form.getFieldState(field);
      const currentValue = form.getValues(field);

      if (!fieldState.isDirty && !currentValue) {
        form.setValue(field, value, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }
    });
  }, [brandProfileState, form]);

  const onSubmit = (data: CreateBriefValues) => {
    createBriefMutation.mutate(toCreateBriefPayload(data));
  };

  const isSubmitting = createBriefMutation.isPending;
  const isSubmittingBrief = submitBriefMutation.isPending;
  const isUploadPending = uploadPronunciationMutation.isPending;

  // Static States for new UI
  const [selectedVideoIncludes, setSelectedVideoIncludes] = useState<string[]>(["Product Demo"]);
  const [selectedTone, setSelectedTone] = useState<string>("Casual");
  const [selectedScriptOption, setSelectedScriptOption] = useState<string>("Creator writes script");
  const [showBanner, setShowBanner] = useState<boolean>(isFromOrder);

  const toggleVideoInclude = (val: string) => {
    setSelectedVideoIncludes((prev) =>
      prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val]
    );
  };

  const videoIncludesOptions = [
    { label: "Product Demo", icon: <Lock className="size-5 mb-2 text-primary" /> },
    { label: "Talking to Camera", icon: <Smartphone className="size-5 mb-2 text-muted-foreground" /> },
    { label: "Testimonial / Review", icon: <MessageSquare className="size-5 mb-2 text-muted-foreground" /> },
    { label: "UGC Ad", icon: <Megaphone className="size-5 mb-2 text-muted-foreground" /> },
    { label: "Unboxing", icon: <Box className="size-5 mb-2 text-muted-foreground" /> },
    { label: "How-to / Tutorial", icon: <BookOpen className="size-5 mb-2 text-muted-foreground" /> },
  ];

  const toneOptions = TONE_OPTIONS;

  const scriptOptions = [
    { id: "I will provide the script", title: "I will provide the script", desc: "I already have a script", icon: <FileText className="size-5 text-muted-foreground" /> },
    { id: "Creator writes script", title: "Creator writes script", desc: "Creator will write script for you", extra: "+ \u20b9500", icon: <FileEdit className="size-5 text-primary" />, highlighted: true },
    { id: "AI helps generate script", title: "AI helps generate script", desc: "Get AI-generated script suggestions", extra: "+ \u20b9300", badge: "BETA", icon: <Sparkles className="size-5 text-emerald-500" />, greenIcon: true },
  ];


  return (
    <div className="min-h-screen bg-white">
      <OrderProgressSteps currentStep={1} />
      <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8">
        {showBanner && (
          <PaymentSuccessBanner
            orderId={orderId}
            creatorName={creatorName}
            onDismiss={() => setShowBanner(false)}
          />
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main Form Area */}
          <div className="space-y-8 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  Tell {creatorName ?? "the creator"} what you need
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  The more details you share, the better the content will be.
                </p>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                All fields marked <span className="text-destructive">*</span> are required
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 1. Product Details */}
              <Card className="rounded-2xl border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-border/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lock className="size-4" />
                  </div>
                  <h2 className="text-lg font-bold">Product Details</h2>
                </div>
                <CardContent className="space-y-6 px-6 sm:px-8 py-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="brandName" className="text-xs font-semibold text-foreground/80">
                        Brand Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="brandName"
                        placeholder="GlowUp Skincare"
                        className="rounded-lg bg-white"
                        {...form.register("brandName")}
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="productName" className="text-xs font-semibold text-foreground/80">
                        Product Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="productName"
                        placeholder="Vitamin C Face Serum"
                        className="rounded-lg bg-white"
                        {...form.register("productName")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="industry" className="text-xs font-semibold text-foreground/80">
                        Industry <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="industry"
                        placeholder="e.g. Skincare, Fashion, Tech"
                        className="rounded-lg bg-white"
                        {...form.register("industry")}
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="brandLogoUrl" className="text-xs font-semibold text-foreground/80">
                        Brand Logo URL <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="brandLogoUrl"
                        placeholder="https://example.com/logo.png"
                        className="rounded-lg bg-white"
                        {...form.register("brandLogoUrl")}
                      />
                      {form.formState.errors.brandLogoUrl && (
                        <p className="text-[11px] text-destructive mt-1">
                          {form.formState.errors.brandLogoUrl.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="productPageUrl" className="text-xs font-semibold text-foreground/80">
                      Product URL <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="productPageUrl"
                      placeholder="https://glowupskincare.com/vitamin-c-serum"
                      className="rounded-lg bg-white"
                      {...form.register("productPageUrl")}
                    />
                     {form.formState.errors.productPageUrl && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.productPageUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="productDescription" className="text-xs font-semibold text-foreground/80">
                      Product Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="productDescription"
                      placeholder="A powerful Vitamin C serum that brightens skin, reduces dark spots and gives a healthy glow. Suitable for all skin types."
                      className="min-h-[100px] resize-y rounded-lg bg-white"
                      {...form.register("productDescription")}
                    />
                    <div className="flex justify-end">
                      <span className="text-[10px] text-muted-foreground">118/500</span>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                     <Label className="text-xs font-semibold text-foreground/80">
                        Brand Pronunciation Audio <span className="text-muted-foreground font-normal">(optional)</span>
                     </Label>
                     <div className="max-w-md">
                       <BrandPronunciationAudioField
                          disabled={isSubmitting}
                          uploading={isUploadPending}
                          audioUrl={watchPronunciationAudioUrl || null}
                          hasRecording={Boolean(watchPronunciationAudioUrl)}
                          onRecordingReady={(blob) =>
                            uploadPronunciationMutation.mutate(blob)
                          }
                          onRemove={() => {
                            form.setValue("brandPronunciationAudioKey", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            form.setValue("brandPronunciationAudioUrl", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        />
                      </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="willShipPhysicalProductToCreator" className="text-xs font-semibold text-foreground/80">
                        Will you ship a physical product to the creator?
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Enable if you&apos;ll send the product for the video</p>
                    </div>
                    <Switch
                      id="willShipPhysicalProductToCreator"
                      checked={watchWillShip ?? false}
                      onCheckedChange={(checked) =>
                        form.setValue("willShipPhysicalProductToCreator", checked, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. What should the video include? */}
              <Card className="rounded-2xl border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-border/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    2.
                  </div>
                  <h2 className="text-lg font-bold">What should the video include?</h2>
                </div>
                <CardContent className="space-y-6 px-6 sm:px-8 py-6">
                  <p className="text-sm text-muted-foreground">Select all that apply</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {videoIncludesOptions.map((opt) => {
                      const isSelected = selectedVideoIncludes.includes(opt.label);
                      return (
                        <div
                          key={opt.label}
                          onClick={() => toggleVideoInclude(opt.label)}
                          className={cn(
                            "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all text-center",
                            isSelected ? "border-primary bg-primary/5 text-primary" : "border-border/40 hover:border-border/80 text-foreground"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex size-4 items-center justify-center rounded bg-primary text-white">
                              <Check className="size-3" />
                            </div>
                          )}
                          {!isSelected && (
                            <div className="absolute top-2 right-2 size-4 rounded border border-border/60" />
                          )}
                          {opt.icon}
                          <span className="text-xs font-semibold mt-1">{opt.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 pt-2">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="durationBucket" className="text-xs font-semibold text-foreground/80">
                        Video Length
                      </Label>
                      <Select
                        onValueChange={(val) =>
                          form.setValue(
                            "durationBucket",
                            val as BriefDurationBucket,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <SelectTrigger
                          id="durationBucket"
                          className="rounded-lg bg-white"
                        >
                          <SelectValue placeholder="Up to 60 seconds (Included)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEC_0_15">0 - 15 Seconds</SelectItem>
                          <SelectItem value="SEC_15_30">
                            15 - 30 Seconds
                          </SelectItem>
                          <SelectItem value="SEC_30_45">
                            30 - 45 Seconds
                          </SelectItem>
                          <SelectItem value="SEC_45_60">
                            45 - 60 Seconds
                          </SelectItem>
                          <SelectItem value="SEC_60_100">
                            60 - 100 Seconds
                          </SelectItem>
                          <SelectItem value="NOT_SURE">
                            Not sure / Creator decides
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-semibold text-foreground/80">
                        Primary Platform
                      </Label>
                      <Select defaultValue="instagram">
                        <SelectTrigger className="rounded-lg bg-white">
                           <SelectValue>
                              <div className="flex items-center gap-2">
                                 <div className="size-4 rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-500" />
                                 <span>Instagram Reels</span>
                              </div>
                           </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">
                             <div className="flex items-center gap-2">
                                <div className="size-4 rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-500" />
                                <span>Instagram Reels</span>
                             </div>
                          </SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="youtube">YouTube Shorts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}
                  </div>

                  <Separator className="my-2" />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="contentType" className="text-xs font-semibold text-foreground/80">
                        Content Type
                      </Label>
                      <Select
                        onValueChange={(val) =>
                          form.setValue(
                            "contentType",
                            val as BriefContentType,
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      >
                        <SelectTrigger id="contentType" className="rounded-lg bg-white">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRODUCT_DEMO">Product Demo</SelectItem>
                          <SelectItem value="TALKING_VIDEO">Talking Video</SelectItem>
                          <SelectItem value="TESTIMONIAL">Testimonial</SelectItem>
                          <SelectItem value="AESTHETIC_REEL">Aesthetic Reel</SelectItem>
                          <SelectItem value="UGC_AD">UGC Ad</SelectItem>
                          <SelectItem value="CREATOR_DECIDES">Creator Decides</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="shootLocationKind" className="text-xs font-semibold text-foreground/80">
                        Shoot Location
                      </Label>
                      <Select
                        onValueChange={(val) =>
                          form.setValue(
                            "shootLocationKind",
                            val as BriefShootLocationKind,
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      >
                        <SelectTrigger id="shootLocationKind" className="rounded-lg bg-white">
                          <SelectValue placeholder="Select shoot location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREATOR_OWN_SETUP">Creator&apos;s Own Setup</SelectItem>
                          <SelectItem value="OUTDOOR_PUBLIC_LOCATION">Outdoor / Public Location</SelectItem>
                          <SelectItem value="BRAND_SELECTED_LOCATION">Brand Selected Location</SelectItem>
                          <SelectItem value="CREATOR_DECIDES">Creator Decides</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {watchShootLocation === "BRAND_SELECTED_LOCATION" && (
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="shootLocationAddress" className="text-xs font-semibold text-foreground/80">
                        Location Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="shootLocationAddress"
                        placeholder="Enter the shoot location address"
                        className="rounded-lg bg-white"
                        {...form.register("shootLocationAddress")}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Content Style & Tone */}
              <Card className="rounded-2xl border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-border/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    3.
                  </div>
                  <h2 className="text-lg font-bold">Content Style & Tone</h2>
                </div>
                <CardContent className="space-y-6 px-6 sm:px-8 py-6">
                  <p className="text-sm text-muted-foreground">Choose the style that best matches your brand</p>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {toneOptions.map(tone => (
                      <div
                        key={tone.label}
                        onClick={() => {
                          setSelectedTone(tone.label);
                          if (tone.apiValue) {
                            form.setValue("toneStyle", tone.apiValue, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-colors",
                          selectedTone === tone.label ? "border-primary bg-white text-primary" : "border-border/40 bg-white text-foreground hover:bg-muted/30"
                        )}
                      >
                        {tone.label}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 min-w-0">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Key points to include in the video <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      placeholder="- Brightens dull skin\n- Reduces dark spots\n- Lightweight & non-sticky\n- Suitable for all skin types\n- Use daily for best results"
                      className="min-h-[120px] resize-y rounded-lg bg-white"
                      defaultValue={"- Brightens dull skin\n- Reduces dark spots\n- Lightweight & non-sticky\n- Suitable for all skin types\n- Use daily for best results"}
                    />
                    <div className="flex justify-end">
                      <span className="text-[10px] text-muted-foreground">142/500</span>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Call to Action (CTA) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Shop now and glow every day âœ¨"
                      defaultValue="Shop now and glow every day âœ¨"
                      className="rounded-lg bg-white"
                    />
                     <div className="flex justify-end">
                      <span className="text-[10px] text-muted-foreground">28/80</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. References & Inspiration */}
              <Card className="rounded-2xl border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-border/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    4.
                  </div>
                  <h2 className="text-lg font-bold">References & Inspiration <span className="text-muted-foreground font-normal text-sm">(optional)</span></h2>
                </div>
                <CardContent className="space-y-6 px-6 sm:px-8 py-6">
                  <p className="text-sm text-muted-foreground">Add links or upload examples you like (Instagram, TikTok, YouTube, Drive, etc.)</p>
                  
                  {/* File upload area â€“ static placeholder, no API field yet */}
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
                     <UploadCloud className="size-8 text-muted-foreground mb-3" />
                     <p className="text-sm font-medium">Drag & drop files here or <span className="text-primary font-bold">browse</span></p>
                     <p className="text-xs text-muted-foreground mt-1">Supports: JPG, PNG, MP4, MOV (Max 500MB)</p>
                  </div>

                  {/* Reference links â€“ wired to API */}
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="referenceLinks" className="text-xs font-semibold text-foreground/80">
                      Reference Links <span className="text-muted-foreground font-normal">(one per line)</span>
                    </Label>
                    <Textarea
                      id="referenceLinks"
                      placeholder={"https://www.instagram.com/reel/C3...\nhttps://drive.google.com/file/d/1a2..."}
                      className="min-h-[80px] resize-y rounded-lg bg-white"
                      {...form.register("referenceLinks")}
                    />
                    {form.formState.errors.referenceLinks && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.referenceLinks.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 5. Script */}
              <Card className="rounded-2xl border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-border/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    5.
                  </div>
                  <h2 className="text-lg font-bold">Script</h2>
                </div>
                <CardContent className="space-y-6 px-6 sm:px-8 py-6">
                  <p className="text-sm text-muted-foreground">How would you like the script for this video?</p>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    {scriptOptions.map(opt => (
                       <div 
                         key={opt.id}
                         onClick={() => setSelectedScriptOption(opt.id)}
                         className={cn(
                           "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between min-h-[120px]",
                           selectedScriptOption === opt.id 
                             ? (opt.greenIcon ? "border-emerald-500 bg-emerald-50/30" : "border-primary bg-primary/5") 
                             : "border-border/40 hover:border-border/80 bg-white"
                         )}
                       >
                         <div>
                           <div className="flex items-start justify-between mb-2">
                             {opt.icon}
                             {opt.badge && (
                               <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                 {opt.badge}
                               </span>
                             )}
                           </div>
                           <h3 className={cn("font-bold text-sm", selectedScriptOption === opt.id && opt.highlighted ? "text-primary" : selectedScriptOption === opt.id && opt.greenIcon ? "text-emerald-700" : "")}>
                             {opt.title}
                           </h3>
                           <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                         </div>
                         {opt.extra && (
                           <div className={cn("text-xs font-bold mt-3", selectedScriptOption === opt.id && opt.highlighted ? "text-primary" : selectedScriptOption === opt.id && opt.greenIcon ? "text-emerald-700" : "")}>
                             {opt.extra}
                           </div>
                         )}
                       </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 6. Any do's and don'ts? */}
              <Card className="rounded-2xl border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-border/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    6.
                  </div>
                  <h2 className="text-lg font-bold">Any do&apos;s and don&apos;ts?</h2>
                </div>
                <CardContent className="space-y-4 px-6 sm:px-8 py-6">
                  <p className="text-sm text-muted-foreground">Tell the creator anything specific to keep in mind.</p>
                  
                  <div className="min-w-0">
                    <Textarea
                       placeholder="Do not mention other brands. Avoid medical claims."
                       className="min-h-[100px] resize-y rounded-lg bg-white"
                       {...form.register("finalNotes")}
                    />
                    <div className="flex justify-end mt-1">
                       <span className="text-[10px] text-muted-foreground">57/300</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-4 gap-4">
                 <Button
                   type="button"
                   variant="outline"
                   className="rounded-xl font-bold bg-white text-foreground"
                 >
                   <FileText className="mr-2 size-4" /> Save as draft
                 </Button>

                 <div className="flex items-center gap-4 justify-end">
                   <Button
                     type="button"
                     variant="ghost"
                     onClick={() => router.back()}
                     disabled={isSubmitting || isSubmittingBrief}
                     className="rounded-xl font-semibold"
                   >
                     <ArrowLeft className="mr-2 size-4" /> Back
                   </Button>

                   {/* Save Brief Button */}
                   <Button
                      type="submit"
                      disabled={isSubmitting || isUploadPending || isSubmittingBrief}
                      className="rounded-xl font-bold px-8 shadow-sm transition-all hover:opacity-90 h-11 bg-primary text-primary-foreground"
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner className="mr-2 size-4" aria-hidden />
                          Saving Brief...
                        </>
                      ) : isUploadPending ? (
                        <>
                          <Spinner className="mr-2 size-4" aria-hidden />
                          Uploading Audio...
                        </>
                      ) : (
                        <>
                          {savedBriefId ? "Update Brief" : "Save Brief"}
                          {!isSubmitting && !isUploadPending && <ArrowRight className="ml-2 size-4" />}
                        </>
                      )}
                    </Button>
                 </div>
              </div>

              {/* Submit Brief to Creator â€” visible only after brief is saved */}
              {savedBriefId && isFromOrder && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-emerald-900">Brief saved! Ready to send?</h3>
                    <p className="text-xs text-emerald-800/70 mt-0.5">
                      Submit the brief to {creatorName ?? "the creator"} so they can start working.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSubmitBrief}
                    disabled={isSubmittingBrief}
                    className="rounded-xl font-bold px-8 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0"
                  >
                    {isSubmittingBrief ? (
                      <>
                        <Spinner className="mr-2 size-4" aria-hidden />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Brief to Creator
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="flex sm:justify-end">
                <p className="text-xs text-muted-foreground mt-2">You can edit the brief later if needed</p>
              </div>
            </form>
          </div>

          {/* Right Sidebar Area */}
          <div className="w-full lg:w-[360px]">
            <div className="sticky top-8 space-y-6">
               <OrderSummaryCard
                 orderData={orderData}
                 creatorData={creatorData}
                 isLoading={isFromOrder && isOrderLoading}
               />
               <WhatsNextTimeline creatorName={creatorName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Default export wraps with Suspense for useSearchParams(). */
export default function CreateBriefPage() {
  return (
    <Suspense>
      <CreateBriefPageContent />
    </Suspense>
  );
}

