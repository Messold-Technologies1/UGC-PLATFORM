"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {  ArrowRight, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
// import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { useListBriefsQuery } from "@/features/briefs/hooks/use-list-briefs-query";
import { useCreateBriefMutation } from "@/features/briefs/hooks/use-create-brief-mutation";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";
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

// function formatEnumLabel(value: string | null | undefined) {
//   if (!value) return "N/A";
//   return value
//     .split("_")
//     .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
//     .join(" ");
// }

export default function CreateBriefPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isFromOrder = !!orderId;

  const { data: listBriefsData, isLoading: isLoadingBriefs } =
    useListBriefsQuery();
  const existingBriefs = listBriefsData?.items ?? [];

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
        // Don't redirect — keep the user here so they can submit the brief
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
    submitBriefMutation.mutate({
      orderId,
      briefId: savedBriefId,
    });
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
  const pronunciationUrlRegister = form.register("brandPronunciationAudioUrl");

  return (
    <div
      className={cn(
        "mx-auto p-6 md:p-10",
        isFromOrder ? "max-w-[1400px]" : "max-w-4xl",
      )}
    >
      <div className={cn(isFromOrder && "flex gap-0 lg:items-start")}>
        <div className="flex-1 min-w-0">
          {/* <div className="mb-10 flex items-center gap-4">
            <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full bg-background border border-border/40 shadow-sm transition-transform hover:-translate-x-1"
        >
          <ArrowLeft className="size-4" />
        </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Create Campaign Brief
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Provide detailed instructions to ensure the creator perfectly
                captures your brand&apos;s vision.
              </p>
            </div>
          </div> */}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="rounded-2xl border-border/40 bg-card shadow-sm">
              <CardHeader className="bg-muted/10 px-8 py-6 border-b border-border/10">
                <CardTitle className="text-xl">Brand Details</CardTitle>
                <CardDescription>
                  Basic information about your brand and industry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 py-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="brandName"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Brand Name
                    </Label>
                    <Input
                      id="brandName"
                      placeholder="e.g. Acme Co."
                      className="rounded-lg bg-background"
                      {...form.register("brandName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="industry"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Industry
                    </Label>
                    <Input
                      id="industry"
                      placeholder="e.g. Beauty, SaaS, Fitness"
                      className="rounded-lg bg-background"
                      {...form.register("industry")}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="brandLogoUrl"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Brand Logo URL
                    </Label>
                    <Input
                      id="brandLogoUrl"
                      placeholder="https://..."
                      className="rounded-lg bg-background"
                      {...form.register("brandLogoUrl")}
                    />
                    {form.formState.errors.brandLogoUrl && (
                      <p className="text-[11px] text-destructive">
                        {form.formState.errors.brandLogoUrl.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="brandPronunciationAudioUrl"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Pronunciation Audio URL
                    </Label>
                    <Input
                      id="brandPronunciationAudioUrl"
                      placeholder="https://..."
                      className="rounded-lg bg-background"
                      {...pronunciationUrlRegister}
                      onChange={(event) => {
                        void pronunciationUrlRegister.onChange(event);
                        form.setValue("brandPronunciationAudioKey", "", {
                          shouldDirty: true,
                        });
                      }}
                    />
                    {form.formState.errors.brandPronunciationAudioUrl && (
                      <p className="text-[11px] text-destructive">
                        {
                          form.formState.errors.brandPronunciationAudioUrl
                            .message
                        }
                      </p>
                    )}
                  </div>
                </div>
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
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 bg-card shadow-sm">
              <CardHeader className="bg-muted/10 px-8 py-6 border-b border-border/10">
                <CardTitle className="text-xl">Product Details</CardTitle>
                <CardDescription>
                  What is the creator making content about?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 py-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="productName"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Product / Service Name
                    </Label>
                    <Input
                      id="productName"
                      placeholder="e.g. Glow Serum 50ml"
                      className="rounded-lg bg-background"
                      {...form.register("productName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="productPageUrl"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Product Page URL
                    </Label>
                    <Input
                      id="productPageUrl"
                      placeholder="https://..."
                      className="rounded-lg bg-background"
                      {...form.register("productPageUrl")}
                    />
                    {form.formState.errors.productPageUrl && (
                      <p className="text-[11px] text-destructive">
                        {form.formState.errors.productPageUrl.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="productDescription"
                    className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                  >
                    Product Description & Key Benefits
                  </Label>
                  <Textarea
                    id="productDescription"
                    placeholder="Describe the product and list 2-3 key benefits you want highlighted..."
                    className="min-h-[100px] resize-y rounded-lg bg-background"
                    {...form.register("productDescription")}
                  />
                </div>

                <Separator className="bg-border/40" />

                <div className="flex flex-row items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-foreground">
                      Ship Physical Product
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Will you mail/courier a physical item to the creator for
                      the shoot?
                    </p>
                  </div>
                  <Switch
                    checked={watchWillShip}
                    onCheckedChange={(val) =>
                      form.setValue("willShipPhysicalProductToCreator", val, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 bg-card shadow-sm">
              <CardHeader className="bg-muted/10 px-8 py-6 border-b border-border/10">
                <CardTitle className="text-xl">Creative Guidelines</CardTitle>
                <CardDescription>
                  Define the format, tone, and setting for the content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 py-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="durationBucket"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Video Duration
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
                        className="rounded-lg bg-background"
                      >
                        <SelectValue placeholder="Select duration" />
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

                  <div className="space-y-2">
                    <Label
                      htmlFor="contentType"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Content Type
                    </Label>
                    <Select
                      onValueChange={(val) =>
                        form.setValue("contentType", val as BriefContentType, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger
                        id="contentType"
                        className="rounded-lg bg-background"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TALKING_VIDEO">
                          Talking Video
                        </SelectItem>
                        <SelectItem value="PRODUCT_DEMO">
                          Product Demo
                        </SelectItem>
                        <SelectItem value="TESTIMONIAL">Testimonial</SelectItem>
                        <SelectItem value="AESTHETIC_REEL">
                          Aesthetic Reel
                        </SelectItem>
                        <SelectItem value="UGC_AD">UGC Ad</SelectItem>
                        <SelectItem value="CREATOR_DECIDES">
                          Creator Decides
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="toneStyle"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Tone & Style
                    </Label>
                    <Select
                      onValueChange={(val) =>
                        form.setValue("toneStyle", val as BriefToneStyle, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger
                        id="toneStyle"
                        className="rounded-lg bg-background"
                      >
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FUNNY">Funny & Humorous</SelectItem>
                        <SelectItem value="EMOTIONAL">
                          Emotional & Heartfelt
                        </SelectItem>
                        <SelectItem value="PREMIUM">
                          Premium & Cinematic
                        </SelectItem>
                        <SelectItem value="CASUAL">
                          Casual & Authentic
                        </SelectItem>
                        <SelectItem value="TRENDY">
                          Trendy & Fast-paced
                        </SelectItem>
                        <SelectItem value="CREATOR_DECIDES">
                          Creator Decides
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-border/40" />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="shootLocationKind"
                      className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                    >
                      Shoot Location
                    </Label>
                    <Select
                      onValueChange={(val) =>
                        form.setValue(
                          "shootLocationKind",
                          val as BriefShootLocationKind,
                          {
                            shouldDirty: true,
                            shouldValidate: true,
                          },
                        )
                      }
                    >
                      <SelectTrigger
                        id="shootLocationKind"
                        className="rounded-lg bg-background md:max-w-xs"
                      >
                        <SelectValue placeholder="Select location preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREATOR_OWN_SETUP">
                          Creator&apos;s Own Setup / Home
                        </SelectItem>
                        <SelectItem value="OUTDOOR_PUBLIC_LOCATION">
                          Outdoor / Public Location
                        </SelectItem>
                        <SelectItem value="BRAND_SELECTED_LOCATION">
                          Brand Selected Location (e.g. your store)
                        </SelectItem>
                        <SelectItem value="CREATOR_DECIDES">
                          Creator Decides
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchShootLocation === "BRAND_SELECTED_LOCATION" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label
                        htmlFor="shootLocationAddress"
                        className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                      >
                        Location Address
                      </Label>
                      <Input
                        id="shootLocationAddress"
                        placeholder="Provide the exact address or instructions..."
                        className="rounded-lg bg-background"
                        {...form.register("shootLocationAddress")}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 bg-card shadow-sm">
              <CardHeader className="bg-muted/10 px-8 py-6 border-b border-border/10">
                <CardTitle className="text-xl">
                  References & Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-8 py-8">
                <div className="space-y-2">
                  <Label
                    htmlFor="referenceLinks"
                    className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                  >
                    Reference Links
                  </Label>
                  <Textarea
                    id="referenceLinks"
                    placeholder="One URL per line — mood boards, past ads, competitor references..."
                    className="min-h-[100px] resize-y rounded-lg bg-background"
                    {...form.register("referenceLinks")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Add links to Instagram, TikTok, Google Drive, or YouTube.
                  </p>
                  {form.formState.errors.referenceLinks && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.referenceLinks.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="finalNotes"
                    className="text-xs font-bold uppercase tracking-wider text-foreground/80"
                  >
                    Final Notes & Instructions
                  </Label>
                  <Textarea
                    id="finalNotes"
                    placeholder="Anything else the creator should know? Required phrases, do's and don'ts, CTA..."
                    className="min-h-[120px] resize-y rounded-lg bg-background"
                    {...form.register("finalNotes")}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={isSubmitting || isSubmittingBrief}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadPending || isSubmittingBrief}
                className="rounded-xl font-bold px-8 shadow-sm transition-all hover:opacity-90"
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
                    {/* <Check className="mr-2 size-4" /> */}
                    {savedBriefId ? "Update & Save Brief" : "Save Brief"}
                  </>
                )}
              </Button>
              {isFromOrder && savedBriefId && (
                <Button
                  type="button"
                  disabled={isSubmittingBrief || isSubmitting}
                  onClick={handleSubmitBrief}
                  className="rounded-xl font-bold px-8 shadow-sm transition-all hover:opacity-90 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmittingBrief ? (
                    <>
                      <Spinner className="mr-2 size-4" aria-hidden />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 size-4" />
                      Submit Brief
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>

        {isFromOrder && (
          <div className="hidden lg:flex items-start ml-auto">
            {/* Vertical separator — ~4-inch height, pinned right */}
            <div className="flex items-start justify-center pt-10 px-6">
              <Separator orientation="vertical" className="h-64 bg-border/50" />
            </div>

            {/* Existing briefs panel — sticky on the right */}
            <div className="w-[340px] shrink-0">
              <div className="sticky top-8 space-y-5">
                <div>
                  <h3 className="text-lg font-bold">Existing Briefs</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reference your previous campaign briefs.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                  {isLoadingBriefs ? (
                    <div className="flex justify-center p-8">
                      <Spinner className="size-6" />
                    </div>
                  ) : existingBriefs.length === 0 ? (
                    <div className=" p-6 text-center text-sm text-muted-foreground">
                      No existing briefs found.
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
                      {existingBriefs.map((brief) => (
                        <div
                          key={brief.id}
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate">
                                {brief.brandName || "Untitled Brief"}
                              </span>
                              {/* {brief.contentType && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] uppercase"
                                >
                                  {formatEnumLabel(brief.contentType)}
                                </Badge>
                              )} */}
                            </div>
                            {brief.productName && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {brief.productName}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 size-8 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
                            onClick={() => router.push(`/brand/briefs/${brief.id}${orderId ? `?orderId=${orderId}` : ""}`)}
                            aria-label={`View brief ${brief.brandName || brief.id}`}
                          >
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
