"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "@/providers/auth-provider";
import { useNotification } from "@/providers/notification-provider";
import type {
  OrderPaymentEvent,
  OrderBriefAcceptedEvent,
  OrderBriefSubmittedEvent,
  OrderProductReceivedEvent,
  OrderProductShippedEvent,
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

    const onOrderPayment = (e: OrderPaymentEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });
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
        link: rolePath ? `/${rolePath}/orders/${e.orderId}` : undefined,
      });
    };

    const onBriefSubmitted = (e: OrderBriefSubmittedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });
      toast.info("Brand submitted a brief", {
        description: `Order ${e.orderId.slice(0, 8)}…`,
      });
      addNotification({
        type: "info",
        title: "Brand submitted a brief",
        description: `Order ${e.orderId.slice(0, 8)}...`,
        link: rolePath ? `/${rolePath}/orders/${e.orderId}/brief` : undefined,
      });
    };

    const onBriefAccepted = (e: OrderBriefAcceptedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });
      toast.success("Creator accepted the brief", {
        description: `Order ${e.orderId.slice(0, 8)}...`,
      });
      addNotification({
        type: "success",
        title: "Creator accepted the brief",
        description: `Order ${e.orderId.slice(0, 8)}...`,
        link: rolePath ? `/${rolePath}/orders/${e.orderId}/brief` : undefined,
      });
    };

    const onProductShipped = (e: OrderProductShippedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
        link: rolePath ? `/${rolePath}/orders/${e.orderId}` : undefined,
      });
    };

    const onProductReceived = (e: OrderProductReceivedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Creator confirmed product receipt", {
        description: `Order ${e.orderId.slice(0, 8)}...`,
      });
      addNotification({
        type: "success",
        title: "Creator confirmed product receipt",
        description: `Order ${e.orderId.slice(0, 8)}...`,
        link: rolePath ? `/${rolePath}/orders/${e.orderId}` : undefined,
      });
    };

    const onChatMessage = (e: OrderChatMessageEvent) => {
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
      s.off("chat.message", onChatMessage);
      disconnectSocket();
    };
  }, [isAuthenticated, user, queryClient, addNotification]);

  return <Ctx.Provider value={{ connected: true }}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);
