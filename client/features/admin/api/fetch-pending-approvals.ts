import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import {
  PendingApprovalsQueryDto,
  PendingCreatorsListResponseDto,
} from "../types";

export async function fetchPendingApprovals(
  query?: PendingApprovalsQueryDto
): Promise<PendingCreatorsListResponseDto> {
  const { data } = await api.get<PendingCreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.PENDING_APPROVALS,
    { params: query }
  );
  return data;
}
