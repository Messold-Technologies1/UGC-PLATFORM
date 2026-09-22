"use client";

import { Truck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMarkProductShippedMutation } from "../../../hooks/use-mark-product-shipped-mutation";

const shippingSchema = z.object({
  courierName: z.string().min(1, "Courier partner is required"),
  trackingId: z.string().min(1, "Tracking ID is required"),
  dispatchDate: z.string().min(1, "Shipping date is required"),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;

interface ShippingDetailsCardProps {
  orderId: string;
}

export function ShippingDetailsCard({ orderId }: ShippingDetailsCardProps) {
  const markShippedMutation = useMarkProductShippedMutation();
  const isSubmitting = markShippedMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      courierName: "",
      trackingId: "",
      dispatchDate: "",
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
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Truck className="size-5" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Shipping</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              className="h-10 text-sm"
              {...register("courierName")}
            />
            {errors.courierName && (
              <p className="text-xs text-destructive">
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
              className="h-10 text-sm"
              {...register("trackingId")}
            />
            {errors.trackingId && (
              <p className="text-xs text-destructive">
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
              className="h-10 text-sm"
              {...register("dispatchDate")}
            />
            {errors.dispatchDate && (
              <p className="text-xs text-destructive">
                {errors.dispatchDate.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-primary/5 px-4 py-3">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Please ensure the product reaches the creator on time. Keep them
            informed in case of any delay.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="min-w-[160px]"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Mark as Shipped"}
          </Button>
        </div>
      </form>
    </div>
  );
}
