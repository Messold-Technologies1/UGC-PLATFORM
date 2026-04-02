"use client";

import dynamic from "next/dynamic";
import { AccountProfileLoadingShell } from "@/components/dashboard/route-loading-shells";

export type { DashboardAccountProfileProps } from "./dashboard-account-profile";

export const DashboardAccountProfile = dynamic(
  () =>
    import("./dashboard-account-profile").then((module) => ({
      default: module.DashboardAccountProfile,
    })),
  {
    loading: () => <AccountProfileLoadingShell />,
  },
);
