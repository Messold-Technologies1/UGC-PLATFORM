import { useQuery } from "@tanstack/react-query";
import { fetchPendingApprovals } from "../api/fetch-pending-approvals";
import { PendingApprovalsQueryDto } from "../types";

export const pendingApprovalsQueryKey = (query?: PendingApprovalsQueryDto) => [
  "admin",
  "pending-approvals",
  query,
];

export function usePendingApprovalsQuery(query?: PendingApprovalsQueryDto) {
  return useQuery({
    queryKey: pendingApprovalsQueryKey(query),
    queryFn: () => fetchPendingApprovals(query),
  });
}
