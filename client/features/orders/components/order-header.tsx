"use client";

import { useState } from "react";
import { Download, AlertTriangle } from "lucide-react"; // ChevronRight
import Image from "next/image";
// import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useOpenBrandDisputeMutation } from "@/features/orders/hooks/use-open-brand-dispute-mutation";

interface OrderHeaderProps {
  orderId: string;
}

export function OrderHeader({ orderId }: OrderHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDisputeDrawerOpen, setIsDisputeDrawerOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const openBrandDisputeMutation = useOpenBrandDisputeMutation({
    onSuccess: () => {
      setDisputeReason("");
      setIsDisputeDrawerOpen(false);
    },
  });

  const trimmedDisputeReason = disputeReason.trim();

  function handleDisputeSubmit() {
    if (trimmedDisputeReason.length < 3) {
      return;
    }

    openBrandDisputeMutation.mutate({
      orderId,
      reason: trimmedDisputeReason,
    });
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          {/* <nav className="flex items-center gap-2 text-muted-foreground mb-4 text-sm font-medium">
            <Link href="/brand/orders" className="hover:text-foreground transition-colors">
              Orders
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{orderId}</span>
          </nav> */}
          <h1 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight mb-3">
            Summer Essentials UGC
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Creator:</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/20 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
                    alt="Creator"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="font-semibold text-foreground">
                  Riya Sharma
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Deadline:</span>
              <span className="font-medium text-foreground">--/--</span>
            </div>
            {/* <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">
                Accepted
              </span>
            </div> */}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="destructive"
            className="rounded-xl flex flex-row items-center gap-2 shadow-sm font-semibold hover:opacity-90 transition-all"
            onClick={() => setIsDisputeDrawerOpen(true)}
          >
            <AlertTriangle className="w-4 h-4" />
            Raise Dispute
          </Button>
          <Button
            variant="outline"
            className="rounded-xl flex items-center gap-2 shadow-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Invoice
          </Button>
          <Button
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-xl bg-linear-to-r from-primary to-secondary text-primary-foreground font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
          >
            View Brief
          </Button>
        </div>
      </div>

      <Drawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-112.5 data-[vaul-drawer-direction=right]:rounded-none h-full border-l border-border/30 bg-background shadow-2xl flex flex-col p-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <DrawerHeader className="px-8 py-6 border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur-sm z-10 text-left">
            <DrawerTitle className="text-xl font-headline font-extrabold tracking-tight">
              Project Brief
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Order {orderId} - Brief details and requirements.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <form className="space-y-6 bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold tracking-tight text-foreground -mt-1">
                Brief details
              </h3>

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
                  className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="productService"
                  className="text-[11px] font-bold text-foreground tracking-wide"
                >
                  Product / service
                </Label>
                <Input
                  id="productService"
                  placeholder="What should the content feature?"
                  className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
                />
              </div>

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
                  className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
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
                  className="min-h-25 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
                />
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
                <Switch />
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
                  className="min-h-20 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
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
                  className="min-h-20 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
                />
              </div>
            </form>
          </div>

          <DrawerFooter className="px-8 py-6 border-t border-border/20 sticky bottom-0 bg-background/95 backdrop-blur-sm flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full h-14 font-semibold text-base rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Send Details
            </Button>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                className="w-full h-12 font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isDisputeDrawerOpen}
        onOpenChange={(open) => {
          if (!open && openBrandDisputeMutation.isPending) {
            return;
          }

          setIsDisputeDrawerOpen(open);
          if (!open) {
            setDisputeReason("");
          }
        }}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-112.5 data-[vaul-drawer-direction=right]:rounded-none h-full border-l border-border/30 bg-background shadow-2xl flex flex-col p-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <DrawerHeader className="px-8 py-6 border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur-sm z-10 text-left">
            <DrawerTitle className="text-xl font-headline font-extrabold tracking-tight text-destructive">
              Raise Dispute
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Please provide a detailed reason for raising a dispute for Order{" "}
              {orderId}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="disputeReason"
                  className="text-[11px] font-bold text-foreground tracking-wide"
                >
                  Reason for Dispute
                </Label>
                <Textarea
                  id="disputeReason"
                  placeholder="Describe the issue with the order in detail..."
                  className="min-h-37.5 resize-y bg-background rounded-lg border-border/50 focus-visible:ring-destructive/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value)}
                  disabled={openBrandDisputeMutation.isPending}
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter at least 3 characters to submit the dispute.
                </p>
              </div>
            </div>
          </div>

          <DrawerFooter className="px-8 py-6 border-t border-border/20 sticky bottom-0 bg-background/95 backdrop-blur-sm flex flex-col gap-3">
            <Button
              size="lg"
              variant="destructive"
              className="w-full h-14 font-semibold text-base rounded-xl shadow-lg shadow-destructive/20"
              onClick={handleDisputeSubmit}
              disabled={
                openBrandDisputeMutation.isPending ||
                trimmedDisputeReason.length < 3
              }
            >
              {openBrandDisputeMutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                className="w-full h-12 font-semibold text-muted-foreground hover:text-foreground"
                disabled={openBrandDisputeMutation.isPending}
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
