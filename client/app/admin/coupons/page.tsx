"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Plus, Tag, Ticket, Trash2, X } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useCouponsQuery } from "@/features/coupons/hooks/use-coupons-query";
import { useCreateCouponMutation } from "@/features/coupons/hooks/use-create-coupon-mutation";
import { useUpdateCouponMutation } from "@/features/coupons/hooks/use-update-coupon-mutation";
import { useDeleteCouponMutation } from "@/features/coupons/hooks/use-delete-coupon-mutation";
import type {
  Coupon,
  CreateCouponInput,
  DiscountType,
} from "@/features/coupons/types";

const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: "PERCENTAGE", label: "Percentage off" },
  { value: "FIXED", label: "Fixed amount off" },
  { value: "PLATFORM_FEE_WAIVER", label: "Platform fee waiver" },
];

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Human-readable summary of a coupon's discount. */
function describeDiscount(coupon: Coupon): string {
  switch (coupon.discountType) {
    case "PERCENTAGE":
      return `${coupon.discountValue}% off`;
    case "FIXED":
      // discountValue is stored in paise.
      return `${rupeeFormatter.format(coupon.discountValue / 100)} off`;
    case "PLATFORM_FEE_WAIVER":
      return "No platform fee";
    default:
      return "—";
  }
}

type FormState = {
  code: string;
  name: string;
  description: string;
  discountType: DiscountType;
  /** Raw input: whole percent for PERCENTAGE, rupees for FIXED. */
  value: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENTAGE",
  value: "",
  active: true,
};

function formFromCoupon(coupon: Coupon): FormState {
  let value = "";
  if (coupon.discountType === "PERCENTAGE") {
    value = String(coupon.discountValue);
  } else if (coupon.discountType === "FIXED") {
    // Stored in paise → show rupees.
    value = String(coupon.discountValue / 100);
  }
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? "",
    discountType: coupon.discountType,
    value,
    active: coupon.active,
  };
}

function AdminCouponsPageInner() {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.canManageAdmins);
  const { data, isLoading, isError } = useCouponsQuery(isSuperAdmin);
  const createMutation = useCreateCouponMutation();
  const updateMutation = useUpdateCouponMutation();
  const deleteMutation = useDeleteCouponMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const coupons = useMemo(() => data ?? [], [data]);
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const needsValue = form.discountType !== "PLATFORM_FEE_WAIVER";

  // Coupons are managed by super-admins only. Non-super-admins never see the
  // nav link, but guard direct navigation too (the API also enforces this).
  if (!isSuperAdmin) {
    return (
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Coupons
          </h1>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-20 text-center text-sm text-muted-foreground">
          You don&apos;t have access to coupon management. Only designated
          super-admins can create and manage coupons.
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm(formFromCoupon(coupon));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
  };

  const buildPayload = (): CreateCouponInput | null => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code) {
      toast.error("Enter a coupon code.");
      return null;
    }
    if (!name) {
      toast.error("Enter a coupon name.");
      return null;
    }

    const description = form.description.trim();
    const payload: CreateCouponInput = {
      code,
      name,
      description: description || undefined,
      discountType: form.discountType,
      active: form.active,
    };

    if (form.discountType === "PERCENTAGE") {
      const percent = Number(form.value);
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        toast.error("Enter a percentage between 1 and 100.");
        return null;
      }
      payload.discountValue = Math.round(percent);
    } else if (form.discountType === "FIXED") {
      const rupees = Number(form.value);
      if (!Number.isFinite(rupees) || rupees <= 0) {
        toast.error("Enter an amount in rupees greater than 0.");
        return null;
      }
      // Rupees → paise.
      payload.discountValue = Math.round(rupees * 100);
    } else {
      // PLATFORM_FEE_WAIVER: value is unused.
      payload.discountValue = 0;
    }

    return payload;
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      if (editingCoupon) {
        await updateMutation.mutateAsync({ id: editingCoupon.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setIsFormOpen(false);
    } catch {
      // mutation hooks already toast; keep the form open so the admin can retry.
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    try {
      await updateMutation.mutateAsync({
        id: coupon.id,
        payload: { active: !coupon.active },
      });
    } catch {
      // hook toasts on error.
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setConfirmingId(null);
    } catch {
      // hook toasts on error.
    }
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Coupons
          </h1>
          <p className="mt-1 text-muted-foreground">
            Discount codes brands can apply at checkout.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
        >
          <Plus className="size-4" />
          New coupon
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={`coupon-skeleton-${index}`}
              className="h-16 w-full rounded-2xl"
            />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-20 text-center text-sm text-muted-foreground">
          We could not load coupons right now. Try again shortly.
        </div>
      )}

      {!isLoading && !isError && coupons.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-20 text-center">
          <Ticket className="size-6 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No coupons yet. Create one to offer brands a discount at checkout.
          </p>
        </div>
      )}

      {!isLoading && !isError && coupons.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Created by</th>
                  <th className="px-4 py-3">Redemptions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const isConfirming = confirmingId === coupon.id;
                  const isTogglingThis =
                    togglingId === coupon.id && updateMutation.isPending;
                  const isDeletingThis =
                    deleteMutation.isPending && isConfirming;

                  return (
                    <tr
                      key={coupon.id}
                      className="border-b border-border/20 last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 font-mono text-xs font-bold uppercase tracking-wide text-foreground">
                          <Tag className="size-3.5 text-muted-foreground" />
                          {coupon.code.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {coupon.name}
                        </div>
                        {coupon.description && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {coupon.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {describeDiscount(coupon)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {coupon.createdByName?.trim() || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {coupon.redemptionCount ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.active}
                            disabled={isTogglingThis}
                            onCheckedChange={() => handleToggleActive(coupon)}
                            aria-label={
                              coupon.active
                                ? "Deactivate coupon"
                                : "Activate coupon"
                            }
                          />
                          <span
                            className={
                              coupon.active
                                ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                                : "text-xs font-semibold text-muted-foreground"
                            }
                          >
                            {coupon.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                              <AlertTriangle className="size-3.5" />
                              Delete?
                            </span>
                            <button
                              onClick={() => setConfirmingId(null)}
                              disabled={isDeletingThis}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              disabled={isDeletingThis}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                            >
                              {isDeletingThis ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(coupon)}
                              title="Edit"
                              className="rounded-lg border border-border bg-background p-1.5 text-foreground shadow-sm transition-colors hover:bg-muted"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmingId(coupon.id)}
                              title="Delete"
                              className="rounded-lg border border-border bg-background p-1.5 text-red-500 shadow-sm transition-colors hover:bg-muted"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="glass-panel w-full max-w-lg space-y-5 rounded-2xl border border-border/50 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingCoupon ? "Edit Coupon" : "New Coupon"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Codes are stored uppercased and applied at checkout.
                </p>
              </div>
              <button
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Code
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="WELCOME20"
                    className="glass-input w-full rounded-lg bg-background/50 px-3 py-2 text-sm font-mono uppercase tracking-wide"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Welcome offer"
                    className="glass-input w-full rounded-lg bg-background/50 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description{" "}
                  <span className="normal-case text-muted-foreground/60">
                    — optional
                  </span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  placeholder="Internal note about this coupon."
                  className="glass-input w-full resize-none rounded-lg bg-background/50 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Discount type
                  </label>
                  <Select
                    value={form.discountType}
                    onValueChange={(value) =>
                      setForm((f) => ({
                        ...f,
                        discountType: value as DiscountType,
                        value: "",
                      }))
                    }
                  >
                    <SelectTrigger className="glass-input h-auto w-full rounded-lg bg-background/50 px-3 py-2 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsValue && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {form.discountType === "PERCENTAGE"
                        ? "Percent off"
                        : "Amount (₹)"}
                    </label>
                    <input
                      type="number"
                      min={form.discountType === "PERCENTAGE" ? 1 : 0}
                      max={
                        form.discountType === "PERCENTAGE" ? 100 : undefined
                      }
                      step={form.discountType === "PERCENTAGE" ? 1 : "any"}
                      value={form.value}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, value: e.target.value }))
                      }
                      placeholder={
                        form.discountType === "PERCENTAGE" ? "20" : "500"
                      }
                      className="glass-input w-full rounded-lg bg-background/50 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {form.discountType === "PERCENTAGE" &&
                  "A percentage off the order total (1–100)."}
                {form.discountType === "FIXED" &&
                  "A flat amount off the order total, entered in rupees."}
                {form.discountType === "PLATFORM_FEE_WAIVER" &&
                  "Waives the 20% platform fee — the brand pays about 20% less. No value needed."}
              </p>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, active: checked }))
                  }
                />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : editingCoupon
                    ? "Save Changes"
                    : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCouponsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 p-8">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={`page-skeleton-${index}`}
                className="h-16 w-full rounded-2xl"
              />
            ))}
          </div>
        </div>
      }
    >
      <AdminCouponsPageInner />
    </Suspense>
  );
}
