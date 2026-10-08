import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type NotificationProfileType = "creator" | "brand" | "agency";

export type NotificationPreferences = {
  profileType: NotificationProfileType;
  emailNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
};

/** Both optional: one toggle is saved on its own, never as a pair. */
export type UpdateNotificationPreferencesPayload = {
  emailNotificationsEnabled?: boolean;
  whatsappNotificationsEnabled?: boolean;
};

export const notificationPreferencesQueryKey = [
  "notification-preferences",
  "me",
] as const;

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await api.get<NotificationPreferences>(
    ENDPOINTS.NOTIFICATION_PREFERENCES.ME,
  );
  return data;
}

export async function updateNotificationPreferences(
  payload: UpdateNotificationPreferencesPayload,
): Promise<NotificationPreferences> {
  const { data } = await api.patch<NotificationPreferences>(
    ENDPOINTS.NOTIFICATION_PREFERENCES.ME,
    payload,
  );
  return data;
}
