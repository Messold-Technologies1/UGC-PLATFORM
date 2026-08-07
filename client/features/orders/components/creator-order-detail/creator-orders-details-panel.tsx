"use client";

import { useState, useEffect } from "react";
import { useGetCreatorOrderDetailsQuery } from "../../hooks/use-get-creator-order-details-query";
import { useGetOrderBriefQuery } from "../../hooks/use-get-order-brief-query";
import { CreatorOrderNewRequestPanel } from "./creator-orders-new-request-panel";
import { CreatorOrderActivePanel } from "./creator-orders-active-panel";
import { CreatorOrderRevisionPanel } from "./creator-orders-revision-panel";
import { CreatorOrderDeliveredPanel } from "./creator-orders-delivered-panel";
import { CreatorOrderCompletedPanel } from "./creator-orders-completed-panel";
import { CreatorOrderCancelledPanel } from "./creator-orders-cancelled-panel";
import { CreatorOrderDisputePanel } from "./creator-orders-dispute-panel";

interface CreatorOrdersDetailsPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  onClose: () => void;
  onTabChange: (tabId: string, selectOrderId?: string) => void;
  activeTab: string;
}

export function CreatorOrdersDetailsPanel({
  selectedOrderId,
  selectedItem,
  onClose,
  onTabChange,
  activeTab,
}: CreatorOrdersDetailsPanelProps) {
  const { data: detailsData, isLoading: isLoadingDetails } =
    useGetCreatorOrderDetailsQuery(selectedOrderId, {
      enabled: Boolean(selectedOrderId),
    });

  const { data: briefData, isLoading: isLoadingBrief } = useGetOrderBriefQuery(
    selectedOrderId,
    { enabled: Boolean(selectedOrderId) },
  );

  const [previewStepId, setPreviewStepId] = useState<string | null>(null);

  useEffect(() => {
    setPreviewStepId(null);
  }, [selectedOrderId, activeTab]);

  const isLoadingRightPanel = isLoadingDetails || isLoadingBrief;

  if (!selectedItem) return null;

  const orderStatus = selectedItem?.order?.status as string;
  const NEW_REQUEST_STATUSES = [
    "BRIEF_SUBMISSION_PENDING",
    "BRIEF_SUBMITTED",
  ];

  if (
    activeTab === "new" ||
    (activeTab === "all" && NEW_REQUEST_STATUSES.includes(orderStatus))
  ) {
    return (
      <CreatorOrderNewRequestPanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        onAccepted={() => onTabChange("active", selectedOrderId)}
      />
    );
  }

  let effectiveStatus = orderStatus;
  if (previewStepId) {
    switch (previewStepId) {
      case "accepted":
      case "awaiting_shipment":
      case "product_received":
      case "in_progress":
        effectiveStatus = "PRODUCT_RECEIVED";
        break;
      case "revision_requested":
        effectiveStatus = "REVISION_REQUESTED";
        break;
      case "delivered":
        effectiveStatus = "DELIVERED";
        break;
      case "completed":
        effectiveStatus = "ACCEPTED";
        break;
      case "cancelled":
        effectiveStatus = "REJECTED";
        break;
    }
  }

  const REVISION_STATUSES = ["REVISION_REQUESTED"];
  const DELIVERED_STATUSES = ["DELIVERED", "REVISION_SUBMITTED"];
  const COMPLETED_STATUSES = ["ACCEPTED", "CREATOR_PAYMENT_DONE"];
  const CANCELLED_STATUSES = ["REJECTED", "REFUNDED"];
  const isOrderCompleted = COMPLETED_STATUSES.includes(orderStatus);

  if (activeTab === "dispute" || effectiveStatus === "DISPUTED") {
    return (
      <CreatorOrderDisputePanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        previewStepId={previewStepId}
        onStepClick={setPreviewStepId}
      />
    );
  }

  if (
    activeTab === "revisions" ||
    REVISION_STATUSES.includes(effectiveStatus)
  ) {
    return (
      <CreatorOrderRevisionPanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        previewStepId={previewStepId}
        onStepClick={setPreviewStepId}
        isOrderCompleted={isOrderCompleted}
      />
    );
  }

  if (
    activeTab === "delivered" ||
    DELIVERED_STATUSES.includes(effectiveStatus)
  ) {
    return (
      <CreatorOrderDeliveredPanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        previewStepId={previewStepId}
        onStepClick={setPreviewStepId}
        isOrderCompleted={isOrderCompleted}
      />
    );
  }

  if (
    activeTab === "completed" ||
    COMPLETED_STATUSES.includes(effectiveStatus)
  ) {
    return (
      <CreatorOrderCompletedPanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        previewStepId={previewStepId}
        onStepClick={setPreviewStepId}
      />
    );
  }

  if (
    activeTab === "cancelled" ||
    CANCELLED_STATUSES.includes(effectiveStatus)
  ) {
    return (
      <CreatorOrderCancelledPanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        previewStepId={previewStepId}
        onStepClick={setPreviewStepId}
      />
    );
  }

  return (
    <CreatorOrderActivePanel
      selectedOrderId={selectedOrderId}
      selectedItem={selectedItem}
      detailsData={detailsData}
      briefData={briefData}
      isLoading={isLoadingRightPanel}
      onClose={onClose}
      previewStepId={previewStepId}
      onStepClick={setPreviewStepId}
      isOrderCompleted={isOrderCompleted}
    />
  );
}
