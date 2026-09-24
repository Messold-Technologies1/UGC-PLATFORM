import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Globe,
  ListTodo,
  OctagonAlert,
  SendHorizontal,
  Sparkles,
  Undo2,
  UserX,
} from "lucide-react";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";
import type {
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
  AdminCreatorSegmentCountsDto,
} from "@/features/admin/types";

export type AdminCreatorTabConfig = {
  value: AdminCreatorListSegment;
  label: string;
  description: string;
  icon: LucideIcon;
  countKey: keyof AdminCreatorSegmentCountsDto;
  badgeClassName: string;
};

const APPROVAL_FIRST_TABS: AdminCreatorTabConfig[] = [
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
    description:
      "Creators approved by admin, including those still completing their profile.",
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
  {
    value: "listed_complete",
    label: "Listed · complete",
    description:
      "Listed and nothing left to do — every go-live requirement met, intro video included.",
    icon: BadgeCheck,
    countKey: "listedComplete",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "listed_incomplete",
    label: "Listed · incomplete",
    description:
      "Live on the marketplace but still missing something — most often the intro video, which is only asked for after listing.",
    icon: OctagonAlert,
    countKey: "listedIncomplete",
    badgeClassName: "bg-rose-100 text-rose-700",
  },
  {
    value: "featured",
    label: "Featured",
    description: "Creators pinned to the top of browse results, ordered by rank.",
    icon: Sparkles,
    countKey: "featured",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
];

const PROFILE_FIRST_TABS: AdminCreatorTabConfig[] = [
  {
    value: "incomplete",
    label: "Building profile",
    description:
      "After registration. They move to Self complete once they finish their go-live checklist.",
    icon: ListTodo,
    countKey: "incomplete",
    badgeClassName: "bg-amber-100 text-amber-800",
  },
  {
    value: "self_completed",
    label: "Self complete",
    description:
      "Finished their profile on their own. Send the relevant ones to Awaiting review.",
    icon: SendHorizontal,
    countKey: "selfCompleted",
    badgeClassName: "bg-teal-100 text-teal-700",
  },
  {
    value: "withdrawn",
    label: "Withdrawn",
    description:
      "Pulled back from review to edit. They return to Self complete once they resubmit.",
    icon: Undo2,
    countKey: "withdrawn",
    badgeClassName: "bg-orange-100 text-orange-700",
  },
  {
    value: "pending",
    label: "Awaiting review",
    description:
      "Ready to list. Profiles sent from Self complete land here.",
    icon: Clock3,
    countKey: "pending",
    badgeClassName: "bg-sky-100 text-sky-700",
  },
  {
    value: "listed",
    label: "Listed",
    description: "Listed after review — live on the marketplace for brands.",    icon: Globe,
    countKey: "listed",
    badgeClassName: "bg-violet-100 text-violet-700",
  },
  {
    value: "listed_complete",
    label: "Listed · complete",
    description:
      "Listed and nothing left to do — every go-live requirement met, intro video included.",
    icon: BadgeCheck,
    countKey: "listedComplete",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "listed_incomplete",
    label: "Listed · incomplete",
    description:
      "Live on the marketplace but still missing something — most often the intro video, which is only asked for after listing.",
    icon: OctagonAlert,
    countKey: "listedIncomplete",
    badgeClassName: "bg-rose-100 text-rose-700",
  },
  {
    value: "non_approved",
    label: "Rejected",
    description:
      "Rejected profiles (complete or incomplete) that can be reviewed again.",
    icon: UserX,
    countKey: "nonApproved",
    badgeClassName: "bg-red-100 text-red-700",
  },
  {
    value: "featured",
    label: "Featured",
    description: "Creators pinned to the top of browse results, ordered by rank.",
    icon: Sparkles,
    countKey: "featured",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
];

export function getAdminCreatorTabs(): AdminCreatorTabConfig[] {
  return isProfileFirstOnboardingMode()
    ? PROFILE_FIRST_TABS
    : APPROVAL_FIRST_TABS;
}

/** @deprecated Use getAdminCreatorTabs() for mode-aware tab config. */
export const ADMIN_CREATOR_TABS = APPROVAL_FIRST_TABS;

export function isAdminCreatorListSegment(
  value: string | null | undefined,
): value is AdminCreatorListSegment {
  return getAdminCreatorTabs().some((tab) => tab.value === value);
}

export function getAdminCreatorSegmentCount(
  counts: AdminCreatorSegmentCountsDto | undefined,
  segment: AdminCreatorListSegment,
): number | undefined {
  if (!counts) return undefined;
  const tab = getAdminCreatorTabs().find((item) => item.value === segment);
  if (!tab) return undefined;
  return counts[tab.countKey];
}

export function getAdminCreatorEmptyMessage(
  segment: AdminCreatorListSegment,
  hasSearch: boolean,
): string {
  if (hasSearch) return "No creators match your search.";

  const profileFirst = isProfileFirstOnboardingMode();

  switch (segment) {
    case "self_completed":
      return "No self complete profiles waiting to be sent to Awaiting review.";
    case "withdrawn":
      return "No withdrawn profiles. Creators appear here after pulling a submitted profile back to edit.";
    case "pending":
      return profileFirst
        ? "No profiles in Awaiting review. List a creator from here after review."
        : "No pending applications at the moment.";
    case "listed":
      return profileFirst
        ? "No listed creators yet. List a profile from Awaiting review and it will appear here."
        : "No listed creators on the marketplace yet.";
    case "approved":
      return "No approved creators yet.";
    case "non_approved":
      return profileFirst
        ? "No rejected profile submissions at the moment."
        : "No rejected creators at the moment.";
    case "incomplete":
      return profileFirst
        ? "No creators are still building their profile."
        : "No approved creators with incomplete profiles at the moment.";
    case "listed_complete":
      return "No listed creators have a fully complete profile yet.";
    case "listed_incomplete":
      return "Every listed creator has a complete profile — nothing to chase.";
    case "featured":
      return "No featured creators yet. Feature a listed creator to pin them to the top of browse results.";
    default:
      return "No creators found.";
  }
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
