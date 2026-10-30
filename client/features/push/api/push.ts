import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PushConfig = {
  /** False when the server has no VAPID keys; do not prompt for permission. */
  configured: boolean;
  publicKey: string | null;
};

export async function fetchPushConfig(): Promise<PushConfig> {
  const { data } = await api.get<PushConfig>(ENDPOINTS.PUSH.VAPID_PUBLIC_KEY);
  return data;
}

export async function savePushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  await api.post(ENDPOINTS.PUSH.SUBSCRIPTIONS, {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: navigator.userAgent,
  });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await api.delete(ENDPOINTS.PUSH.SUBSCRIPTIONS, { data: { endpoint } });
}
