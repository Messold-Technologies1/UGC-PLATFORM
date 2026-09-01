"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Clock, FileText, Megaphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OrderListSummary, OrderCreatorSnapshot } from "../../api/types";
import {
  STATUS_LABELS,
  STATUS_PILL_STYLE,
  SPINE_COLOR,
  AVATAR_GRADIENTS,
  getStatusGroup,
} from "../../constants";
import { BuyUsageRightsModal } from "./order-completed/buy-usage-rights-modal";
import { getDeliveryDeadlineCardMeta } from "../delivery-deadline-display";

function getInitials(name: string): string {
  return name
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(parseFloat(amount));
}

function getDaysLabel(days: number | null | undefined): string {
  if (days == null || days <= 0) return "Delivered";
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

const COMPLETED_BUY_USAGE_STATUSES = new Set([
  "ACCEPTED",
  "CREATOR_PAYMENT_DONE",
]);

interface OrderCollaborationCardProps {
  order: OrderListSummary;
  creator: OrderCreatorSnapshot;
  index: number;
}

export function OrderCollaborationCard({
  order,
  creator,
  index,
}: OrderCollaborationCardProps) {
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const group = getStatusGroup(order.status);
  const spineColor = SPINE_COLOR[group] ?? "#e5e5e5";
  const pill = STATUS_PILL_STYLE[order.status];
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const statusLabel =
    // Creator payout status is internal — the brand just sees the order as
    // Completed, same as before payout goes out.
    order.status === "CREATOR_PAYMENT_DONE"
      ? STATUS_LABELS.ACCEPTED
      : STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status;
  const canBuyUsageRights = COMPLETED_BUY_USAGE_STATUSES.has(order.status);
  const deadlineMeta = getDeliveryDeadlineCardMeta(order);
  const timelineLabel =
    order.status === "REJECTED" ||
    order.status === "REFUNDED" ||
    order.status === "DISPUTED" ||
    order.status === "ACCEPTED" ||
    order.status === "CREATOR_PAYMENT_DONE"
      ? deadlineMeta.value !== "—"
        ? `${deadlineMeta.label} ${deadlineMeta.value}`
        : deadlineMeta.label
      : getDaysLabel(order.deliveryDaysSnapshot);

  return (
    <>
      <article
        id={`order-card-${order.id}`}
        className="group/card relative flex flex-col md:grid md:grid-cols-[52px_minmax(0,1.7fr)_minmax(150px,0.9fr)_minmax(120px,auto)_auto] gap-4 md:gap-x-6 items-start md:items-center rounded-[14px] border border-border bg-card p-4 md:px-[22px] md:py-4 md:pl-[26px] shadow-sm transition-all duration-200 ease-[cubic-bezier(.2,.7,.3,1)] hover:translate-x-[3px] hover:border-primary/20 hover:shadow-md"
      >
        <span
          className="pointer-events-none absolute left-0 top-2.5 bottom-2.5 w-[5px] rounded-full hidden md:block"
          style={{ background: spineColor }}
          aria-hidden="true"
        />
        <div className="flex items-center w-full gap-3 md:contents">
          <Avatar
            className="size-[52px] rounded-xl shadow-sm shrink-0"
            style={!creator.profileImageUrl ? { background: gradient } : undefined}
          >
            <AvatarImage
              src={creator.profileImageUrl || undefined}
              alt={creator.displayName}
              className="size-full rounded-xl object-cover"
            />
            <AvatarFallback
              className="rounded-xl text-white text-lg font-extrabold tracking-tight"
              style={{ background: gradient }}
            >
              {getInitials(creator.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 md:flex-none">
            <div className="inline-flex flex-wrap items-center gap-1.5 font-heading text-[16.5px] font-extrabold tracking-tight leading-snug">
              <span className="truncate">{creator.displayName}</span>
              <span className="inline-block rounded-full bg-grape/10 px-2 py-px text-[9.5px] font-extrabold uppercase tracking-[0.09em] text-grape">
                {order.packageNameSnapshot}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-[13.5px] font-semibold text-muted-foreground leading-snug">
              <FileText className="size-[15px] shrink-0 opacity-85" />
              <span className="truncate">{order.packageNameSnapshot}</span>
            </div>
          </div>
        </div>

        <div className="hidden flex-col gap-1.5 text-[12.5px] font-semibold text-muted-foreground md:flex">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-[15px] shrink-0 opacity-85" />
            {creator.city || "Remote"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-[15px] shrink-0 opacity-85" />
            {timelineLabel}
          </span>
        </div>

        <div className="hidden text-right md:block">
          <div className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
            Order value
          </div>
          <div className="mt-0.5 font-heading text-[21px] font-extrabold tracking-tight leading-tight">
            {formatCurrency(order.priceAmountSnapshot, order.currency)}
          </div>
        </div>

        <div className="flex items-center justify-between w-full mt-2 md:mt-0 md:contents">
          <div className="flex flex-col md:hidden">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
              Order value
            </div>
            <div className="font-heading text-lg font-extrabold leading-tight">
              {formatCurrency(order.priceAmountSnapshot, order.currency)}
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-2.5 md:min-w-[132px] ml-auto">
            {pill && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${pill.bg} ${pill.text}`}
              >
                <span
                  className={`size-[7px] shrink-0 rounded-full ${pill.dot}`}
                  aria-hidden="true"
                />
                {statusLabel}
              </span>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {canBuyUsageRights ? (
                <button
                  type="button"
                  id={`buy-usage-${order.id}`}
                  onClick={() => setUsageModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-[11px] border border-primary/30 bg-primary/5 px-3.5 py-[7px] text-[13px] font-bold text-primary shadow-sm transition-all duration-150 hover:bg-primary/10 shrink-0 whitespace-nowrap"
                >
                  <Megaphone className="size-3.5" aria-hidden />
                  Buy usage
                </button>
              ) : null}
              <Link
                href={`/brand/orders/${order.id}`}
                id={`view-order-${order.id}`}
                className="inline-flex items-center gap-1.5 rounded-[11px] border border-border bg-card px-3.5 py-[7px] text-[13px] font-bold text-foreground shadow-sm transition-all duration-150 hover:bg-muted shrink-0 whitespace-nowrap"
              >
                View
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      {canBuyUsageRights ? (
        <BuyUsageRightsModal
          orderId={order.id}
          open={usageModalOpen}
          onOpenChange={setUsageModalOpen}
        />
      ) : null}
    </>
  );
}
