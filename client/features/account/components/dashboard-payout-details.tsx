"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCreatorPayoutDetailsQuery } from "@/features/creators/hooks/use-creator-payout-details-query";
import { useCreatorPayoutDetailsMutation } from "@/features/creators/hooks/use-creator-payout-details-mutation";

const payoutSchema = z
  .object({
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifsc: z.string().optional(),
    upiId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const { accountHolderName, accountNumber, ifsc, upiId } = data;
    const hasAnyBankData = !!(
      accountHolderName ||
      accountNumber ||
      ifsc
    );
    const hasFullBankData = !!(
      accountHolderName &&
      accountNumber &&
      ifsc
    );

    if (hasAnyBankData && !hasFullBankData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Bank payout requires all bank fields together (Name, Number, IFSC).",
        path: ["accountNumber"],
      });
    }

    if (!hasFullBankData && !upiId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either full bank details or a valid UPI ID.",
        path: ["upiId"],
      });
    }

    if (ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid IFSC format.",
        path: ["ifsc"],
      });
    }

    if (upiId && !/^[^@\s]+@[^@\s]+$/.test(upiId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid UPI ID format.",
        path: ["upiId"],
      });
    }
  });

type FormValues = z.infer<typeof payoutSchema>;

export function DashboardPayoutDetails() {
  const { data: payoutDetails, isLoading, isError } = useCreatorPayoutDetailsQuery({
    enabled: true,
  });
  const mutation = useCreatorPayoutDetailsMutation({
    onSuccess: () => {
      setIsOpen(false);
      form.reset();
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"bank" | "upi">("bank");

  const form = useForm<FormValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      accountHolderName: "",
      accountNumber: "",
      ifsc: "",
      upiId: "",
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="mb-6 h-4 w-full max-w-xl" />
            <div className="mt-6 flex flex-col gap-4 max-w-2xl">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
          <Skeleton className="mt-4 h-9 w-32 shrink-0 px-5 sm:mt-0" />
        </div>
      </div>
    );
  }

  if (isError || !payoutDetails) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Payment Details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Add or update your payment details. You can configure either your Bank Details or your UPI ID for payouts.
          </p>

          <div className="mt-6 flex flex-col gap-4 max-w-2xl">
            <div className="flex items-start gap-4 rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Bank Transfer Details
                </p>
                {payoutDetails.hasBankDetails ? (
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                    <p>
                      <span className="font-medium mr-1 text-foreground">Bank Account:</span> 
                      ending with {payoutDetails.accountNumberLast4}
                    </p>
                    {payoutDetails.accountHolderName && (
                      <p>
                        <span className="font-medium mr-1 text-foreground">Holder:</span> 
                        {payoutDetails.accountHolderName}
                      </p>
                    )}
                    {payoutDetails.ifsc && (
                      <p>
                        <span className="font-medium mr-1 text-foreground">IFSC:</span> 
                        {payoutDetails.ifsc}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not configured</p>
                )}
              </div>
              {payoutDetails.hasBankDetails && (
                <div className="shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 rounded-full border border-green-200">
                  Active
                </div>
              )}
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <QrCode className="size-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">UPI ID</p>
                {payoutDetails.hasUpi ? (
                  <p className="mt-2 font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded inline-block">
                    {payoutDetails.upiMasked}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not configured</p>
                )}
              </div>
              {payoutDetails.hasUpi && !payoutDetails.hasBankDetails && (
                <div className="shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 rounded-full border border-green-200">
                  Active
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 sm:mt-0 px-5 shrink-0 font-medium"
            >
              Update Details
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update Payment Details</DialogTitle>
              <DialogDescription>
                Provide new payment details below. For your security, current details are masked. Submitting new details will override the old ones securely.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-6 pt-2"
            >
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "bank" | "upi")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bank">Bank Details</TabsTrigger>
                  <TabsTrigger value="upi">UPI ID</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bank" className="space-y-4 pt-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      placeholder="e.g. John Doe"
                      {...form.register("accountHolderName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      placeholder="Enter full account number"
                      {...form.register("accountNumber")}
                    />
                    {form.formState.errors.accountNumber && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.accountNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc">IFSC Code</Label>
                    <Input
                      id="ifsc"
                      placeholder="e.g. HDFC0001234"
                      className="uppercase"
                      {...form.register("ifsc")}
                    />
                    {form.formState.errors.ifsc && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.ifsc.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg border border-border/60">
                    Entering bank details will overwrite your current configuration unconditionally.
                  </div>
                </TabsContent>
                
                <TabsContent value="upi" className="space-y-4 pt-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      placeholder="e.g. yourname@okhdfcbank"
                      {...form.register("upiId")}
                    />
                    {form.formState.errors.upiId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.upiId.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg border border-border/60">
                    If you configure both Bank and UPI, Bank Details will be prioritized for your payouts.
                  </div>
                </TabsContent>
              </Tabs>

              {form.formState.errors.root && (
               <p className="text-sm font-medium text-destructive">
                 {form.formState.errors.root.message}
               </p>
              )}

              <DialogFooter>
                <div className="flex w-full sm:justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={mutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && (
                      <Spinner className="mr-2 size-4 opacity-70" aria-hidden />
                    )}
                    Save securely
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
