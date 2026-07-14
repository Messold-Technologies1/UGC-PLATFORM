"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, QrCode, Eye, EyeOff } from "lucide-react";

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
import { useAuth } from "@/providers/auth-provider";
import { CLARITY_MASK } from "@/lib/clarity";

const payoutSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("bank"),
    accountHolderName: z.string().trim().min(3, "Full name is required (min 3 chars)"),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, "Account number must be between 9 and 18 digits"),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g., HDFC0001234)"),
    upiId: z.string().optional(),
  }),
  z.object({
    method: z.literal("upi"),
    upiId: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
        "Invalid UPI ID format (e.g., name@bank)",
      ),
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifsc: z.string().optional(),
  }),
]);

export type FormValues = z.infer<typeof payoutSchema>;

export function DashboardPayoutDetails() {
  const { user } = useAuth();
  const {
    data: payoutDetails,
    isLoading,
    isError,
  } = useCreatorPayoutDetailsQuery({
    enabled: !!user,
  });
  const mutation = useCreatorPayoutDetailsMutation({
    onSuccess: () => {
      setIsOpen(false);
      form.reset();
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"bank" | "upi">("bank");
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      method: "bank",
      accountHolderName: "",
      accountNumber: "",
      ifsc: "",
      upiId: "",
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm animate-in fade-in duration-500">
        <Skeleton className="mb-2 h-6 w-32" />
        <Skeleton className="mb-4 h-4 w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !payoutDetails) {
    return null;
  }

  return (
    <div
      id="payment-details"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
      {...CLARITY_MASK}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">
            Payout Details
          </h3>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button className="text-sm font-semibold text-primary transition-colors hover:underline">
                Update
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
              <DialogHeader>
                <DialogTitle>Update Payment Details</DialogTitle>
                <DialogDescription>
                  Provide new payment details below. For your security, current
                  details are masked. Submitting new details will override the old
                  ones securely.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit((v) => {
                  const payload =
                    v.method === "upi"
                      ? ({ upiId: v.upiId } as const)
                      : ({
                          accountHolderName: v.accountHolderName,
                          accountNumber: v.accountNumber,
                          ifsc: v.ifsc,
                        } as const);
                  mutation.mutate(payload);
                })}
                className="space-y-6 pt-2"
              >
                <input type="hidden" {...form.register("method")} />
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => {
                    const next = v as "bank" | "upi";
                    setActiveTab(next);
                    form.setValue("method", next);
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bank">Bank Details</TabsTrigger>
                    <TabsTrigger value="upi">UPI ID</TabsTrigger>
                  </TabsList>

                  <TabsContent value="bank" className="space-y-4 pt-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">
                        Account Holder Name
                      </Label>
                      <Input
                        id="accountHolderName"
                        placeholder="e.g. John Doe"
                        {...form.register("accountHolderName")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <div className="relative">
                        <Input
                          id="accountNumber"
                          type={showAccountNumber ? "text" : "password"}
                          placeholder="Enter full account number"
                          {...form.register("accountNumber")}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                          onClick={() => setShowAccountNumber(!showAccountNumber)}
                          aria-label={
                            showAccountNumber
                              ? "Hide account number"
                              : "Show account number"
                          }
                        >
                          {showAccountNumber ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
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
                      Entering bank details will overwrite your current
                      configuration unconditionally.
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
                      If you configure both Bank and UPI, Bank Details will be
                      prioritized for your payouts.
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
        
        {/* <p className="mt-1.5 text-sm text-muted-foreground">
          Update your Bank Details or UPI ID for payouts.
        </p> */}

        <div className="mt-4 flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/40 divide-y divide-border/50">
          <div className="flex items-start gap-3 p-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground leading-none">
                  Bank Details
                </p>
                {payoutDetails.hasBankDetails && (
                  <div className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 rounded-full border border-green-200">
                    Active
                  </div>
                )}
              </div>
              {payoutDetails.hasBankDetails ? (
                <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                  <p>
                    <span className="font-medium mr-1 text-foreground">Bank Name:</span>
                    {payoutDetails.accountHolderName}
                  </p>
                  <p>
                    <span className="font-medium mr-1 text-foreground">A/c:</span>
                    XXXX {payoutDetails.accountNumberLast4}
                  </p>
                  {payoutDetails.ifsc && (
                    <p>
                      <span className="font-medium mr-1 text-foreground">IFSC:</span>
                      {payoutDetails.ifsc}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pt-0.5">Not configured</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-muted/10">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QrCode className="size-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground leading-none">
                  UPI ID
                </p>
                {payoutDetails.hasUpi && !payoutDetails.hasBankDetails && (
                  <div className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 rounded-full border border-green-200">
                    Active
                  </div>
                )}
              </div>
              {payoutDetails.hasUpi ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded inline-block truncate max-w-full">
                  {payoutDetails.upiMasked}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground pt-0.5">Not configured</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
