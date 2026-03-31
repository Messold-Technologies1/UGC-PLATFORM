"use client";

import { DashboardAccountProfile } from "@/features/account/components/dashboard-account-profile";

export default function CreatorAccountPage() {
  return (
    <DashboardAccountProfile profileEditHref="/creator/settings/profile" />
  );
}
