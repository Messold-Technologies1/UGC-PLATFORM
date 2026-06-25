"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Smartphone,
  MessageSquare,
  Megaphone,
  Box,
  FileText,
  Pen,
  FileEdit,
  Sparkles,
  Video,
  X,
  Plus,
  ImageIcon,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
import { useCreateBriefMutation } from "@/features/briefs/hooks/use-create-brief-mutation";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";
import { useGetBrandOrderDetailsQuery } from "@/features/orders/hooks/use-get-brand-order-details-query";
import { useBrandProfileStateQuery } from "@/features/brands/hooks/use-brand-profile-state-query";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import {
  presignBrandPronunciationUpload,
  putBlobToPresignedUrl,
} from "@/features/brands/api/presign-brand-pronunciation-upload";
import {
  presignBriefProductImageUpload,
  putProductImageToPresignedUrl,
} from "@/features/briefs/api/presign-brief-product-image-upload";
import type {
  Brief,
  BriefContentType,
  BriefDurationBucket,
  BriefFieldOptionsResponse,
  BriefShootLocationKind,
  BriefToneStyle,
  CreateBriefPayload,
} from "@/features/briefs/api/types";
import { useBriefFieldOptionsQuery } from "@/features/briefs/hooks/use-brief-field-options-query";

import { PaymentSuccessBanner } from "@/features/briefs/components/payment-success-banner";
import { ExistingBriefsSidebar } from "@/features/briefs/components/existing-briefs-sidebar";
import styles from "@/features/briefs/components/brief-studio.module.css";

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

const fallbackBriefFieldOptions: BriefFieldOptionsResponse = {
  shootLocationKinds: [...shootLocationKinds],
  durationBuckets: [...durationBuckets],
  contentTypes: [...contentTypes],
  toneStyles: [...toneStyles],
};

const productImageAccept = "image/jpeg,image/png,image/webp";
const supportedProductImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const contentTypeLabels: Record<BriefContentType, string> = {
  TALKING_VIDEO: "Talking Video",
  PRODUCT_DEMO: "Product Demo",
  TESTIMONIAL: "Testimonial / Review",
  AESTHETIC_REEL: "Aesthetic Reel",
  UGC_AD: "UGC Ad",
  CREATOR_DECIDES: "Creator Decides",
};

const durationBucketLabels: Record<BriefDurationBucket, string> = {
  SEC_0_15: "0 - 15 Seconds",
  SEC_15_30: "15 - 30 Seconds",
  SEC_30_45: "30 - 45 Seconds",
  SEC_45_60: "45 - 60 Seconds",
  SEC_60_100: "60 - 100 Seconds",
  NOT_SURE: "Not sure / Creator decides",
};

const shootLocationKindLabels: Record<BriefShootLocationKind, string> = {
  CREATOR_OWN_SETUP: "Creator's Own Setup",
  OUTDOOR_PUBLIC_LOCATION: "Outdoor / Public Location",
  BRAND_SELECTED_LOCATION: "Brand Selected Location",
  CREATOR_DECIDES: "Creator Decides",
};

const toneStyleLabels: Record<BriefToneStyle, string> = {
  FUNNY: "Funny",
  EMOTIONAL: "Emotional",
  PREMIUM: "Premium",
  CASUAL: "Casual",
  TRENDY: "Trendy",
  CREATOR_DECIDES: "Creator Decides",
};

const contentTypeIcons: Record<BriefContentType, LucideIcon> = {
  TALKING_VIDEO: Smartphone,
  PRODUCT_DEMO: Box,
  TESTIMONIAL: MessageSquare,
  AESTHETIC_REEL: Sparkles,
  UGC_AD: Megaphone,
  CREATOR_DECIDES: Video,
};

const scriptOptionValues = [
  "BRAND_PROVIDED",
  "CREATOR_WRITES",
  "AI_ASSISTED",
] as const;

type ScriptOptionValue = (typeof scriptOptionValues)[number];

function humanizeEnumValue(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getOptionLabel<TValue extends string>(
  labels: Partial<Record<TValue, string>>,
  value: TValue,
) {
  return labels[value] ?? humanizeEnumValue(value);
}

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

const createBriefSchema = z
  .object({
    brandName: z.string().trim().min(1, "Brand name is required"),
    industry: z.string().trim().optional(),
    brandLogoUrl: optionalUrl("Brand logo URL"),
    brandPronunciationAudioKey: z.string().trim().optional(),
    brandPronunciationAudioUrl: optionalUrl("Pronunciation audio URL"),
    productName: z.string().trim().min(1, "Product name is required"),
    productDescription: z
      .string()
      .trim()
      .min(1, "Product description is required"),
    productPageUrl: optionalUrl("Product page URL"),
    productImageKey: z.string().trim().optional(),
    productImageUrl: optionalUrl("Product image URL"),
    willShipPhysicalProductToCreator: z.boolean().optional(),
    shootLocationKind: z.enum(shootLocationKinds).optional(),
    shootLocationAddress: z.string().trim().optional(),
    durationBucket: z.enum(durationBuckets).optional(),
    contentType: z
      .array(z.enum(contentTypes))
      .min(1, "Select at least one content type"),
    toneStyle: z.array(z.enum(toneStyles)).min(1, "Select at least one tone"),
    keyNoteToInclude: z
      .string()
      .trim()
      .min(1, "Key points are required")
      .max(10_000, "Key points must be 10,000 characters or fewer"),
    ctaNote: z
      .string()
      .trim()
      .min(1, "Call to action is required")
      .max(10_000, "Call to action must be 10,000 characters or fewer"),
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
    scriptOption: z.enum(scriptOptionValues),
    scriptText: z
      .string()
      .trim()
      .max(10_000, "Script must be 10,000 characters or fewer")
      .optional(),
    finalNotes: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.willShipPhysicalProductToCreator &&
      !values.productImageKey?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["productImageKey"],
        message: "Product image is required when shipping a physical product",
      });
    }

    if (
      (values.shootLocationKind === "BRAND_SELECTED_LOCATION" ||
        values.shootLocationKind === "OUTDOOR_PUBLIC_LOCATION") &&
      !values.shootLocationAddress?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["shootLocationAddress"],
        message: "Location address is required",
      });
    }
  });

type CreateBriefValues = z.infer<typeof createBriefSchema>;

const createBriefDefaultValues: CreateBriefValues = {
  brandName: "",
  industry: "",
  brandLogoUrl: "",
  brandPronunciationAudioKey: "",
  brandPronunciationAudioUrl: "",
  productName: "",
  productDescription: "",
  productPageUrl: "",
  productImageKey: "",
  productImageUrl: "",
  willShipPhysicalProductToCreator: false,
  shootLocationAddress: "",
  contentType: [],
  toneStyle: [],
  keyNoteToInclude: "",
  ctaNote: "",
  referenceLinks: "",
  scriptOption: "CREATOR_WRITES",
  scriptText: "",
  finalNotes: "",
};

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
  const scriptText = optionalString(values.scriptText);
  const shipsPhysical = values.willShipPhysicalProductToCreator ?? false;
  const productImageKey = values.productImageKey?.trim();

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
    ...(shipsPhysical && productImageKey ? { productImageKey } : {}),
    willShipPhysicalProductToCreator: shipsPhysical,
    shootLocationKind: values.shootLocationKind as
      | BriefShootLocationKind
      | undefined,
    shootLocationAddress: optionalString(values.shootLocationAddress),
    durationBucket: values.durationBucket as BriefDurationBucket | undefined,
    contentType:
      values.contentType && values.contentType.length > 0
        ? (values.contentType as BriefContentType[])
        : undefined,
    toneStyle:
      values.toneStyle && values.toneStyle.length > 0
        ? (values.toneStyle as BriefToneStyle[])
        : undefined,
    keyNoteToInclude: optionalString(values.keyNoteToInclude),
    ctaNote: optionalString(values.ctaNote),
    referenceLinks: referenceLinks.length > 0 ? referenceLinks : undefined,
    script: {
      mode: values.scriptOption,
      label: getScriptOptionLabel(values.scriptOption),
      ...(scriptText ? { text: scriptText } : {}),
    },
    finalNotes: optionalString(values.finalNotes),
  };
}

function getScriptOptionLabel(value: ScriptOptionValue) {
  switch (value) {
    case "BRAND_PROVIDED":
      return "I will provide the script";
    case "AI_ASSISTED":
      return "AI helps generate script";
    case "CREATOR_WRITES":
    default:
      return "Creator writes script";
  }
}

function CreateBriefPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isFromOrder = !!orderId;
  const draftStorageKey = `brief-create-draft:${orderId ?? "standalone"}`;
  const productImageInputRef = useRef<HTMLInputElement | null>(null);

  const { data: orderDetailsData, isLoading: isOrderLoading } =
    useGetBrandOrderDetailsQuery(orderId ?? "", {
      enabled: isFromOrder,
    });
  const orderData = orderDetailsData?.order;
  const creatorData = orderDetailsData?.creator;
  const creatorName = creatorData?.displayName;
  const { data: briefFieldOptions } = useBriefFieldOptionsQuery({
    staleTime: 60 * 60 * 1000,
  });
  const fieldOptions = briefFieldOptions ?? fallbackBriefFieldOptions;

  const form = useForm<CreateBriefValues>({
    resolver: zodResolver(createBriefSchema),
    defaultValues: createBriefDefaultValues,
    mode: "onTouched",
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
  const uploadProductImageMutation = useMutation({
    mutationKey: ["briefs", "product-image-upload"],
    mutationFn: async (file: File) => {
      const presign = await presignBriefProductImageUpload({
        contentType: file.type,
        contentLength: file.size,
      });
      await putProductImageToPresignedUrl(file, presign);
      return presign;
    },
    onSuccess: (presign) => {
      form.setValue("productImageKey", presign.key, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue("productImageUrl", presign.cdnUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Product image added");
    },
    onError: () => {
      toast.error("Could not upload product image. Try again.");
    },
  });
  const [savedBriefId, setSavedBriefId] = useState<string | null>(null);

  const createBriefMutation = useCreateBriefMutation({
    onSuccess: (result) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }

      if (isFromOrder) {
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
  const watchProductImageUrl = useWatch({
    control: form.control,
    name: "productImageUrl",
  });
  const watchReferenceLinks = useWatch({
    control: form.control,
    name: "referenceLinks",
  });
  const watchContentTypes =
    useWatch({
      control: form.control,
      name: "contentType",
    }) ?? [];
  const watchToneStyles =
    useWatch({
      control: form.control,
      name: "toneStyle",
    }) ?? [];
  const selectedScriptOption = useWatch({
    control: form.control,
    name: "scriptOption",
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

  const handleProductImageSelect = (file: File | null) => {
    if (!file) return;

    if (!supportedProductImageTypes.has(file.type)) {
      toast.error("Upload a JPG, PNG, or WebP product image.");
      return;
    }

    uploadProductImageMutation.mutate(file);
  };

  const handleRemoveProductImage = () => {
    form.setValue("productImageKey", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("productImageUrl", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (productImageInputRef.current) {
      productImageInputRef.current.value = "";
    }
  };

  const isSubmitting = createBriefMutation.isPending;
  const isSubmittingBrief = submitBriefMutation.isPending;
  const isPronunciationUploadPending = uploadPronunciationMutation.isPending;
  const isProductImageUploadPending = uploadProductImageMutation.isPending;
  const isUploadPending =
    isPronunciationUploadPending || isProductImageUploadPending;

  const [showBanner, setShowBanner] = useState<boolean>(isFromOrder);
  const [newLink, setNewLink] = useState("");

  const handleAddLink = () => {
    const trimmedLink = newLink.trim();
    if (!trimmedLink) return;

    const { success } = z.url().safeParse(trimmedLink);
    if (!success) {
      toast.error("Please enter a valid URL");
      return;
    }

    const current = toReferenceLinks(form.getValues("referenceLinks"));
    if (!current.includes(trimmedLink)) {
      form.setValue(
        "referenceLinks",
        [...current, trimmedLink].join("\n"),
        { shouldDirty: true, shouldValidate: true },
      );
    }
    setNewLink("");
  };

  const handleRemoveLink = (linkToRemove: string) => {
    const current = toReferenceLinks(form.getValues("referenceLinks"));
    const updated = current.filter((l) => l !== linkToRemove);
    form.setValue("referenceLinks", updated.join("\n"), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawDraft = window.localStorage.getItem(draftStorageKey);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as Partial<CreateBriefValues>;
      const restoredValues: CreateBriefValues = {
        ...createBriefDefaultValues,
        ...draft,
        contentType:
          draft.contentType && draft.contentType.length > 0
            ? draft.contentType
            : createBriefDefaultValues.contentType,
        toneStyle:
          draft.toneStyle && draft.toneStyle.length > 0
            ? draft.toneStyle
            : createBriefDefaultValues.toneStyle,
      };

      form.reset(restoredValues);
      toast.info("Draft restored");
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, form]);

  const handleSaveDraft = () => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify(form.getValues()),
    );
    toast.success("Draft saved");
  };

  const toggleContentType = (value: BriefContentType) => {
    const next = watchContentTypes.includes(value)
      ? watchContentTypes.filter((item) => item !== value)
      : [...watchContentTypes, value];

    form.setValue("contentType", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleToneStyle = (value: BriefToneStyle) => {
    const next = watchToneStyles.includes(value)
      ? watchToneStyles.filter((item) => item !== value)
      : [...watchToneStyles, value];

    form.setValue("toneStyle", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const watchProductName = useWatch({
    control: form.control,
    name: "productName",
  });

  const applyTemplate = useCallback(
    (brief: Brief) => {
      const opts = { shouldDirty: true, shouldValidate: true } as const;

      form.setValue("brandName", brief.brandName ?? "", opts);
      form.setValue("industry", brief.industry ?? "", opts);
      form.setValue("brandLogoUrl", brief.brandLogoUrl ?? "", opts);

      form.setValue("productName", brief.productName ?? "", opts);
      form.setValue("productDescription", brief.productDescription ?? "", opts);
      form.setValue("productPageUrl", brief.productPageUrl ?? "", opts);
      form.setValue(
        "willShipPhysicalProductToCreator",
        brief.willShipPhysicalProductToCreator ?? false,
        opts,
      );
      if (brief.shootLocationKind) {
        form.setValue("shootLocationKind", brief.shootLocationKind, opts);
      }
      form.setValue("shootLocationAddress", brief.shootLocationAddress ?? "", opts);
      if (brief.durationBucket) {
        form.setValue("durationBucket", brief.durationBucket, opts);
      }
      if (brief.contentType && brief.contentType.length > 0) {
        form.setValue("contentType", brief.contentType, opts);
      }
      if (brief.toneStyle && brief.toneStyle.length > 0) {
        form.setValue("toneStyle", brief.toneStyle, opts);
      }
      form.setValue("keyNoteToInclude", brief.keyNoteToInclude ?? "", opts);
      form.setValue("ctaNote", brief.ctaNote ?? "", opts);
      form.setValue(
        "referenceLinks",
        (brief.referenceLinks ?? []).join("\n"),
        opts,
      );
      form.setValue("finalNotes", brief.finalNotes ?? "", opts);

      toast.success(
        `Loaded "${brief.productName || "brief"}" into the form`,
      );
    },
    [form],
  );

  const scriptOptions = [
    {
      id: "BRAND_PROVIDED" as const,
      title: "I will provide the script",
      desc: "I already have a script",
      icon: <FileText className="size-5 text-muted-foreground" />,
    },
    {
      id: "CREATOR_WRITES" as const,
      title: "Creator writes script",
      desc: "Creator will write script for you",
      icon: <FileEdit className="size-5 text-primary" />,
      highlighted: true,
    },
    {
      id: "AI_ASSISTED" as const,
      title: "AI helps generate script",
      desc: "Get AI-generated script suggestions",
      badge: "BETA",
      icon: <Sparkles className="size-5 text-emerald-500" />,
      greenIcon: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 lg:py-4 flex-1 flex flex-col">
        {showBanner && (
          <div className="w-full px-0 lg:px-6 mb-6">
            <PaymentSuccessBanner
              orderId={orderId}
              creatorName={creatorName}
              onDismiss={() => setShowBanner(false)}
            />
          </div>
        )}

        <div className={styles.studio} style={{ paddingTop: 0 }}>
          
          <section className={`${styles.panel} ${styles.leftPanel}`}>
            <div className={styles.panelHead}>
              <div className={styles.panelHeadIconPrimary}>
                <Pen size={19} />
              </div>
              <div>
                <h2 className={styles.panelHeadTitle}>New brief</h2>
                <div className={styles.panelHeadSub}>
                  {watchProductName?.trim() || "Untitled brief"} · draft
                </div>
              </div>
              <button
                type="button"
                className={styles.panelHeadAction}
                onClick={() => {
                  form.reset(createBriefDefaultValues);
                  toast.info("Form cleared");
                }}
              >
                Clear
              </button>
            </div>

            <div className={styles.panelBody}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="brief-form" className="space-y-0">
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <span className={styles.formSectionNum}>1</span>
                    Product Details
                  </div>
                  <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="brandName"
                        className="text-xs font-semibold text-foreground/80"
                      >
                        Brand Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="brandName"
                        placeholder="GlowUp Skincare"
                        className="rounded-lg bg-white"
                        {...form.register("brandName")}
                      />
                      {form.formState.errors.brandName && (
                        <p className="text-[11px] text-destructive mt-1">
                          {form.formState.errors.brandName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="productName"
                        className="text-xs font-semibold text-foreground/80"
                      >
                        Product Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="productName"
                        placeholder="Vitamin C Face Serum"
                        className="rounded-lg bg-white"
                        {...form.register("productName")}
                      />
                      {form.formState.errors.productName && (
                        <p className="text-[11px] text-destructive mt-1">
                          {form.formState.errors.productName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="industry"
                        className="text-xs font-semibold text-foreground/80"
                      >
                        Industry{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="industry"
                        placeholder="e.g. Skincare, Fashion, Tech"
                        className="rounded-lg bg-white"
                        {...form.register("industry")}
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="brandLogoUrl"
                        className="text-xs font-semibold text-foreground/80"
                      >
                        Brand Logo URL{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
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

                  <div className={styles.productTypeRow}>
                    <div className="min-w-0">
                      <Label
                        htmlFor="willShipPhysicalProductToCreator"
                        className={styles.productTypeRowLabel}
                      >
                        Will you ship a physical product to the creator?
                      </Label>
                      <p className={styles.productTypeRowHint}>
                        Enable if you&apos;ll send the product for the video. A
                        product image is required when this is on.
                      </p>
                    </div>
                    <Switch
                      id="willShipPhysicalProductToCreator"
                      checked={watchWillShip ?? false}
                      onCheckedChange={(checked) => {
                        form.setValue(
                          "willShipPhysicalProductToCreator",
                          checked,
                          {
                            shouldDirty: true,
                            shouldValidate: true,
                          },
                        );
                        if (!checked) {
                          handleRemoveProductImage();
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label
                      htmlFor="productPageUrl"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Product URL{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
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

                  <div className="space-y-3 min-w-0">
                    {watchWillShip ? (
                      <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground/80">
                          Product Image{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          JPG, PNG, or WebP image creators can reference.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={productImageInputRef}
                          type="file"
                          accept={productImageAccept}
                          className="hidden"
                          disabled={isSubmitting || isProductImageUploadPending}
                          onChange={(event) => {
                            handleProductImageSelect(
                              event.target.files?.[0] ?? null,
                            );
                            event.currentTarget.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          disabled={isSubmitting || isProductImageUploadPending}
                          onClick={() => productImageInputRef.current?.click()}
                        >
                          {isProductImageUploadPending ? (
                            <Spinner className="mr-2 size-4" aria-hidden />
                          ) : (
                            <Upload className="mr-2 size-4" aria-hidden />
                          )}
                          {isProductImageUploadPending
                            ? "Uploading..."
                            : watchProductImageUrl
                              ? "Replace"
                              : "Upload"}
                        </Button>
                        {watchProductImageUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="shrink-0"
                            disabled={isSubmitting || isProductImageUploadPending}
                            onClick={handleRemoveProductImage}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/10 p-3">
                      <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-white">
                        {watchProductImageUrl ? (
                          <Image
                            src={watchProductImageUrl}
                            alt="Product image preview"
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <ImageIcon className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {isProductImageUploadPending
                            ? "Uploading product image..."
                            : watchProductImageUrl
                              ? "Image uploaded for this brief"
                              : "No product image uploaded yet"}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          The image is finalized when you save the brief.
                        </p>
                      </div>
                    </div>
                    {form.formState.errors.productImageKey && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.productImageKey.message}
                      </p>
                    )}
                    {form.formState.errors.productImageUrl && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.productImageUrl.message}
                      </p>
                    )}
                      </>
                    ) : null}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label
                      htmlFor="productDescription"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Product Description{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="productDescription"
                      placeholder="A powerful Vitamin C serum that brightens skin, reduces dark spots and gives a healthy glow. Suitable for all skin types."
                      className="min-h-[100px] resize-y rounded-lg bg-white"
                      {...form.register("productDescription")}
                    />
                    {form.formState.errors.productDescription && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.productDescription.message}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <span className="text-[10px] text-muted-foreground">
                        118/500
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Brand Pronunciation Audio{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <div className="max-w-md">
                      <BrandPronunciationAudioField
                        disabled={isSubmitting}
                        uploading={isPronunciationUploadPending}
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
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <span className={styles.formSectionNum}>2</span>
                    What should the video include?
                  </div>
                  <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Select all that apply
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {fieldOptions.contentTypes.map((contentType) => {
                      const isSelected =
                        watchContentTypes.includes(contentType);
                      const ContentTypeIcon =
                        contentTypeIcons[contentType] ?? Video;
                      return (
                        <div
                          key={contentType}
                          onClick={() => toggleContentType(contentType)}
                          className={cn(
                            "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all text-center",
                            isSelected
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border/40 hover:border-border/80 text-foreground",
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
                          <ContentTypeIcon
                            className={cn(
                              "size-5 mb-2",
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="text-xs font-semibold mt-1">
                            {getOptionLabel(contentTypeLabels, contentType)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {form.formState.errors.contentType && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.contentType.message}
                    </p>
                  )}

                  <div className="grid gap-6 md:grid-cols-2 pt-2">
                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="durationBucket"
                        className="text-xs font-semibold text-foreground/80"
                      >
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
                          {fieldOptions.durationBuckets.map(
                            (durationBucket) => (
                              <SelectItem
                                key={durationBucket}
                                value={durationBucket}
                              >
                                {getOptionLabel(
                                  durationBucketLabels,
                                  durationBucket,
                                )}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="shootLocationKind"
                        className="text-xs font-semibold text-foreground/80"
                      >
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
                        <SelectTrigger
                          id="shootLocationKind"
                          className="rounded-lg bg-white"
                        >
                          <SelectValue placeholder="Select shoot location" />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.shootLocationKinds.map(
                            (shootLocationKind) => (
                              <SelectItem
                                key={shootLocationKind}
                                value={shootLocationKind}
                              >
                                {getOptionLabel(
                                  shootLocationKindLabels,
                                  shootLocationKind,
                                )}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(watchShootLocation === "BRAND_SELECTED_LOCATION" ||
                    watchShootLocation === "OUTDOOR_PUBLIC_LOCATION") && (
                    <div className="space-y-2 min-w-0">
                      <Label
                        htmlFor="shootLocationAddress"
                        className="text-xs font-semibold text-foreground/80"
                      >
                        Location Address{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="shootLocationAddress"
                        placeholder="Enter the shoot location address"
                        className="rounded-lg bg-white"
                        {...form.register("shootLocationAddress")}
                      />
                      {form.formState.errors.shootLocationAddress && (
                        <p className="text-[11px] text-destructive mt-1">
                          {form.formState.errors.shootLocationAddress.message}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <span className={styles.formSectionNum}>3</span>
                    Content Style & Tone
                  </div>
                  <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Choose the style that best matches your brand
                  </p>

                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {fieldOptions.toneStyles.map((toneStyle) => (
                      <div
                        key={toneStyle}
                        onClick={() => toggleToneStyle(toneStyle)}
                        className={cn(
                          "px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-colors",
                          watchToneStyles.includes(toneStyle)
                            ? "border-primary bg-white text-primary"
                            : "border-border/40 bg-white text-foreground hover:bg-muted/30",
                        )}
                      >
                        {getOptionLabel(toneStyleLabels, toneStyle)}
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.toneStyle && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.toneStyle.message}
                    </p>
                  )}

                  <div className="space-y-2 pt-2 min-w-0">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Key points to include in the video{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      className="min-h-[120px] resize-y rounded-lg bg-white"
                      {...form.register("keyNoteToInclude")}
                    />
                    {form.formState.errors.keyNoteToInclude && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.keyNoteToInclude.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Call to Action (CTA){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Shop now and glow every day"
                      className="rounded-lg bg-white"
                      {...form.register("ctaNote")}
                    />
                    {form.formState.errors.ctaNote && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.ctaNote.message}
                      </p>
                    )}
                  </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <span className={styles.formSectionNum}>4</span>
                    References & Inspiration
                    <span className="text-[11px] font-600 text-muted-foreground ml-1">(optional)</span>
                  </div>
                  <div className="space-y-6">
                  
                  <div className="space-y-3 min-w-0">
                    <Label
                      htmlFor="newReferenceLink"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Add Reference Links{" "}
                      
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="newReferenceLink"
                        placeholder="https://www.instagram.com/reel/C3..."
                        className="rounded-lg bg-white"
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddLink();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddLink}
                        className="shrink-0"
                      >
                        <Plus className="size-4 mr-1" /> Add
                      </Button>
                    </div>
                    {toReferenceLinks(watchReferenceLinks).length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {toReferenceLinks(watchReferenceLinks).map((link, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg border border-border/50 text-sm"
                          >
                            <span className="truncate mr-4 text-muted-foreground">
                              {link}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveLink(link)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.formState.errors.referenceLinks && (
                      <p className="text-[11px] text-destructive mt-1">
                        {form.formState.errors.referenceLinks.message}
                      </p>
                    )}
                  </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <span className={styles.formSectionNum}>5</span>
                    Script
                  </div>
                  <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    How would you like the script for this video?
                  </p>

                  <div className="grid gap-4 md:grid-cols-3">
                    {scriptOptions.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() =>
                          form.setValue("scriptOption", opt.id, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between min-h-[120px]",
                          selectedScriptOption === opt.id
                            ? opt.greenIcon
                              ? "border-emerald-500 bg-emerald-50/30"
                              : "border-primary bg-primary/5"
                            : "border-border/40 hover:border-border/80 bg-white",
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
                          <h3
                            className={cn(
                              "font-bold text-sm",
                              selectedScriptOption === opt.id && opt.highlighted
                                ? "text-primary"
                                : selectedScriptOption === opt.id &&
                                    opt.greenIcon
                                  ? "text-emerald-700"
                                  : "",
                            )}
                          >
                            {opt.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {opt.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedScriptOption === "BRAND_PROVIDED" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="scriptText"
                        className="text-xs font-semibold text-foreground/80"
                      >
                        Script
                      </Label>
                      <Textarea
                        id="scriptText"
                        placeholder="Paste the script, scene notes, or talking points the creator should follow."
                        className="min-h-[140px] resize-y rounded-lg bg-white"
                        {...form.register("scriptText")}
                      />
                      {form.formState.errors.scriptText && (
                        <p className="text-[11px] text-destructive">
                          {form.formState.errors.scriptText.message}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <span className={styles.formSectionNum}>6</span>
                    Any do&apos;s and don&apos;ts?
                  </div>
                  <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Tell the creator anything specific to keep in mind.
                  </p>

                  <div className="min-w-0">
                    <Textarea
                      placeholder="Do not mention other brands. Avoid medical claims."
                      className="min-h-[100px] resize-y rounded-lg bg-white"
                      {...form.register("finalNotes")}
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        57/300
                      </span>
                    </div>
                  </div>
                  </div>
                </div>

              {savedBriefId && isFromOrder && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-emerald-900">
                      Brief saved! Ready to send?
                    </h3>
                    <p className="text-xs text-emerald-800/70 mt-0.5">
                      Submit the brief to {creatorName ?? "the creator"} so they
                      can start working.
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
              </form>
            </div>

            <div className={styles.panelFoot}>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={
                  isSubmitting ||
                  isUploadPending ||
                  isSubmittingBrief ||
                  Boolean(savedBriefId)
                }
                className="rounded-xl font-bold bg-white text-foreground"
              >
                <FileText className="mr-2 size-4" /> Save as draft
              </Button>
              <div className={styles.panelFootSpacer} />
              <Button
                type="submit"
                form="brief-form"
                disabled={
                  isSubmitting ||
                  isUploadPending ||
                  isSubmittingBrief ||
                  Boolean(savedBriefId)
                }
                className="rounded-xl font-bold px-8 shadow-sm transition-all hover:opacity-90 h-11 bg-primary text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 size-4" aria-hidden />
                    Saving Brief...
                  </>
                ) : isProductImageUploadPending ? (
                  <>
                    <Spinner className="mr-2 size-4" aria-hidden />
                    Uploading Image...
                  </>
                ) : isPronunciationUploadPending ? (
                  <>
                    <Spinner className="mr-2 size-4" aria-hidden />
                    Uploading Audio...
                  </>
                ) : (
                  <>
                    {savedBriefId ? "Brief Saved" : "Create brief"}
                    {!savedBriefId && !isSubmitting && !isUploadPending && (
                      <ArrowRight className="ml-2 size-4" />
                    )}
                  </>
                )}
              </Button>
            </div>
          </section>

          <ExistingBriefsSidebar onUseTemplate={applyTemplate} />
        </div>
      </div>
    </div>
  );
}

export default function CreateBriefPage() {
  return (
    <Suspense>
      <CreateBriefPageContent />
    </Suspense>
  );
}
