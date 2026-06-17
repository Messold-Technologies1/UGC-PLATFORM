import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import {
  PendingApprovalsQueryDto,
  RejectedCreatorsListResponseDto,
} from "../types";

export async function fetchRejectedApprovals(
  query?: PendingApprovalsQueryDto,
): Promise<RejectedCreatorsListResponseDto> {
  const { data } = await api.get<RejectedCreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.REJECTED_APPROVALS,
    { params: query },
  );
  return data;
}
