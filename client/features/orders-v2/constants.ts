export type OrderV2Status =
  | "NEW_REQUEST"
  | "AWAITING_SHIPMENT"
  | "IN_PROGRESS"
  | "REVISION_REQUESTED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_V2_STATUS_LABELS: Record<OrderV2Status, string> = {
  NEW_REQUEST: "New Request",
  AWAITING_SHIPMENT: "Awaiting Shipment",
  IN_PROGRESS: "In Progress",
  REVISION_REQUESTED: "Revision Requested",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_V2_STATUS_COLORS: Record<OrderV2Status, string> = {
  NEW_REQUEST: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  AWAITING_SHIPMENT: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  REVISION_REQUESTED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DELIVERED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export type OrderV2Tab =
  | "ALL"
  | "NEW_REQUEST"
  | "ACTIVE"
  | "REVISION_REQUESTED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_V2_TABS: { key: OrderV2Tab; label: string }[] = [
  { key: "ALL", label: "All Orders" },
  { key: "NEW_REQUEST", label: "New Requests" },
  { key: "ACTIVE", label: "Active" },
  { key: "REVISION_REQUESTED", label: "Revisions" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

/** Maps a tab key to which statuses it includes */
export const TAB_STATUS_MAP: Record<OrderV2Tab, OrderV2Status[]> = {
  ALL: [
    "NEW_REQUEST",
    "AWAITING_SHIPMENT",
    "IN_PROGRESS",
    "REVISION_REQUESTED",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ],
  NEW_REQUEST: ["NEW_REQUEST"],
  ACTIVE: ["AWAITING_SHIPMENT", "IN_PROGRESS"],
  REVISION_REQUESTED: ["REVISION_REQUESTED"],
  DELIVERED: ["DELIVERED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

export const BRAND_AVATAR_CONFIG: Record<
  string,
  { initials: string; bgClass: string }
> = {
  "GlowUp Skincare": { initials: "G", bgClass: "bg-emerald-500" },
  "Pure Nutrition": { initials: "PN", bgClass: "bg-indigo-600" },
  Herbloom: { initials: "H", bgClass: "bg-green-600" },
  FitLife: { initials: "F", bgClass: "bg-red-500" },
  BodyFuel: { initials: "B", bgClass: "bg-orange-500" },
  QuickBite: { initials: "Q", bgClass: "bg-orange-600" },
  HydraPure: { initials: "HP", bgClass: "bg-teal-500" },
  "Sleek Beauty": { initials: "SB", bgClass: "bg-slate-700" },
  Luxeology: { initials: "L", bgClass: "bg-violet-600" },
  NaturalMe: { initials: "NM", bgClass: "bg-lime-600" },
  BeautyBliss: { initials: "BB", bgClass: "bg-pink-500" },
  FreshBrew: { initials: "FB", bgClass: "bg-amber-600" },
  HealthFirst: { initials: "HF", bgClass: "bg-cyan-600" },
};
