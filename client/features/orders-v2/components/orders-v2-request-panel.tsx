"use client";

import { useState, useEffect } from "react";
import { X, Clock, Download, ChevronDown, ChevronUp, CheckCircle, Package, Truck, Star, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandAvatar, SectionCard, KeyValueRow, StatGrid } from "@/features/creator-ui";
import { BRAND_AVATAR_CONFIG } from "../constants";
import type { OrderV2Item } from "../mock/orders-v2-mock-data";

interface Props {
  order: OrderV2Item | null;
  onClose: () => void;
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const deadline = new Date(targetDate).getTime() + 48 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
      setTimeLeft({
        hours: Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function OrdersV2RequestPanel({ order, onClose }: Props) {
  const [briefExpanded, setBriefExpanded] = useState(false);
  const countdown = useCountdown(order?.createdAt ?? new Date().toISOString());

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
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
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
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                      New Request
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.brand.name} · {order.packageName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-bold text-base text-foreground">{fmt(order.payout)}</span>
                <span className="text-xs text-muted-foreground">Est. Payout</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* 48h countdown */}
            <div className="mx-5 mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                <AlertCircle className="size-4 shrink-0" />
                You have 48 hours to accept or decline this request.
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 shrink-0">
                <Clock className="size-3.5" />
                <span className="text-xs font-bold tabular-nums">
                  {String(countdown.hours).padStart(2, "0")}h : {String(countdown.minutes).padStart(2, "0")}m left
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5">
              {/* Brief */}
              {order.brief && (
                <SectionCard
                  title="Brief"
                  action={
                    <button className="text-xs text-primary font-semibold hover:underline">
                      View Full Brief
                    </button>
                  }
                >
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {order.brief.description}
                  </p>
                  <AnimatePresence>
                    {briefExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-3"
                      >
                        <div className="flex flex-col gap-2">
                          <KeyValueRow label="Video Type" value={order.brief.videoType} />
                          <KeyValueRow label="Key Points" value={order.brief.keyPoints} />
                          <KeyValueRow label="Language" value={order.brief.language} />
                          <KeyValueRow label="Tone" value={order.brief.tone} />
                          <KeyValueRow label="Usage Rights" value={order.brief.usageRights} />
                          <KeyValueRow label="Deliverables" value={order.brief.deliverables} />
                          <KeyValueRow label="Due Date" value={order.brief.dueDate} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => setBriefExpanded((v) => !v)}
                    className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                  >
                    {briefExpanded ? "Show less" : "Show more"}
                    {briefExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                </SectionCard>
              )}

              {/* Brand */}
              <SectionCard
                title="Brand"
                action={
                  <button className="text-xs text-primary font-semibold hover:underline">
                    View Profile
                  </button>
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <BrandAvatar initials={brand.initials} bgClass={brand.bgClass} size="lg" />
                  <span className="font-semibold text-sm text-foreground">{order.brand.name}</span>
                </div>
                <StatGrid
                  cols={3}
                  items={[
                    { label: "Orders", value: order.brand.totalOrders },
                    { label: "Completed", value: order.brand.completedOrders },
                    {
                      label: "Rating",
                      value: (
                        <span className="flex items-center justify-center gap-0.5">
                          <Star className="size-3 text-yellow-500 fill-yellow-500" />
                          {order.brand.rating}
                        </span>
                      ),
                    },
                  ]}
                />
              </SectionCard>

              {/* Message from Brand */}
              {order.messageFromBrand && (
                <SectionCard title="Message from Brand">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed bg-muted/40 rounded-lg p-3">
                    {order.messageFromBrand}
                  </p>
                  {order.messageSentAt && (
                    <p className="text-xs text-muted-foreground mt-2">Sent on {order.messageSentAt}</p>
                  )}
                </SectionCard>
              )}

              {/* Earnings */}
              {order.earnings && (
                <SectionCard title="Earnings">
                  <div className="flex flex-col gap-2">
                    <KeyValueRow label="Base Payout" value={fmt(order.earnings.basePayout)} />
                    <KeyValueRow label={`Add-ons (${order.earnings.addOnsCount})`} value={fmt(order.earnings.addOnsTotal)} />
                    <KeyValueRow label="Platform Fee" value={order.earnings.platformFee === 0 ? "₹0" : fmt(order.earnings.platformFee)} />
                    <KeyValueRow label="Est. Payout" value={fmt(order.earnings.estPayout)} emphasized />
                  </div>
                </SectionCard>
              )}

              {/* Attachments */}
              {order.attachments && order.attachments.length > 0 && (
                <SectionCard
                  title="Brand Attachments"
                  action={
                    <span className="text-xs text-muted-foreground">
                      {order.attachments.length} files
                    </span>
                  }
                >
                  <div className="flex flex-col gap-2">
                    {order.attachments.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <Package className="size-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.size}</p>
                          </div>
                        </div>
                        <button className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                          <Download className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* What happens next */}
              <SectionCard title="What happens next?">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: CheckCircle, num: "1", title: "Accept the order", desc: "Review the brief and accept if you want to work on this project." },
                    { icon: Truck, num: "2", title: "Product shipped", desc: "Brand will ship the product to your address." },
                    { icon: Package, num: "3", title: "Create & deliver", desc: "Create amazing content and submit for review." },
                    { icon: Star, num: "4", title: "Get paid", desc: "Once approved, you'll receive your payout." },
                  ].map(({ num, title, desc }) => (
                    <div key={num} className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-1.5">
                        <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">{num}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">{title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* CTA Footer */}
            <div className="mt-auto p-4 border-t border-border flex gap-2 sticky bottom-0 bg-card">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors">
                Decline
              </button>
              <button className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                <CheckCircle className="size-4" />
                Accept Order
              </button>
            </div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
