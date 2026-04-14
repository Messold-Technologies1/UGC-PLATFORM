"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useSubmitBriefMutation } from "@/features/orders/hooks/use-submit-brief-mutation";

const briefFormSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required"),
  productService: z
    .string()
    .trim()
    .min(1, "Product or service is required"),
  industry: z.string().trim(),
  instructions: z
    .string()
    .trim()
    .min(1, "Script or instructions are required"),
  onLocationFilming: z.boolean(),
  links: z.string(),
  notes: z.string(),
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
}

function toBriefPayload(values: BriefFormValues): Record<string, unknown> {
  const referenceLinks = values.links
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    brandName: values.brandName.trim(),
    productService: values.productService.trim(),
    industry: values.industry.trim() || null,
    instructions: values.instructions.trim(),
    onLocationFilming: values.onLocationFilming,
    referenceLinks,
    notes: values.notes.trim() || null,
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
}: BriefFormProps) {
  const router = useRouter();
  const form = useForm<BriefFormValues>({
    resolver: zodResolver(briefFormSchema),
    defaultValues: {
      brandName: "",
      productService: "",
      industry: "",
      instructions: "",
      onLocationFilming: false,
      links: "",
      notes: "",
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

  function handleSubmit(values: BriefFormValues) {
    submitBriefMutation.mutate({
      orderId,
      brief: toBriefPayload(values),
    });
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
        <Label htmlFor="brandName" className="text-[11px] font-bold text-foreground tracking-wide">
          Brand name
        </Label>
        <Input
          id="brandName"
          placeholder="e.g. Acme Co."
          disabled={submitBriefMutation.isPending}
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

      <div className="space-y-2">
        <Label htmlFor="productService" className="text-[11px] font-bold text-foreground tracking-wide">
          Product / service
        </Label>
        <Input
          id="productService"
          placeholder="What should the content feature?"
          disabled={submitBriefMutation.isPending}
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

      <div className="space-y-2">
        <Label htmlFor="industry" className="text-[11px] font-bold text-foreground tracking-wide">
          Industry
        </Label>
        <Input
          id="industry"
          placeholder="e.g. beauty, SaaS, fitness"
          disabled={submitBriefMutation.isPending}
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("industry")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions" className="text-[11px] font-bold text-foreground tracking-wide">
          Script / instructions
        </Label>
        <Textarea
          id="instructions"
          placeholder="Tone, talking points, do's and don'ts, CTA..."
          disabled={submitBriefMutation.isPending}
          aria-invalid={form.formState.errors.instructions ? true : undefined}
          className="min-h-25 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
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
          disabled={submitBriefMutation.isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="links" className="text-[11px] font-bold text-foreground tracking-wide">
          Reference links
        </Label>
        <Textarea
          id="links"
          placeholder="One URL per line — mood boards, past ads, product pages..."
          disabled={submitBriefMutation.isPending}
          className="min-h-20 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("links")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-[11px] font-bold text-foreground tracking-wide">
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Anything else the creator should know"
          disabled={submitBriefMutation.isPending}
          className="min-h-20 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
          {...form.register("notes")}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          className="w-full sm:flex-1"
          disabled={submitBriefMutation.isPending}
        >
          {submitBriefMutation.isPending ? (
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
            disabled={submitBriefMutation.isPending}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
