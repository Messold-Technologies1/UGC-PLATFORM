import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { CreatorsListResponseDto, PendingApprovalsQueryDto } from "../types";

export async function fetchPendingApprovals(
  query?: PendingApprovalsQueryDto
): Promise<CreatorsListResponseDto> {
  const { data } = await api.get<CreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.PENDING_APPROVALS,
    { params: query }
  );
  return data;
}
