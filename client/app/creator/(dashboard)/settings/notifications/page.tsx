"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { Spinner } from "@/components/ui/spinner";
import { NotificationPreferencesCard } from "@/features/notification-preferences/components/notification-preferences-card";
import { useAuth } from "@/providers/auth-provider";

export default function CreatorSettingsNotificationsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-4 lg:pt-5">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 pt-4 lg:pt-5">
      <PageHeader
        title="Notifications"
        description="Choose how we reach you about your orders"
      />
      <NotificationPreferencesCard showHeading={false} />
    </div>
  );
}
