import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock3,
  Globe,
  ListTodo,
  UserX,
} from "lucide-react";
import type {
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
  AdminCreatorSegmentCountsDto,
} from "@/features/admin/types";

export const ADMIN_CREATOR_TABS: {
  value: AdminCreatorListSegment;
  label: string;
  description: string;
  icon: LucideIcon;
  countKey: keyof AdminCreatorSegmentCountsDto;
  badgeClassName: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    description: "New applications waiting for your review.",
    icon: Clock3,
    countKey: "pending",
    badgeClassName: "bg-sky-100 text-sky-700",
  },
  {
    value: "approved",
    label: "Approved",
    description: "Creators approved by admin, including those still completing their profile.",
    icon: CheckCircle2,
    countKey: "approved",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "non_approved",
    label: "Rejected",
    description: "Rejected applications that can be reviewed or reinstated.",
    icon: UserX,
    countKey: "nonApproved",
    badgeClassName: "bg-red-100 text-red-700",
  },
  {
    value: "incomplete",
    label: "Incomplete profile",
    description: "Approved creators who have not finished their go-live checklist.",
    icon: ListTodo,
    countKey: "incomplete",
    badgeClassName: "bg-amber-100 text-amber-800",
  },
  {
    value: "listed",
    label: "Listed",
    description: "Live on the marketplace — visible to brands.",
    icon: Globe,
    countKey: "listed",
    badgeClassName: "bg-violet-100 text-violet-700",
  },
];

export function isAdminCreatorListSegment(
  value: string | null | undefined,
): value is AdminCreatorListSegment {
  return ADMIN_CREATOR_TABS.some((tab) => tab.value === value);
}

export function getAdminCreatorSegmentCount(
  counts: AdminCreatorSegmentCountsDto | undefined,
  segment: AdminCreatorListSegment,
): number | undefined {
  if (!counts) return undefined;
  const tab = ADMIN_CREATOR_TABS.find((item) => item.value === segment);
  if (!tab) return undefined;
  return counts[tab.countKey];
}

export function formatCreatorLocation(
  creator: Pick<AdminCreatorListItemDto, "city" | "stateName" | "countryName">,
): string {
  const parts = [creator.city, creator.stateName, creator.countryName].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function formatInrPrice(amount: string | null | undefined): string {
  const value = Number.parseFloat(amount ?? "0");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
