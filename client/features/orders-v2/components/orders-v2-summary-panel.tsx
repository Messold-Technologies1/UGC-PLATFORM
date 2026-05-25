"use client";

import { X, ExternalLink, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BrandAvatar, StatusBadge, SectionCard, KeyValueRow } from "@/features/creator-ui";
import {
  ORDER_V2_STATUS_COLORS,
  ORDER_V2_STATUS_LABELS,
  BRAND_AVATAR_CONFIG,
} from "../constants";
import { OrdersV2Timeline } from "./orders-v2-timeline";
import type { OrderV2Item } from "../mock/orders-v2-mock-data";

interface Props {
  order: OrderV2Item | null;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export function OrdersV2SummaryPanel({ order, onClose }: Props) {
  return (
    <AnimatePresence>
      {order && (() => {
        const brand = BRAND_AVATAR_CONFIG[order.brand.name] ?? {
          initials: order.brand.name[0],
          bgClass: "bg-slate-500",
        };
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col h-full bg-card border-l border-border overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3 min-w-0">
                <BrandAvatar initials={brand.initials} bgClass={brand.bgClass} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">Order #{order.id}</span>
                    <StatusBadge colorClass={ORDER_V2_STATUS_COLORS[order.status]}>
                      {ORDER_V2_STATUS_LABELS[order.status]}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.brand.name} · {order.brand.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  View Brief <ExternalLink className="size-3" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5">
              {/* Order Summary */}
              {order.orderSummary && (
                <SectionCard title="Order Summary">
                  <div className="flex flex-col gap-2">
                    <KeyValueRow label="Video Type" value={order.orderSummary.videoType} />
                    <KeyValueRow label="Style" value={order.orderSummary.style} />
                    <KeyValueRow label="Language" value={order.orderSummary.language} />
                    <KeyValueRow label="Key Points" value={order.orderSummary.keyPoints} />
                    {order.orderSummary.addOns.length > 0 && (
                      <KeyValueRow
                        label="Add-ons"
                        value={
                          <div className="flex flex-wrap gap-1 justify-end">
                            {order.orderSummary.addOns.map((a) => (
                              <span
                                key={a}
                                className="px-2 py-0.5 bg-accent text-accent-foreground rounded-md text-xs font-medium"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        }
                      />
                    )}
                    <KeyValueRow
                      label="Total Payout"
                      value={fmt(order.orderSummary.totalPayout)}
                      emphasized
                    />
                  </div>
                </SectionCard>
              )}

              {/* Timeline */}
              {order.timeline && (
                <SectionCard title="Timeline">
                  <OrdersV2Timeline steps={order.timeline} />
                </SectionCard>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto p-4 border-t border-border flex gap-2 sticky bottom-0 bg-card">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
                <MessageSquare className="size-4" />
                Message Brand
              </button>
              <button className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                View Order Details
              </button>
            </div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
