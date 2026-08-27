"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
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
  OrderContentDeliveredEvent,
  OrderDisputeOpenedEvent,
  OrderDisputeResolvedEvent,
  OrderChatMessageEvent,
  DeliveryWatermarkReadyEvent,
} from "@/lib/realtime-events";
import { portfolioVideosBaseQueryKey } from "@/features/creator-portfolio/lib/asset-state";
import { instagramReelsBaseQueryKey } from "@/features/instagram-import/api/instagram-media";
import { brandOrderDeliveriesQueryKey } from "@/features/orders/api/get-brand-order-deliveries";
import { brandOrderDetailsQueryKey } from "@/features/orders/api/get-brand-order-details";
import { creatorOrderDetailsQueryKey } from "@/features/orders/api/get-creator-order-details";
import { getCreatorOrdersPageHref } from "@/features/orders/components/creator-order-detail/creator-orders-tabs";

function refetchOrderViews(queryClient: QueryClient, orderId: string) {
  // Force an immediate refetch of whichever order detail page is open
  // (brand or creator). Invalidate alone can leave an active query stale.
  void queryClient.refetchQueries({
    queryKey: brandOrderDetailsQueryKey(orderId),
    exact: true,
  });
  void queryClient.refetchQueries({
    queryKey: creatorOrderDetailsQueryKey(orderId),
    exact: true,
  });
  void queryClient.refetchQueries({
    queryKey: brandOrderDeliveriesQueryKey(orderId),
    exact: true,
  });
  void queryClient.invalidateQueries({ queryKey: ["orders"] });
  void queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
}

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
      // Socket.io does not replay events missed while disconnected, so a
      // portfolio mirror that finished during a drop would leave the grid
      // showing "Processing" forever. Reconciling once per (re)connect closes
      // that window without going back to a timer. On the first connect this
      // is a no-op against an empty cache.
      void queryClient.invalidateQueries({
        queryKey: portfolioVideosBaseQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: instagramReelsBaseQueryKey,
      });
    };

    const onConnectError = async () => {
      if (refreshAttemptedRef.current) return;
      refreshAttemptedRef.current = true;
      try {
        await api.post(ENDPOINTS.AUTH.REFRESH);
        s.connect();
      } catch {}
    };

    const rolePath = user.primaryRole?.toLowerCase() || "";
    const orderNotificationLink = (
      orderId: string,
      status?: string,
      suffix = "",
    ) => {
      if (!rolePath) return undefined;
      if (rolePath === "creator") {
        if (suffix) return `/creator/orders/${orderId}${suffix}`;
        return getCreatorOrdersPageHref(orderId, status);
      }
      return `/${rolePath}/orders/${orderId}${suffix}`;
    };

    const onOrderPayment = (e: OrderPaymentEvent) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      queryClient.invalidateQueries({
        queryKey: ["orders", "brief", e.orderId],
      });

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
      queryClient.invalidateQueries({
        queryKey: ["orders", "brief", e.orderId],
      });

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
      queryClient.invalidateQueries({
        queryKey: ["orders", "brief", e.orderId],
      });

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
      const description = e.note?.trim() || `Order ${e.orderId.slice(0, 8)}...`;

      toast.info(`Revision ${e.revisionNumber} requested`, {
        description,
      });
      addNotification({
        type: "info",
        title: `Revision ${e.revisionNumber} requested`,
        description,
        link: orderNotificationLink(e.orderId, "REVISION_REQUESTED"),
      });
    };

    const onContentDelivered = (e: OrderContentDeliveredEvent) => {
      // Always refresh order data for whoever is viewing — brand or creator.
      refetchOrderViews(queryClient, e.orderId);

      if (user.primaryRole === "BRAND") {
        const isRevision = e.status === "REVISION_SUBMITTED";
        const title = isRevision
          ? `Revision ${e.revisionNumber} submitted`
          : "Content delivered";

        toast.success(title, {
          description: `Order ${e.orderId.slice(0, 8)}...`,
        });

        addNotification({
          type: "success",
          title,
          description: `Order ${e.orderId.slice(0, 8)}...`,
          link: orderNotificationLink(e.orderId),
        });
      }
    };

    const onDisputeOpened = (e: OrderDisputeOpenedEvent) => {
      refetchOrderViews(queryClient, e.orderId);

      const openedByUs =
        (e.openedBy === "BRAND" && user.primaryRole === "BRAND") ||
        (e.openedBy === "CREATOR" && user.primaryRole === "CREATOR");
      if (openedByUs) return;

      const title = "Order disputed";
      const description =
        e.openedBy === "BRAND"
          ? "The brand raised a dispute on this order."
          : "The creator raised a dispute on this order.";
      toast.info(title, { description });
      addNotification({
        type: "info",
        title,
        description,
        link: orderNotificationLink(e.orderId, "DISPUTED"),
      });
    };

    const onDisputeResolved = (e: OrderDisputeResolvedEvent) => {
      refetchOrderViews(queryClient, e.orderId);

      const title =
        e.outcome === "REJECTED"
          ? "Dispute resolved — order rejected"
          : e.outcome === "WITHDRAWN"
            ? "Dispute withdrawn"
            : "Dispute resolved";
      const description =
        e.outcome === "REJECTED"
          ? `Order ${e.orderId.slice(0, 8)}… has been rejected.`
          : e.restoredStatus
            ? `Order returned to ${String(e.restoredStatus).replace(/_/g, " ").toLowerCase()}.`
            : `Order ${e.orderId.slice(0, 8)}…`;

      toast.success(title, { description });
      addNotification({
        type: "success",
        title,
        description,
        link: orderNotificationLink(e.orderId, e.restoredStatus ?? undefined),
      });
    };

    const onWatermarkReady = (e: DeliveryWatermarkReadyEvent) => {
      refetchOrderViews(queryClient, e.orderId);
    };

    // An imported reel finished copying into our storage (or failed to). Both
    // portfolio video queries share this key prefix, so this refreshes whichever
    // view is mounted — the creator's own grid or an admin's view of theirs.
    const onPortfolioAsset = () => {
      void queryClient.invalidateQueries({
        queryKey: portfolioVideosBaseQueryKey,
      });
    };

    // A reel-cache batch settled. One invalidate covers the gallery pages and
    // the status read, for both the creator's own view and an admin's.
    const onReelSync = () => {
      void queryClient.invalidateQueries({
        queryKey: instagramReelsBaseQueryKey,
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
        link: rolePath
          ? `/${rolePath}/messages?orderId=${e.orderId}`
          : undefined,
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
    s.on("order.content_delivered", onContentDelivered);
    s.on("order.dispute_opened", onDisputeOpened);
    s.on("order.dispute_resolved", onDisputeResolved);
    s.on("delivery.watermark_ready", onWatermarkReady);
    s.on("portfolio.video_asset_updated", onPortfolioAsset);
    s.on("instagram.reel_sync_updated", onReelSync);
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
      s.off("order.content_delivered", onContentDelivered);
      s.off("order.dispute_opened", onDisputeOpened);
      s.off("order.dispute_resolved", onDisputeResolved);
      s.off("delivery.watermark_ready", onWatermarkReady);
      s.off("portfolio.video_asset_updated", onPortfolioAsset);
      s.off("instagram.reel_sync_updated", onReelSync);
      s.off("chat.message", onChatMessage);
      disconnectSocket();
    };
    // Bind the socket lifecycle to the *identity* of the session, not the
    // `user` object reference. Re-running this effect tears the socket down
    // (disconnectSocket removes all listeners), which would silently break
    // long-lived chat subscriptions such as the dispute group chat. queryClient
    // and addNotification are stable, so keying on user id keeps the socket
    // connected for the whole session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return <Ctx.Provider value={{ connected: true }}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);
