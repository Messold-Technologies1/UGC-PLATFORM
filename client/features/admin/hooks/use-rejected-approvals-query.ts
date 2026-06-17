import { useQuery } from "@tanstack/react-query";
import { fetchRejectedApprovals } from "../api/fetch-rejected-approvals";
import { PendingApprovalsQueryDto } from "../types";

export const rejectedApprovalsQueryKey = (query?: PendingApprovalsQueryDto) => [
  "admin",
  "rejected-approvals",
  query,
];

export function useRejectedApprovalsQuery(query?: PendingApprovalsQueryDto) {
  return useQuery({
    queryKey: rejectedApprovalsQueryKey(query),
    queryFn: () => fetchRejectedApprovals(query),
    staleTime: 60_000,
  });
}
