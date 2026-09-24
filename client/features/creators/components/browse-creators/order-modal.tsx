"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Zap,
  CheckCircle,
  Gift,
  Plus,
} from "lucide-react";
import type { CreatorProfile, Package, AddOn } from "../../types";
import { useRazorpayCheckout } from "@/features/payments/hooks/use-razorpay-checkout";
import { useAvailableCoupons } from "@/features/payments/hooks/use-available-coupons";
import { CouponInput } from "@/features/payments/components/coupon-input";
import { useWalletBalance } from "@/features/wallet/hooks";
import { computeCouponDiscountPaise } from "@/features/payments/lib/coupon-discount";
import { cn, getInitials, posterColor } from "@/lib/utils";

function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

const checkboxClass = (on: boolean) =>
  cn(
    "mt-px grid size-[19px] shrink-0 place-items-center rounded-md border-[1.7px] text-white",
    on ? "border-primary bg-primary" : "border-border bg-transparent",
  );

const PackageCard = React.memo(function PackageCard({
  pkg,
  isSelected,
  onSelect,
}: {
  pkg: Package;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isFeatured = pkg.tier === "standard";
  return (
    <button
      type="button"
      className={cn(
        "relative cursor-pointer rounded-[14px] border-[1.5px] bg-card px-3.5 py-3.5 text-left transition-[border-color,box-shadow] duration-150",
        isSelected
          ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_13%,transparent)]"
          : "border-border hover:border-primary/45",
      )}
      onClick={onSelect}
    >
      {isFeatured ? (
        <span className="absolute -top-2 right-2.5 rounded-full bg-primary px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[0.08em] text-primary-foreground uppercase">
          Popular
        </span>
      ) : null}
      <span
        className={cn(
          "absolute top-3.5 right-3 grid size-4.5 place-items-center rounded-full border-[1.6px] text-white",
          isSelected ? "border-primary bg-primary" : "border-border",
        )}
      >
        {isSelected ? <Check size={12} strokeWidth={3.5} /> : null}
      </span>
      <div className="pr-5.5 text-[13px] font-bold">{pkg.label}</div>
      <div className="font-heading mt-1.5 text-[21px] font-extrabold tracking-tight">
        {inr(pkg.price)}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
        {pkg.deliveryDays} {pkg.deliveryDays === 1 ? "day" : "days"} delivery
        and {pkg.revisions} {pkg.revisions === 1 ? "revision" : "revisions"}
      </div>
      <ul className="mt-2.5 flex list-none flex-col gap-1.5 p-0">
        {pkg.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-1.5 text-[11.5px] leading-snug text-foreground"
          >
            <Check
              size={12}
              strokeWidth={3}
              className="mt-0.5 shrink-0 text-primary"
            />{" "}
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
});

const AddOnRow = React.memo(function AddOnRow({
  addOn,
  isSelected,
  onToggle,
}: {
  addOn: AddOn;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-[14px] border-[1.4px] px-3.5 py-3 transition-[border-color,background] duration-150",
        isSelected
          ? "border-primary bg-primary/6"
          : "border-border hover:border-primary/35",
      )}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="sr-only"
      />
      <span className={checkboxClass(isSelected)}>
        {isSelected ? <Check size={12} strokeWidth={3.5} /> : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold">
          {addOn.label}{" "}
          <b className="font-extrabold text-primary">+{inr(addOn.price)}</b>
        </span>
      </span>
    </label>
  );
});

export interface OrderModalProps {
  creator: CreatorProfile | null;
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

function ModalScrim({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-80 bg-black/50 backdrop-blur-xs"
      onClick={onClick}
      aria-hidden="true"
    />
  );
}

function ModalShell({
  children,
  label,
  busy,
}: {
  children: React.ReactNode;
  label: string;
  busy?: boolean;
}) {
  return (
    <div
      className="fixed top-1/2 left-1/2 z-82 flex max-h-[92vh] w-[min(1040px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-busy={busy || undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}

function ModalHeader({
  onClose,
  disabled,
  children,
}: {
  onClose: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-5.5 py-4.5">
      {children}
      <button
        type="button"
        className="grid size-9.5 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-transform duration-200 hover:bg-muted enabled:hover:rotate-90 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onClose}
        aria-label="Close"
        disabled={disabled}
      >
        <X size={18} />
      </button>
    </header>
  );
}

function StepLabel({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <div className="font-heading mb-3.5 flex items-center gap-2.5 text-[15px] font-extrabold">
      <span className="grid size-5.5 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
        {n}
      </span>
      {children}
    </div>
  );
}

const OrderModalLoading = React.memo(function OrderModalLoading({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <>
      <ModalScrim onClick={onClose} />
      <ModalShell label="Loading order options" busy>
        <ModalHeader onClose={onClose}>
          <div className="font-heading text-lg font-extrabold tracking-tight">
            Place order
          </div>
        </ModalHeader>
        <div className="grid place-items-center p-12 text-sm font-semibold text-muted-foreground">
          Loading packages…
        </div>
      </ModalShell>
    </>
  );
});

export const OrderModal = React.memo(function OrderModal({
  creator,
  open,
  onClose,
  isLoading = false,
}: OrderModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  const modal = creator ? (
    <OrderModalContent creator={creator} onClose={onClose} />
  ) : isLoading ? (
    <OrderModalLoading onClose={onClose} />
  ) : null;

  if (!modal) return null;

  return createPortal(modal, document.body);
});

interface OrderModalContentProps {
  creator: CreatorProfile;
  onClose: () => void;
}

const OrderModalContent = React.memo(function OrderModalContent({
  creator,
  onClose,
}: OrderModalContentProps) {
  const defaultPackageId = useMemo(() => {
    if (!creator.packages.length) return null;
    const featured =
      creator.packages.find((p) => p.tier === "standard") ??
      creator.packages[0];
    return featured?.id ?? null;
  }, [creator]);

  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(
    defaultPackageId,
  );
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | null>(
    null,
  );
  const [useCredits, setUseCredits] = useState(false);

  useEffect(() => {
    setSelectedPkgId(defaultPackageId);
    setSelectedAddOnIds([]);
    setSelectedCouponCode(null);
    setUseCredits(false);
  }, [creator.id, defaultPackageId]);

  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectedPackage = useMemo(
    () =>
      creator.packages.find((p) => p.id === selectedPkgId) ??
      creator.packages[0] ??
      null,
    [creator.packages, selectedPkgId],
  );

  const selectedAddOns = useMemo(
    () => creator.addOns.filter((a) => selectedAddOnIds.includes(a.id)),
    [creator.addOns, selectedAddOnIds],
  );

  const addOnTotal = useMemo(
    () => selectedAddOns.reduce((sum, a) => sum + a.price, 0),
    [selectedAddOns],
  );

  const total = (selectedPackage?.price ?? 0) + addOnTotal;

  const { data: coupons = [], isLoading: couponsLoading } =
    useAvailableCoupons(true);

  const selectedCoupon = useMemo(
    () => coupons.find((c) => c.code === selectedCouponCode) ?? null,
    [coupons, selectedCouponCode],
  );

  const grossPaise = Math.round(total * 100);
  const discountPaise = selectedCoupon
    ? computeCouponDiscountPaise(
        selectedCoupon.discountType,
        selectedCoupon.discountValue,
        grossPaise,
      )
    : 0;
  const discountRupees = Math.round(discountPaise / 100);
  const isFirstOrderFree = Boolean(creator.firstOrderFreeEligible);
  const netAfterCoupon = isFirstOrderFree
    ? 0
    : Math.max(0, total - discountRupees);

  const { data: walletBalance } = useWalletBalance(true);
  const creditsAvailableRupees = Math.floor(
    (walletBalance?.balancePaise ?? 0) / 100,
  );
  const canUseCredits = !isFirstOrderFree && creditsAvailableRupees > 0;
  const creditsAppliedRupees =
    useCredits && canUseCredits
      ? Math.min(creditsAvailableRupees, netAfterCoupon)
      : 0;
  const netTotal = Math.max(0, netAfterCoupon - creditsAppliedRupees);

  const { isProcessing, startCheckout } = useRazorpayCheckout({
    creator,
    selectedPackage,
    selectedAddOns,
    couponCode: selectedCouponCode,
    useCredits: useCredits && canUseCredits,
  });

  const toggleAddOn = useCallback((id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleCheckout = useCallback(() => {
    if (!selectedPackage || isProcessing) return;
    void startCheckout();
  }, [selectedPackage, isProcessing, startCheckout]);

  const handleScrimClick = useCallback(() => {
    if (!isProcessing) onClose();
  }, [isProcessing, onClose]);

  const handleCloseClick = useCallback(() => {
    if (!isProcessing) onClose();
  }, [isProcessing, onClose]);

  const initials = getInitials(creator.name);
  const creatorIndex = creator.id
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const [gradA, gradB] = posterColor(creatorIndex);

  return (
    <>
      <ModalScrim onClick={handleScrimClick} />

      <ModalShell label="Place order">
        <ModalHeader onClose={handleCloseClick} disabled={isProcessing}>
          <div className="flex items-center gap-3.5">
            <div
              className="grid size-11.5 place-items-center rounded-[13px] font-heading text-[17px] font-extrabold tracking-tight text-white"
              style={{
                background: creator.thumbnail
                  ? `url(${creator.thumbnail}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${gradA}, ${gradB})`,
              }}
            >
              {creator.thumbnail ? null : initials}
            </div>
            <div>
              <div className="font-heading text-lg font-extrabold tracking-tight">
                Place order
              </div>
              <div className="mt-px text-[13px] font-semibold text-muted-foreground">
                with {creator.name} · {creator.location}
              </div>
            </div>
          </div>
        </ModalHeader>

        <div className="grid overflow-y-auto max-[760px]:grid-cols-1 min-[761px]:grid-cols-[minmax(0,1fr)_384px]">
          <div className="flex flex-col gap-6.5 p-5.5">
            <section>
              <StepLabel n={1}>Choose a package</StepLabel>
              <div className="grid grid-cols-3 gap-2.5 max-[620px]:grid-cols-1">
                {creator.packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isSelected={pkg.id === selectedPkgId}
                    onSelect={() => setSelectedPkgId(pkg.id)}
                  />
                ))}
              </div>
            </section>

            {creator.addOns.length > 0 && (
              <section>
                <StepLabel n={2}>
                  Add-ons{" "}
                  <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    optional
                  </span>
                </StepLabel>
                <div className="grid grid-cols-2 gap-2.5 max-[620px]:grid-cols-1">
                  {creator.addOns.map((addOn) => (
                    <AddOnRow
                      key={addOn.id}
                      addOn={addOn}
                      isSelected={selectedAddOnIds.includes(addOn.id)}
                      onToggle={() => toggleAddOn(addOn.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="border-border bg-muted p-5.5 min-[761px]:border-l">
            <div className="sticky top-0">
              {canUseCredits ? (
                <button
                  type="button"
                  className={cn(
                    "mb-3.5 flex w-full items-start gap-2.5 rounded-[14px] border px-3.5 py-3 text-left transition-[border-color,background,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-55",
                    useCredits
                      ? "border-primary bg-primary/8 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_10%,transparent)]"
                      : "border-primary/22 bg-primary/8",
                  )}
                  onClick={() => setUseCredits((on) => !on)}
                  disabled={isProcessing}
                  aria-pressed={useCredits}
                >
                  <div
                    className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/14 text-primary"
                    aria-hidden
                  >
                    <Gift size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[13.5px] font-extrabold tracking-tight text-foreground">
                      You have {inr(creditsAvailableRupees)} credits
                    </strong>
                    <span className="mt-0.5 block text-xs font-semibold leading-snug text-muted-foreground">
                      {creditsAppliedRupees > 0
                        ? netTotal === 0
                          ? "Use your credits and pay ₹0 for this order"
                          : `Use your credits and pay ${inr(netTotal)} for this order`
                        : "Turn this on to use them on this order"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
                      useCredits ? "bg-primary" : "bg-input",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "block size-4 rounded-full bg-background shadow-sm transition-transform",
                        useCredits ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </span>
                </button>
              ) : null}

              <div className="font-heading mb-3.5 text-sm font-extrabold">
                Order summary
              </div>

              <div className="flex flex-col gap-2.5 border-b border-border pb-3.5">
                {selectedPackage && (
                  <div className="flex items-center justify-between gap-2.5 text-[13px] font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      {selectedPackage.label}
                    </span>
                    <span>{inr(selectedPackage.price)}</span>
                  </div>
                )}
                {selectedAddOns.map((a) => (
                  <div
                    className="flex items-center justify-between gap-2.5 text-[12.5px] font-medium text-muted-foreground"
                    key={a.id}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Plus size={11} /> {a.label}
                    </span>
                    <span>{inr(a.price)}</span>
                  </div>
                ))}
                {!isFirstOrderFree && discountRupees > 0 && selectedCoupon && (
                  <div className="flex items-center justify-between gap-2.5 text-[12.5px] font-medium text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      Coupon · {selectedCoupon.code}
                    </span>
                    <span>−{inr(discountRupees)}</span>
                  </div>
                )}
                {isFirstOrderFree && (
                  <div className="flex items-center justify-between gap-2.5 text-[12.5px] font-medium text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      First order free
                    </span>
                    <span>−{inr(total)}</span>
                  </div>
                )}
                {creditsAppliedRupees > 0 ? (
                  <div className="flex items-center justify-between gap-2.5 text-[12.5px] font-medium text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      Credits
                    </span>
                    <span>−{inr(creditsAppliedRupees)}</span>
                  </div>
                ) : null}
                <div className="font-heading mt-0.5 flex items-center justify-between gap-2.5 border-t border-border pt-2.5 text-[17px] font-extrabold">
                  <span>Total</span>
                  <span>{isFirstOrderFree ? "Free" : inr(netTotal)}</span>
                </div>
              </div>

              {isFirstOrderFree ? (
                <div className="my-3 flex items-center gap-2 rounded-xl border border-primary/35 bg-primary/8 px-3 py-2.5 text-[13px] font-semibold text-primary">
                  🎁 Your first order with this creator is on us. No payment
                  needed.
                </div>
              ) : (
                <div className="my-3">
                  <CouponInput
                    coupons={coupons}
                    isLoading={couponsLoading}
                    appliedCode={selectedCouponCode}
                    discountRupees={discountRupees}
                    onApply={setSelectedCouponCode}
                    onRemove={() => setSelectedCouponCode(null)}
                    disabled={isProcessing}
                  />
                </div>
              )}

              <button
                type="button"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-primary text-[14.5px] font-bold text-primary-foreground shadow-sm hover:brightness-105 disabled:opacity-50"
                onClick={handleCheckout}
                disabled={isProcessing || !selectedPackage}
              >
                {isProcessing ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{" "}
                    Creating checkout…
                  </>
                ) : isFirstOrderFree ? (
                  <>
                    <Zap size={16} /> Place free order
                  </>
                ) : creditsAppliedRupees > 0 && netTotal === 0 ? (
                  <>
                    <Zap size={16} /> Pay with credits · {inr(netTotal)}
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Create checkout · {inr(netTotal)}
                  </>
                )}
              </button>

              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <CheckCircle size={13} className="text-green-700" /> Funds held
                safely until you approve delivery
              </div>
            </div>
          </aside>
        </div>
      </ModalShell>
    </>
  );
});
