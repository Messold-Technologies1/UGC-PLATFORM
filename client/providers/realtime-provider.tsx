"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { orderChatsBaseQueryKey } from "@/features/chats/hooks/use-order-chats-query";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "@/providers/auth-provider";
import { useNotification } from "@/providers/notification-provider";
import type {
  OrderPaymentEvent,
  OrderBriefAcceptedEvent,
  OrderBriefSubmittedEvent,
  OrderProductReceivedEvent,
  OrderProductShippedEvent,
  OrderRevisionRequestedEvent,
  OrderChatMessageEvent,
} from "@/lib/realtime-events";

type RealtimeCtx = { connected: boolean };
const Ctx = createContext<RealtimeCtx>({ connected: false });

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const queryClient = useQueryClient();
  const refreshAttemptedRef = useRef(false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const s = getSocket();

    const onConnect = () => {
      refreshAttemptedRef.current = false;
    };

    const onConnectError = async () => {
      if (refreshAttemptedRef.current) return;
      refreshAttemptedRef.current = true;
      try {
        await api.post(ENDPOINTS.AUTH.REFRESH);
        s.connect();
      } catch {
       
      }
    };

    const rolePath = user.primaryRole?.toLowerCase() || "";
    const orderNotificationLink = (orderId: string, suffix = "") => {
      if (!rolePath) return undefined;
      if (rolePath === "creator") return "/creator/orders";
      return `/${rolePath}/orders/${orderId}${suffix}`;
    };

    const onOrderPayment = (e: OrderPaymentEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });

      const isCreator = user.primaryRole === "CREATOR";
      if (isCreator && e.kind === "captured") {
        return;
      }

      const msg =
        e.kind === "captured"
          ? "Payment captured"
          : e.kind === "failed"
            ? "Payment failed"
            : e.kind === "refund_processed"
              ? "Refund processed"
              : "Refund failed";
      const variant =
        e.kind === "failed" || e.kind === "refund_failed" ? "error" : "success";
      toast[variant](msg, {
        description: `Order ${e.orderId.slice(0, 8)}…`,
      });
      addNotification({
        type: variant,
        title: msg,
        description: `Order ${e.orderId.slice(0, 8)}...`,
        link: orderNotificationLink(e.orderId),
      });
    };

    const onBriefSubmitted = (e: OrderBriefSubmittedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });

      if (user.primaryRole !== "CREATOR") return;

      const brandLabel = e.brandName?.trim() || "A brand";
      const packageLabel = e.packageName?.trim();
      const description = packageLabel
        ? `${brandLabel} · ${packageLabel}`
        : `${brandLabel} submitted a brief for you to review`;

      toast.success("New collaboration request", {
        description,
      });
      addNotification({
        type: "success",
        title: "New collaboration request",
        description,
        link: `/creator/orders/${e.orderId}/brief`,
      });
    };

    const onBriefAccepted = (e: OrderBriefAcceptedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });

      const creatorLabel = e.creatorName?.trim() || "Creator";
      const description = `${creatorLabel} accepted your brief`;

      toast.success("Brief accepted", {
        description,
      });
      addNotification({
        type: "success",
        title: "Brief accepted",
        description,
        link: orderNotificationLink(e.orderId),
      });
    };

    const onProductShipped = (e: OrderProductShippedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      toast.info("Product shipment recorded", {
        description: e.trackingId
          ? `${e.courierName} · ${e.trackingId}`
          : `Order ${e.orderId.slice(0, 8)}...`,
      });
      addNotification({
        type: "info",
        title: "Product shipment recorded",
        description: e.trackingId
          ? `${e.courierName} · ${e.trackingId}`
          : `Order ${e.orderId.slice(0, 8)}...`,
        link: orderNotificationLink(e.orderId),
      });
    };

    const onProductReceived = (e: OrderProductReceivedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      toast.success("Creator confirmed product receipt", {
        description: `Order ${e.orderId.slice(0, 8)}...`,
      });
      addNotification({
        type: "success",
        title: "Creator confirmed product receipt",
        description: `Order ${e.orderId.slice(0, 8)}...`,
        link: orderNotificationLink(e.orderId),
      });
    };

    const onRevisionRequested = (e: OrderRevisionRequestedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      const description =
        e.note?.trim() || `Order ${e.orderId.slice(0, 8)}...`;

      toast.info(`Revision ${e.revisionNumber} requested`, {
        description,
      });
      addNotification({
        type: "info",
        title: `Revision ${e.revisionNumber} requested`,
        description,
        link: orderNotificationLink(e.orderId),
      });
    };

    const onChatMessage = (e: OrderChatMessageEvent) => {
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      if (e.message.senderUserId === user.id) return;
      if (pathnameRef.current?.includes("/messages")) return;

      toast.info("New chat message", {
        description: `Order ${e.orderId.slice(0, 8)}...`,
      });
      addNotification({
        type: "info",
        title: "New chat message",
        description: `Order ${e.orderId.slice(0, 8)}...`,
        link: rolePath ? `/${rolePath}/messages?orderId=${e.orderId}` : undefined,
      });
    };

    s.on("connect", onConnect);
    s.on("connect_error", onConnectError);
    s.on("order.payment", onOrderPayment);
    s.on("order.brief_submitted", onBriefSubmitted);
    s.on("order.brief_accepted", onBriefAccepted);
    s.on("order.product_shipped", onProductShipped);
    s.on("order.product_received", onProductReceived);
    s.on("order.revision_requested", onRevisionRequested);
    s.on("chat.message", onChatMessage);

    s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("connect_error", onConnectError);
      s.off("order.payment", onOrderPayment);
      s.off("order.brief_submitted", onBriefSubmitted);
      s.off("order.brief_accepted", onBriefAccepted);
      s.off("order.product_shipped", onProductShipped);
      s.off("order.product_received", onProductReceived);
      s.off("order.revision_requested", onRevisionRequested);
      s.off("chat.message", onChatMessage);
      disconnectSocket();
    };
  }, [isAuthenticated, user, queryClient, addNotification]);

  return <Ctx.Provider value={{ connected: true }}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);
