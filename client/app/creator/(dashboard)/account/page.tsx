"use client";

import { DashboardAccountProfile } from "@/features/account/components/dashboard-account-profile.lazy";
import { DashboardPayoutDetails } from "@/features/account/components/dashboard-payout-details";

export default function CreatorAccountPage() {
  return (
    <div className="space-y-8">
      <DashboardAccountProfile profileEditHref="/creator/settings/profile" />
      <DashboardPayoutDetails />
    </div>
  );
}
