"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building2,
  //Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  History,
  Loader2,
  Package,
  User,
  ClipboardCheck,
  BadgeDollarSign,
  RotateCcw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useMarkAdminOrderCreatorPaidMutation,
  useRefundAdminOrderMutation,
  useRejectAdminOrderMutation,
} from "@/features/admin/hooks/use-admin-order-action-mutations";
import TrackingTimeline, { TimelineItem } from "@/components/ui/tracking-timeline";
import { useAdminOrderDetailsQuery } from "@/features/admin/hooks/use-admin-order-details-query";
import { STATUS_COLORS, STATUS_LABELS } from "@/features/orders/constants";

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(amount: number | string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount) || 0);
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replaceAll("_", " ");
  const className =
    STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Badge
      variant="outline"
      className={`${className} gap-1.5 py-1 px-3 shadow-sm`}
    >
      {status === "DISPUTED" || status === "REJECTED" ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {label}
    </Badge>
  );
}

function CopyableId({ id, label }: { id?: string | null; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!id) return;
    await navigator.clipboard.writeText(id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!id}
        className="flex w-full items-center justify-between rounded-lg border border-transparent bg-secondary/40 p-2.5 text-left transition-all duration-200 hover:border-border/50 hover:bg-secondary/80 disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-secondary/40"
      >
        <span className="truncate font-mono text-sm">
          {id || "Not generated yet"}
        </span>
        {id ? (
          copied ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )
        ) : null}
      </button>
    </div>
  );
}

function AdminOrderDetailsSkeleton() {
  return (
    <div className="p-12 max-w-[1400px] mx-auto space-y-8">
      <section className="mb-12 space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-5 w-lg max-w-full" />
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="flex flex-col gap-8 xl:col-span-2">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-44 rounded-3xl" />
          </div>
          <Skeleton className="h-136 rounded-3xl" />
        </div>
        <div className="flex flex-col gap-8">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-[600px] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const idParam = params.id;
  const orderId = Array.isArray(idParam) ? idParam[0] : idParam;
  const [confirmAction, setConfirmAction] = useState<
    "mark-creator-paid" | "refund" | null
  >(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const { data, isLoading, isError, error } = useAdminOrderDetailsQuery(
    orderId ?? "",
  );
  const markCreatorPaidMutation = useMarkAdminOrderCreatorPaidMutation();
  const rejectOrderMutation = useRejectAdminOrderMutation();
  const refundOrderMutation = useRefundAdminOrderMutation();

  if (isLoading) {
    return <AdminOrderDetailsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="p-12 max-w-[1400px] mx-auto">
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Unable to load this order
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {error?.message ||
                  "The admin order details request did not return usable data."}
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/admin/orderManagement">
                  <ArrowLeft className="h-4 w-4" />
                  Back to orders
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { order, creator, brand } = data;
  const canMarkCreatorPaid =
    order.status === "ACCEPTED" && !order.creatorPaidAt;
  const canRejectOrder = order.status === "DISPUTED";
  const canRefundOrder = order.status === "REJECTED" && !order.refundedAt;
  const isActionPending =
    markCreatorPaidMutation.isPending ||
    rejectOrderMutation.isPending ||
    refundOrderMutation.isPending;
  const totalAmount = order.expectedAmountPaise / 100;
  const addOnsTotal = Number.parseFloat(order.addOnsTotalSnapshot ?? "0") || 0;

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction === "mark-creator-paid") {
      markCreatorPaidMutation.mutate(
        { orderId: order.id },
        { onSuccess: () => setConfirmAction(null) },
      );
      return;
    }

    refundOrderMutation.mutate(
      { orderId: order.id },
      { onSuccess: () => setConfirmAction(null) },
    );
  };

  const handleRejectOrder = () => {
    const resolutionNotes = rejectNotes.trim();

    rejectOrderMutation.mutate(
      {
        orderId: order.id,
        resolutionNotes: resolutionNotes || undefined,
      },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setRejectNotes("");
        },
      },
    );
  };

  const confirmActionCopy =
    confirmAction === "mark-creator-paid"
      ? {
          title: "Mark Creator Paid",
          description:
            "Use this only after the creator has been paid manually from the company bank account.",
          action: "Mark Paid",
          icon: BadgeDollarSign,
        }
      : {
          title: "Trigger Razorpay Refund",
          description:
            "This calls Razorpay immediately. The order must already be rejected, and a successful refund will mark it refunded.",
          action: "Trigger Refund",
          icon: RotateCcw,
        };
  const ConfirmIcon = confirmActionCopy.icon;

  const timelineConfig = [
    { label: "Order Created", date: order.createdAt, active: true, icon: ClipboardCheck },
    {
      label: "Payment Received",
      date: order.paidAt,
      active: Boolean(order.paidAt),
      icon: BadgeDollarSign,
    },
    {
      label: "Brief Submitted",
      date: order.briefSubmittedAt,
      active: Boolean(order.briefSubmittedAt),
      icon: FileText,
    },
    {
      label: "Delivery Deadline",
      date: order.deliveryDeadlineAt,
      active: Boolean(order.deliveryDeadlineAt),
      icon: Clock,
    },
    {
      label: "Content Delivered",
      date: order.deliveredAt,
      active: Boolean(order.deliveredAt),
      icon: Package,
    },
    {
      label: "Order Accepted",
      date: order.acceptedAt,
      active: Boolean(order.acceptedAt),
      icon: CheckCircle2,
    },
    {
      label: "Creator Paid",
      date: order.creatorPaidAt,
      active: Boolean(order.creatorPaidAt),
      icon: BadgeDollarSign,
    },
    {
      label: "Refunded",
      date: order.refundedAt,
      active: Boolean(order.refundedAt),
      icon: RotateCcw,
    },
  ];

  const lastActiveIndex = timelineConfig.map((s) => s.active).lastIndexOf(true);

  const timelineItems: TimelineItem[] = timelineConfig.map((step, index) => {
    let status: TimelineItem["status"] = "pending";
    if (step.active) {
      status =
        index === lastActiveIndex && index !== timelineConfig.length - 1
          ? "in-progress"
          : "completed";
    }

    const iconColor =
      status === "completed"
        ? "text-primary-foreground"
        : status === "in-progress"
          ? "text-primary"
          : "text-muted-foreground";
    
    const IconComponent = step.icon;

    return {
      id: step.label,
      title: step.label,
      date: formatDate(step.date),
      status,
      icon: <IconComponent className={`h-4 w-4 ${iconColor}`} />,
    };
  });

  return (
    <div className="p-12 max-w-[1400px] mx-auto space-y-8 group selection-active">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-4">
            <h2 className="font-headline text-5xl font-extrabold tracking-tight text-foreground">
              Order Details
            </h2>
            <StatusBadge status={order.status} />
          </div>
          {/* <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md border border-border/50 bg-secondary/50 px-2 py-1 font-mono text-xs">
              {order.id}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Created {formatDate(order.createdAt)}
            </span>
          </p> */}
        </div>
        {/* <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin/orderManagement">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </Button> */}
      </motion.section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-8 xl:grid-cols-3"
      >
        <div className="flex flex-col gap-8 xl:col-span-2">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden rounded-3xl border-border/50 shadow-sm dark:border-border/10 dark:bg-black/60">
                <CardHeader className="border-b border-border/50 bg-muted/30 px-6 py-5 dark:border-border/10 dark:bg-card/20">
                  <CardTitle className="flex items-center justify-between font-headline text-lg font-bold text-foreground">
                    Brand
                    <Badge className="border-indigo-500/20 bg-indigo-500/10 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-500/20">
                      Client
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-5">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                      <AvatarImage
                        src={brand.logoUrl || undefined}
                        alt={brand.companyName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/5 text-lg">
                        <Building2 className="h-7 w-7 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xl font-bold leading-tight">
                        {brand.companyName}
                      </h4>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden rounded-3xl border-border/50 shadow-sm dark:border-border/10 dark:bg-black/60">
                <CardHeader className="border-b border-border/50 bg-muted/30 px-6 py-5 dark:border-border/10 dark:bg-card/20">
                  <CardTitle className="flex items-center justify-between font-headline text-lg font-bold text-foreground">
                    Creator
                    <Badge className="border-pink-500/20 bg-pink-500/10 text-[10px] font-bold uppercase tracking-wider text-pink-600 hover:bg-pink-500/20">
                      Talent
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-5">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                      <AvatarImage
                        src={creator.profileImageUrl || undefined}
                        alt={creator.displayName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/5 text-lg">
                        {initials(creator.displayName) || (
                          <User className="h-7 w-7 text-primary" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xl font-bold leading-tight">
                        {creator.displayName}
                      </h4>
                      <p className="mt-1.5 truncate text-sm text-muted-foreground">
                        {creator.city ?? "Remote"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden rounded-3xl border-border/50 shadow-sm dark:border-border/10 dark:bg-black/60">
              <div className="border-b border-border/50 bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-8 py-6 dark:border-border/10">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-3 border-primary/20 bg-background/50 text-primary"
                    >
                      Package Selection
                    </Badge>
                    <h3 className="flex items-center gap-2 font-headline text-2xl font-bold text-foreground">
                      <Package className="h-6 w-6 text-primary" />
                      {order.packageNameSnapshot}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Delivery in {order.deliveryDaysSnapshot} days
                    </p>
                  </div>
                  <div className="rounded-2xl p-5 backdrop-blur-sm dark:border-border/10 md:text-right">
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Base Price
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight">
                      {formatCurrency(
                        order.priceAmountSnapshot,
                        order.currency,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="p-8">
                  <h4 className="mb-5 flex items-center gap-2 font-headline text-lg font-bold">
                    Included Deliverables
                  </h4>
                  <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {order.deliverablesSnapshot.length === 0 ? (
                      <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground dark:border-border/10 dark:bg-card/20">
                        No deliverables were captured for this order.
                      </div>
                    ) : (
                      order.deliverablesSnapshot.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50 dark:border-border/10 dark:bg-card/20"
                        >
                          <div className="rounded-full bg-primary/10 p-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{item}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {order.addOnsSnapshot.length > 0 ? (
                    <div className="space-y-5">
                      <h4 className="flex items-center gap-2 font-headline text-lg font-bold">
                        <Package className="h-5 w-5 text-indigo-500" />
                        Selected Add-Ons
                      </h4>
                      <div className="space-y-3">
                        {order.addOnsSnapshot.map((addon) => (
                          <div
                            key={addon.id}
                            className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-muted/30 p-5 transition-colors hover:bg-muted/50 dark:border-border/10 dark:bg-card/20 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <span className="font-medium">{addon.name}</span>
                              {addon.description ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {addon.description}
                                </p>
                              ) : null}
                            </div>
                            <span className="w-fit rounded-xl border border-border/50 bg-background px-4 py-1.5 text-sm font-bold shadow-sm">
                              +
                              {formatCurrency(
                                addon.priceAmount,
                                order.currency,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-border/50 bg-linear-to-r from-muted/50 to-muted/20 px-8 py-6 dark:border-border/10">
                  <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                      Total Value
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add-ons total:{" "}
                      {formatCurrency(addOnsTotal, order.currency)}
                    </p>
                  </div>
                  <p className="text-right text-4xl font-extrabold tracking-tight text-primary">
                    {formatCurrency(totalAmount, order.currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="flex flex-col gap-8">
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden rounded-3xl border-border/50 shadow-sm dark:border-border/10 dark:bg-black/60">
              <CardHeader className="border-b border-border/50 bg-muted/30 px-6 py-5 dark:border-border/10 dark:bg-card/20">
                <CardTitle className="flex items-center gap-2 font-headline text-lg font-bold text-foreground">
                  <BadgeDollarSign className="h-5 w-5 text-primary" />
                  Admin Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3 p-6">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-700 shadow-none hover:bg-emerald-500/20 hover:text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                  disabled={!canMarkCreatorPaid || isActionPending}
                  onClick={() => setConfirmAction("mark-creator-paid")}
                >
                  {markCreatorPaidMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeDollarSign className="h-4 w-4" />
                  )}
                  Mark creator paid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-700 shadow-none hover:bg-rose-500/20 hover:text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                  disabled={!canRejectOrder || isActionPending}
                  onClick={() => setRejectDialogOpen(true)}
                >
                  {rejectOrderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start rounded-xl border-amber-500/20 bg-amber-500/10 text-amber-700 shadow-none hover:bg-amber-500/20 hover:text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-300"
                  disabled={!canRefundOrder || isActionPending}
                  onClick={() => setConfirmAction("refund")}
                >
                  {refundOrderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Trigger Razorpay refund
                </Button>
                {/* <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
                  Available actions are based on the current order status. Paid
                  creator requires Accepted, reject requires Disputed, and
                  refund requires Rejected.
                </p> */}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden rounded-3xl border-border/50 bg-linear-to-b from-card to-secondary/10 shadow-sm dark:border-border/10 dark:from-black/80 dark:to-black/50">
              <CardHeader className="border-b border-border/50 px-6 py-5 dark:border-border/10">
                <CardTitle className="flex items-center gap-2 font-headline text-lg font-bold text-foreground">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  System Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-sm backdrop-blur">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <History className="h-3 w-3" />
                      Revisions
                    </p>
                    <p className="text-xl font-extrabold">
                      {order.revisionCount}{" "}
                      <span className="text-sm font-medium text-muted-foreground">
                        / {order.maxRevisionsSnapshot}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-sm backdrop-blur">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      Brief
                    </p>
                    {order.hasBrief ? (
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-600 shadow-none hover:bg-emerald-500/20">
                        Submitted
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="px-2.5 py-0.5 font-bold shadow-none"
                      >
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-5 pt-2">
                  <CopyableId
                    label="Razorpay Order ID"
                    id={order.razorpayOrderId}
                  />
                  <CopyableId
                    label="Razorpay Payment ID"
                    id={order.razorpayPaymentId}
                  />
                  <CopyableId
                    label="Razorpay Refund ID"
                    id={order.razorpayRefundId}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden rounded-3xl border-border/50 shadow-sm dark:border-border/10 dark:bg-black/60">
              <CardHeader className="border-b border-border/50 bg-muted/30 px-8 py-6 dark:border-border/10 dark:bg-card/20">
                <CardTitle className="flex items-center gap-2 font-headline text-xl font-bold text-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  Order Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <TrackingTimeline items={timelineItems} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <Dialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open && !isActionPending) setConfirmAction(null);
        }}
      >
        <DialogContent showCloseButton={!isActionPending}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ConfirmIcon className="h-4 w-4 text-primary" />
              {confirmActionCopy.title}
            </DialogTitle>
            <DialogDescription>{confirmActionCopy.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isActionPending}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isActionPending}
              onClick={handleConfirmAction}
            >
              {isActionPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {confirmActionCopy.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open && !rejectOrderMutation.isPending) setRejectDialogOpen(false);
        }}
      >
        <DialogContent showCloseButton={!rejectOrderMutation.isPending}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Reject Order
            </DialogTitle>
            <DialogDescription>
              This marks the order rejected and resolves open disputes as
              refunded. Add internal resolution notes if helpful.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Resolution notes
            </p>
            <Textarea
              value={rejectNotes}
              onChange={(event) => setRejectNotes(event.target.value)}
              disabled={rejectOrderMutation.isPending}
              maxLength={2000}
              placeholder="Optional admin notes"
              className="min-h-28"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={rejectOrderMutation.isPending}
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={rejectOrderMutation.isPending}
              onClick={handleRejectOrder}
            >
              {rejectOrderMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
