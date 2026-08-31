export const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  BRIEF_SUBMISSION_PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  BRIEF_SUBMITTED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  BRIEF_ACCEPTED: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  PRODUCT_SHIPPED: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  PRODUCT_RECEIVED: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  DELIVERED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  REVISION_REQUESTED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  REVISION_SUBMITTED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  ACCEPTED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CREATOR_PAYMENT_DONE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  DISPUTED: "bg-red-500/10 text-red-500 border-red-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
  REFUNDED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  BRIEF_SUBMISSION_PENDING: "Brief Required",
  BRIEF_SUBMITTED: "Brief Submitted",
  BRIEF_ACCEPTED: "Brief Accepted",
  PRODUCT_SHIPPED: "Product Shipped",
  PRODUCT_RECEIVED: "Product Received",
  DELIVERED: "Delivered",
  REVISION_REQUESTED: "Revision Requested",
  REVISION_SUBMITTED: "Revision Delivered",
  ACCEPTED: "Completed",
  CREATOR_PAYMENT_DONE: "Paid Out",
  DISPUTED: "Disputed",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
};

export const STATUS_TAB_GROUPS: Record<string, string[]> = {
  all: [],
  brief: ["BRIEF_SUBMISSION_PENDING"],
  payment: ["PENDING_PAYMENT"],
  progress: [
    "BRIEF_SUBMITTED",
    "BRIEF_ACCEPTED",
    "PRODUCT_SHIPPED",
    "PRODUCT_RECEIVED",
  ],
  review: ["DELIVERED", "REVISION_REQUESTED", "REVISION_SUBMITTED"],
  dispute: ["DISPUTED"],
  completed: ["ACCEPTED", "CREATOR_PAYMENT_DONE"],
  cancelled: ["REJECTED", "REFUNDED"],
};

export const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "brief", label: "Brief Required" },
  { key: "payment", label: "Awaiting Payment" },
  { key: "progress", label: "In Progress" },
  { key: "review", label: "In Review" },
  { key: "dispute", label: "Dispute" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export const STATUS_PILL_STYLE: Record<
  string,
  { dot: string; bg: string; text: string }
> = {
  PENDING_PAYMENT: {
    dot: "bg-[#ef3e51]",
    bg: "bg-[#ef3e51]/10",
    text: "text-[#ef3e51]",
  },
  BRIEF_SUBMISSION_PENDING: {
    dot: "bg-[#c4811a]",
    bg: "bg-[#c4811a]/10",
    text: "text-[#c4811a]",
  },
  BRIEF_SUBMITTED: {
    dot: "bg-[#0aa2d4]",
    bg: "bg-[#0aa2d4]/10",
    text: "text-[#0479a8]",
  },
  BRIEF_ACCEPTED: {
    dot: "bg-[#0aa2d4]",
    bg: "bg-[#0aa2d4]/10",
    text: "text-[#0479a8]",
  },
  PRODUCT_SHIPPED: {
    dot: "bg-[#0aa2d4]",
    bg: "bg-[#0aa2d4]/10",
    text: "text-[#0479a8]",
  },
  PRODUCT_RECEIVED: {
    dot: "bg-[#0aa2d4]",
    bg: "bg-[#0aa2d4]/10",
    text: "text-[#0479a8]",
  },
  DELIVERED: {
    dot: "bg-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/10",
    text: "text-[#6d3bd6]",
  },
  REVISION_REQUESTED: {
    dot: "bg-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/10",
    text: "text-[#6d3bd6]",
  },
  REVISION_SUBMITTED: {
    dot: "bg-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/10",
    text: "text-[#6d3bd6]",
  },
  ACCEPTED: {
    dot: "bg-[#1a9a5b]",
    bg: "bg-[#1a9a5b]/10",
    text: "text-[#1a9a5b]",
  },
  CREATOR_PAYMENT_DONE: {
    dot: "bg-[#1a9a5b]",
    bg: "bg-[#1a9a5b]/10",
    text: "text-[#1a9a5b]",
  },
  DISPUTED: {
    dot: "bg-[#ef3e51]",
    bg: "bg-[#ef3e51]/10",
    text: "text-[#ef3e51]",
  },
  REJECTED: {
    dot: "bg-[#ef3e51]",
    bg: "bg-[#ef3e51]/10",
    text: "text-[#ef3e51]",
  },
  REFUNDED: {
    dot: "bg-slate-400",
    bg: "bg-slate-400/10",
    text: "text-slate-500",
  },
};

export const SPINE_COLOR: Record<string, string> = {
  brief: "#c4811a",
  payment: "#ef3e51",
  progress: "#0aa2d4",
  review: "#8b5cf6",
  dispute: "#ef3e51",
  completed: "#1a9a5b",
  cancelled: "#ef3e51",
};

export function getStatusGroup(status: string): string {
  for (const [group, statuses] of Object.entries(STATUS_TAB_GROUPS)) {
    if (group === "all") continue;
    if (statuses.includes(status)) return group;
  }
  return "completed";
}


export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #ff5da2, #ef3e51)",
  "linear-gradient(135deg, #8b5cf6, #62d6ff)",
  "linear-gradient(135deg, #0aa2d4, #1a9a5b)",
  "linear-gradient(135deg, #ef3e51, #c4811a)",
  "linear-gradient(135deg, #6d3bd6, #ff5da2)",
  "linear-gradient(135deg, #1a9a5b, #62d6ff)",
] as const;

