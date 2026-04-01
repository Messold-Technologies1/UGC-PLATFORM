"use client";

import dynamic from "next/dynamic";
import { AccountProfileLoadingShell } from "@/components/dashboard/route-loading-shells";

export const DashboardBrandAccountProfile = dynamic(
  () =>
    import("./dashboard-brand-account-profile").then((module) => ({
      default: module.DashboardBrandAccountProfile,
    })),
  {
    loading: () => <AccountProfileLoadingShell />,
  },
);
