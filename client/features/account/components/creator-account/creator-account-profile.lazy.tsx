"use client";

import dynamic from "next/dynamic";
import { AccountProfileLoadingShell } from "@/components/dashboard/route-loading-shells";

export const CreatorAccountProfile = dynamic(
  () =>
    import("./creator-account-profile").then((module) => ({
      default: module.CreatorAccountProfile,
    })),
  {
    loading: () => <AccountProfileLoadingShell />,
  },
);
