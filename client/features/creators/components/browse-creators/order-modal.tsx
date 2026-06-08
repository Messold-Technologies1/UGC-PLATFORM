"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Truck,
  Film,
  RefreshCw,
  Zap,
  CheckCircle,
  Plus,
} from "lucide-react";
import type { CreatorProfile, Package, AddOn } from "../../types";
import { useRazorpayCheckout } from "@/features/payments/hooks/use-razorpay-checkout";
import { getInitials, posterColor } from "@/lib/utils";

function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

function etaLabel(days: number): string {
  const d = new Date(Date.now() + days * 864e5);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

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
      className={`om-pkg${isSelected ? " on" : ""}`}
      onClick={onSelect}
    >
      {isFeatured ? <span className="om-pop">Popular</span> : null}
      <span className="om-radio">
        {isSelected ? <Check size={12} strokeWidth={3.5} /> : null}
      </span>
      <div className="om-pkg-name">{pkg.label}</div>
      <div className="om-pkg-price">{inr(pkg.price)}</div>
      <div className="om-pkg-meta">
        {pkg.deliveryDays}-day · {pkg.revisions} rev
        {pkg.revisions > 1 ? "s" : ""}
      </div>
      <ul className="om-pkg-feats">
        {pkg.features.map((f) => (
          <li key={f}>
            <Check size={12} strokeWidth={3} /> {f}
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
    <label className={`om-addon${isSelected ? " on" : ""}`}>
      <input type="checkbox" checked={isSelected} onChange={onToggle} />
      <span className="om-cb">
        {isSelected ? <Check size={12} strokeWidth={3.5} /> : null}
      </span>
      <span className="om-addon-txt">
        <span className="om-addon-name">
          {addOn.label} <b>+{inr(addOn.price)}</b>
        </span>
        {addOn.description ? (
          <span className="om-addon-desc">{addOn.description}</span>
        ) : null}
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

const OrderModalLoading = React.memo(function OrderModalLoading({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className={`om-scrim${open ? " show" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`ordermodal${open ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading order options"
      >
        <header className="om-head">
          <div className="om-title">Place order</div>
          <button
            type="button"
            className="om-x"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div
          className="om-body"
          style={{
            display: "grid",
            placeItems: "center",
            padding: 48,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--muted-foreground)",
          }}
        >
          Loading packages…
        </div>
      </div>
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
    <OrderModalContent creator={creator} open={open} onClose={onClose} />
  ) : isLoading ? (
    <OrderModalLoading open={open} onClose={onClose} />
  ) : null;

  if (!modal) return null;

  return createPortal(
    <div className="browse-redesign-scope">{modal}</div>,
    document.body,
  );
});

interface OrderModalContentProps {
  creator: CreatorProfile;
  open: boolean;
  onClose: () => void;
}

const OrderModalContent = React.memo(function OrderModalContent({
  creator,
  open,
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

  useEffect(() => {
    if (open) {
      setSelectedPkgId(defaultPackageId);
      setSelectedAddOnIds([]);
    }
  }, [open, creator.id, defaultPackageId]);

  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  const { isProcessing, startCheckout } = useRazorpayCheckout({
    creator,
    selectedPackage,
    selectedAddOns,
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
      <div
        className={`om-scrim${open ? " show" : ""}`}
        onClick={handleScrimClick}
        aria-hidden="true"
      />

      <div
        className={`ordermodal${open ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Place order"
      >
        <header className="om-head">
          <div className="om-head-creator">
            <div
              className="om-ava"
              style={{
                background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
              }}
            >
              {initials}
            </div>
            <div>
              <div className="om-title">Place order</div>
              <div className="om-with">
                with {creator.name} · {creator.location}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="om-x"
            onClick={handleCloseClick}
            aria-label="Close"
            disabled={isProcessing}
          >
            <X size={18} />
          </button>
        </header>

        <div className="om-body scroll-thin">
          <div className="om-main">
            <section>
              <div className="om-step">
                <span className="om-num">1</span> Choose a package
              </div>
              <div className="om-pkgs">
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
                <div className="om-step">
                  <span className="om-num">2</span> Add-ons{" "}
                  <span className="om-opt">optional</span>
                </div>
                <div className="om-addons">
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

          <aside className="om-summary">
            <div className="om-sum-card">
              <div className="om-sum-h">Order summary</div>

              {selectedPackage && (
                <div className="om-sum-pkg">
                  <div className="om-sum-pkg-top">
                    <span className="om-sum-pkg-name">
                      {selectedPackage.label}
                    </span>
                    {selectedPackage.tier === "standard" ? (
                      <span className="om-sum-pkg-pop">Popular</span>
                    ) : null}
                  </div>
                  <div className="om-sum-specs">
                    <div className="om-spec">
                      <Truck size={15} />
                      <span>{selectedPackage.deliveryDays}d</span>
                      <small>delivery</small>
                    </div>
                    <div className="om-spec">
                      <Film size={15} />
                      <span>{selectedPackage.videoLengthSeconds ? `${selectedPackage.videoLengthSeconds}s` : "Video"}</span>
                      <small>per video</small>
                    </div>
                    <div className="om-spec">
                      <RefreshCw size={15} />
                      <span>{selectedPackage.revisions}</span>
                      <small>
                        revision{selectedPackage.revisions > 1 ? "s" : ""}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              <div className="om-lines">
                {selectedPackage && (
                  <div className="om-line">
                    <span>{selectedPackage.label}</span>
                    <span>{inr(selectedPackage.price)}</span>
                  </div>
                )}
                {selectedAddOns.map((a) => (
                  <div className="om-line muted" key={a.id}>
                    <span>
                      <Plus size={11} /> {a.label}
                    </span>
                    <span>{inr(a.price)}</span>
                  </div>
                ))}
                <div className="om-line total">
                  <span>Total</span>
                  <span>{inr(total)}</span>
                </div>
              </div>

              <button
                type="button"
                className="dr-btn dr-btn-primary om-checkout"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleCheckout}
                disabled={isProcessing || !selectedPackage}
              >
                {isProcessing ? (
                  <>
                    <span className="om-spin" /> Creating checkout…
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Create checkout · {inr(total)}
                  </>
                )}
              </button>

              <div className="om-secure">
                <CheckCircle size={13} /> Funds held safely until you approve
                delivery
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
});
