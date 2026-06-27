"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useCreateBriefMutation } from "@/features/briefs/hooks/use-create-brief-mutation";
import type { CreateBriefPayload } from "@/features/briefs/api/types";
import { getBriefOfferLabels } from "@/features/briefs/lib/brief-offer-labels";
import {
  presignBriefProductImageUpload,
  putProductImageToPresignedUrl,
} from "@/features/briefs/api/presign-brief-product-image-upload";

const productImageAccept = "image/jpeg,image/png,image/webp";
const supportedProductImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const briefFormSchema = z
  .object({
    brandName: z.string().trim().min(1, "Brand name is required"),
    isProduct: z.boolean(),
    productService: z.string().trim().min(1, "Name is required"),
    productImageKey: z.string().trim().optional(),
    productImageUrl: z.string().trim(),
    industry: z.string().trim(),
    instructions: z.string().trim().min(1, "Script or instructions are required"),
    onLocationFilming: z.boolean(),
    links: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.isProduct && !values.productImageKey?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["productImageKey"],
        message: "Product image is required for product briefs",
      });
    }
  });

type BriefFormValues = z.infer<typeof briefFormSchema>;

interface BriefFormProps {
  orderId: string;
  className?: string;
  submitLabel?: string;
  showHeading?: boolean;
  showCancelButton?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

function toBriefPayload(values: BriefFormValues): CreateBriefPayload {
  const referenceLinks = values.links
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const isProduct = values.isProduct;

  return {
    brandName: values.brandName.trim(),
    isProduct,
    productName: values.productService.trim(),
    ...(isProduct && values.productImageKey?.trim()
      ? { productImageKey: values.productImageKey.trim() }
      : {}),
    industry: values.industry.trim() || undefined,
    productDescription: values.instructions.trim(),
    shootLocationKind: values.onLocationFilming
      ? "BRAND_SELECTED_LOCATION"
      : "CREATOR_DECIDES",
    referenceLinks,
    script: {
      mode: "BRAND_PROVIDED",
      label: "Brand-provided instructions",
      text: values.instructions.trim(),
    },
    finalNotes: values.notes.trim() || undefined,
    willShipPhysicalProductToCreator: false,
  };
}

export function BriefForm({
  orderId,
  className,
  submitLabel = "Submit Brief",
  showHeading = true,
  showCancelButton = false,
  onSuccess,
  onCancel,
  readOnly = false,
}: BriefFormProps) {
  const router = useRouter();
  const productImageInputRef = useRef<HTMLInputElement | null>(null);

  const { data: briefData, isLoading: isBriefLoading } =
    useGetOrderBriefQuery(orderId);

  const defaultValues = useMemo(() => {
    if (briefData?.brief) {
      type BriefPayload = {
        brandName?: string;
        productService?: string;
        productName?: string | null;
        productImageKey?: string | null;
        productImageUrl?: string | null;
        industry?: string | null;
        instructions?: string;
        productDescription?: string | null;
        onLocationFilming?: boolean;
        shootLocationKind?: string | null;
        referenceLinks?: string[];
        notes?: string | null;
        finalNotes?: string | null;
      };

      const brf = briefData.brief as BriefPayload;
      return {
        brandName: brf.brandName || "",
        isProduct: (brf as { isProduct?: boolean }).isProduct ?? true,
        productService: brf.productService || brf.productName || "",
        productImageKey: brf.productImageKey?.startsWith("brief-product-temp/")
          ? brf.productImageKey
          : "",
        productImageUrl: brf.productImageUrl || "",
        industry: brf.industry || "",
        instructions: brf.instructions || brf.productDescription || "",
        onLocationFilming:
          brf.onLocationFilming ?? brf.shootLocationKind === "BRAND_SELECTED_LOCATION",
        links: brf.referenceLinks ? brf.referenceLinks.join("\n") : "",
        notes: brf.notes || brf.finalNotes || "",
      };
    }
    return {
      brandName: "",
      isProduct: true,
      productService: "",
      productImageKey: "",
      productImageUrl: "",
      industry: "",
      instructions: "",
      onLocationFilming: false,
      links: "",
      notes: "",
    };
  }, [briefData]);

  const form = useForm<BriefFormValues>({
    resolver: zodResolver(briefFormSchema),
    values: defaultValues,
  });
  const createBriefMutation = useCreateBriefMutation();
  const uploadProductImageMutation = useMutation({
    mutationKey: ["briefs", "product-image-upload", orderId],
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
  const submitBriefMutation = useSubmitBriefMutation({
    onSuccess: () => {
      form.reset();
      onSuccess?.();
      router.replace(`/brand/orders/${orderId}`);
      router.refresh();
    },
  });
  const onLocationFilming = useWatch({
    control: form.control,
    name: "onLocationFilming",
  });
  const isProduct = useWatch({
    control: form.control,
    name: "isProduct",
  });
  const offerLabels = getBriefOfferLabels(isProduct ?? true);
  const productImageUrl = useWatch({
    control: form.control,
    name: "productImageUrl",
  });
  const productImageKey = useWatch({
    control: form.control,
    name: "productImageKey",
  });
  const isSubmitting =
    createBriefMutation.isPending ||
    submitBriefMutation.isPending ||
    uploadProductImageMutation.isPending;

  function handleProductImageSelect(file: File | null) {
    if (!file) return;

    if (!supportedProductImageTypes.has(file.type)) {
      toast.error("Upload a JPG, PNG, or WebP product image.");
      return;
    }

    uploadProductImageMutation.mutate(file);
  }

  function handleRemoveProductImage() {
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
  }

  function handleSubmit(values: BriefFormValues) {
    createBriefMutation.mutate(toBriefPayload(values), {
      onSuccess: ({ id }) => {
        submitBriefMutation.mutate({
          orderId,
          briefId: id,
        });
      },
    });
  }

  if (isBriefLoading) {
    return (
      <div
        className={cn(
          "flex min-h-[400px] items-center justify-center bg-card border border-border/40 p-6 rounded-2xl",
          className,
        )}
      >
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn(
        "space-y-6 bg-card border border-border/40 p-6 rounded-2xl shadow-sm",
        className,
      )}
    >
      {showHeading ? (
        <h3 className="text-sm font-bold tracking-tight text-foreground -mt-1">
          Brief details
        </h3>
      ) : null}

      <div className="space-y-2">
        <Label
          htmlFor="brandName"
          className="text-[11px] font-bold text-foreground tracking-wide"
        >
          Brand name
        </Label>
        <Input
          id="brandName"
          placeholder="e.g. Acme Co."
          disabled={readOnly || isSubmitting}
          aria-invalid={form.formState.errors.brandName ? true : undefined}
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("brandName")}
        />
        {form.formState.errors.brandName ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.brandName.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border/40 bg-background/50 p-4 shadow-none">
        <div className="space-y-0.5">
          <Label className="text-[11px] font-bold text-foreground tracking-wide">
            Product brief
          </Label>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Turn off for service campaigns. Product image is required when on.
          </p>
        </div>
        <Switch
          checked={isProduct ?? true}
          onCheckedChange={(checked) => {
            form.setValue("isProduct", checked, {
              shouldDirty: true,
              shouldValidate: true,
            });
            if (!checked) {
              handleRemoveProductImage();
            }
          }}
          disabled={readOnly || isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="productService"
          className="text-[11px] font-bold text-foreground tracking-wide"
        >
          {offerLabels.name}
        </Label>
        <Input
          id="productService"
          placeholder="What should the content feature?"
          disabled={readOnly || isSubmitting}
          aria-invalid={form.formState.errors.productService ? true : undefined}
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("productService")}
        />
        {form.formState.errors.productService ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.productService.message}
          </p>
        ) : null}
      </div>

      {(isProduct ?? true) ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-[11px] font-bold text-foreground tracking-wide">
              {offerLabels.image}
            </Label>
            <p className="text-[10px] text-muted-foreground leading-tight">
              JPG, PNG, or WebP image creators can reference.
            </p>
          </div>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              <input
                ref={productImageInputRef}
                type="file"
                accept={productImageAccept}
                className="hidden"
                disabled={isSubmitting}
                onChange={(event) => {
                  handleProductImageSelect(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => productImageInputRef.current?.click()}
              >
                {uploadProductImageMutation.isPending ? (
                  <Spinner className="size-4" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                {uploadProductImageMutation.isPending
                  ? "Uploading..."
                  : productImageUrl
                    ? "Replace"
                    : "Upload"}
              </Button>
              {productImageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={handleRemoveProductImage}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-border/40 bg-background/50 p-3">
          <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-background">
            {productImageUrl ? (
              <Image
                src={productImageUrl}
                alt="Product image preview"
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {uploadProductImageMutation.isPending
              ? "Uploading product image..."
              : productImageUrl && productImageKey
                ? "Image uploaded for this brief."
                : productImageUrl
                  ? "Upload or replace the image before submitting."
                : "No product image uploaded yet."}
          </p>
        </div>
        {form.formState.errors.productImageKey ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.productImageKey.message}
          </p>
        ) : null}
      </div>
      ) : null}

      <div className="space-y-2">
        <Label
          htmlFor="industry"
          className="text-[11px] font-bold text-foreground tracking-wide"
        >
          Industry
        </Label>
        <Input
          id="industry"
          placeholder="e.g. beauty, SaaS, fitness"
          disabled={readOnly || isSubmitting}
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("industry")}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="instructions"
          className="text-[11px] font-bold text-foreground tracking-wide"
        >
          Script / instructions
        </Label>
        <Textarea
          id="instructions"
          placeholder="Tone, talking points, do's and don'ts, CTA..."
          disabled={readOnly || isSubmitting}
          aria-invalid={form.formState.errors.instructions ? true : undefined}
          className="min-h-25 resize-y bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("instructions")}
        />
        {form.formState.errors.instructions ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.instructions.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border/40 bg-background/50 p-4 shadow-none">
        <div className="space-y-0.5">
          <Label className="text-[11px] font-bold text-foreground tracking-wide">
            On-location filming
          </Label>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Enable if creators must shoot at a specific place.
          </p>
        </div>
        <Switch
          checked={onLocationFilming}
          onCheckedChange={(checked) =>
            form.setValue("onLocationFilming", checked, {
              shouldDirty: true,
            })
          }
          disabled={readOnly || isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="links"
          className="text-[11px] font-bold text-foreground tracking-wide"
        >
          Reference links
        </Label>
        <Textarea
          id="links"
          placeholder="One URL per line — mood boards, past ads, product pages..."
          disabled={readOnly || isSubmitting}
          className="min-h-20 resize-y bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("links")}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="notes"
          className="text-[11px] font-bold text-foreground tracking-wide"
        >
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Anything else the creator should know"
          disabled={readOnly || isSubmitting}
          className="min-h-20 resize-y bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("notes")}
        />
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            className="w-full sm:flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner className="size-4" aria-hidden />
                Submitting...
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {showCancelButton ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}
