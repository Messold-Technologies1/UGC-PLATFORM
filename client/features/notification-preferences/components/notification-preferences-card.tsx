"use client";

import { Mail, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferences,
} from "../hooks/use-notification-preferences";

/**
 * Email and WhatsApp opt-ins, shared by the creator, brand and agency settings
 * screens. The columns behind it are identical on all three and the send gates
 * read them the same way, so there is one card rather than three.
 */
export function NotificationPreferencesCard({
  enabled = true,
  showHeading = true,
}: {
  /** False while the caller still has no workspace profile to read. */
  enabled?: boolean;
  /** False on a page whose own title already says "Notifications". */
  showHeading?: boolean;
}) {
  const { data, isLoading, isError } = useNotificationPreferencesQuery({
    enabled,
  });
  const mutation = useUpdateNotificationPreferences();

  const channels = [
    {
      key: "emailNotificationsEnabled" as const,
      icon: Mail,
      title: "Email",
      description: "Order updates, delivery reminders and account notices.",
    },
    {
      key: "whatsappNotificationsEnabled" as const,
      icon: MessageCircle,
      title: "WhatsApp",
      description: "The same updates on WhatsApp, to the number on file.",
    },
  ];

  return (
    <Card className="p-5">
      {showHeading ? (
        <div>
          <h2 className="text-sm font-medium">Notifications</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose how we reach you. Password resets are always sent.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Password resets are always sent.
        </p>
      )}

      {isError ? (
        <p className="mt-5 text-sm text-muted-foreground">
          We could not load your notification preferences. Try again shortly.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {channels.map(({ key, icon: Icon, title, description }) => (
            <div key={key} className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="size-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <label htmlFor={`notif-${key}`} className="text-sm font-medium">
                  {title}
                </label>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>

              {isLoading || !data ? (
                <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
              ) : (
                <Switch
                  id={`notif-${key}`}
                  checked={data[key]}
                  // Disabled only while a save is in flight, so a double-tap
                  // cannot queue two writes that land out of order.
                  disabled={mutation.isPending}
                  onCheckedChange={(checked) =>
                    mutation.mutate({ [key]: checked })
                  }
                  aria-label={`${title} notifications`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
