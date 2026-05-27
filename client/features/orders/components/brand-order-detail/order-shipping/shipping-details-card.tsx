"use client";

import { Truck, HelpCircle, ShieldAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMarkProductShippedMutation } from "../../../hooks/use-mark-product-shipped-mutation";

const shippingSchema = z.object({
  courierName: z.string().min(1, "Courier partner is required"),
  trackingId: z.string().min(1, "Tracking ID is required"),
  dispatchDate: z.string().min(1, "Shipping date is required"),
  shareTracking: z.boolean(),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;

interface ShippingDetailsCardProps {
  orderId: string;
  creatorName: string;
}

export function ShippingDetailsCard({
  orderId,
  creatorName,
}: ShippingDetailsCardProps) {
  const markShippedMutation = useMarkProductShippedMutation();
  const isSubmitting = markShippedMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      courierName: "",
      trackingId: "",
      dispatchDate: "",
      shareTracking: true,
    },
    mode: "onChange",
  });

  const onSubmit = (data: ShippingFormValues) => {
    markShippedMutation.mutate({
      orderId,
      courierName: data.courierName,
      trackingId: data.trackingId,
      dispatchDate: data.dispatchDate,
    });
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="size-5" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Shipping</h3>
        </div>
        <Button
          variant="link"
          className="text-primary gap-1.5 h-auto p-0 font-medium text-sm"
        >
          <HelpCircle className="size-4" />
          How shipping works?
        </Button>
      </div>

      <div className="p-6 space-y-8">
        <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 mt-0.5">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                Ship the product to the creator
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1 leading-relaxed">
                Once {creatorName}{" "}receives the product, she&apos;ll confirm and
                start creating your content.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <h4 className="font-semibold text-foreground">
            Add Shipping Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="courierPartner"
                className="text-xs font-semibold text-muted-foreground flex gap-1"
              >
                Courier Partner <span className="text-destructive">*</span>
              </Label>
              <Input
                id="courierPartner"
                placeholder="e.g. FedEx, BlueDart"
                className="h-11"
                {...register("courierName")}
              />
              {errors.courierName && (
                <p className="text-xs text-destructive mt-1.5">
                  {errors.courierName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="trackingId"
                className="text-xs font-semibold text-muted-foreground flex gap-1"
              >
                Tracking ID / AWB Number{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="trackingId"
                placeholder="e.g. 1234567890"
                className="h-11"
                {...register("trackingId")}
              />
              {errors.trackingId && (
                <p className="text-xs text-destructive mt-1.5">
                  {errors.trackingId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="shippingDate"
                className="text-xs font-semibold text-muted-foreground flex gap-1"
              >
                Shipping Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shippingDate"
                type="date"
                className="h-11"
                {...register("dispatchDate")}
              />
              {errors.dispatchDate && (
                <p className="text-xs text-destructive mt-1.5">
                  {errors.dispatchDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Controller
              name="shareTracking"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="shareTracking"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              )}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="shareTracking"
                className="text-sm font-semibold cursor-pointer"
              >
                Share tracking link with creator
              </Label>
              <p className="text-xs text-muted-foreground">
                Creator will be able to track the shipment.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                <Info className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">
                  Please ensure the product reaches the creator on time.
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Keep the creator informed in case of any delay.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="w-full md:w-auto min-w-[160px]"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Mark as Shipped"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
