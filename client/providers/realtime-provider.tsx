"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "@/providers/auth-provider";
import type {
  OrderPaymentEvent,
  OrderBriefSubmittedEvent,
} from "@/lib/realtime-events";

type RealtimeCtx = { connected: boolean };
const Ctx = createContext<RealtimeCtx>({ connected: false });

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const refreshAttemptedRef = useRef(false);

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
    };

    const onBriefSubmitted = (e: OrderBriefSubmittedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "brief", e.orderId] });
      toast.info("Brand submitted a brief", {
        description: `Order ${e.orderId.slice(0, 8)}…`,
      });
    };

    s.on("connect", onConnect);
    s.on("connect_error", onConnectError);
    s.on("order.payment", onOrderPayment);
    s.on("order.brief_submitted", onBriefSubmitted);

    s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("connect_error", onConnectError);
      s.off("order.payment", onOrderPayment);
      s.off("order.brief_submitted", onBriefSubmitted);
      disconnectSocket();
    };
  }, [isAuthenticated, user, queryClient]);

  return <Ctx.Provider value={{ connected: true }}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);