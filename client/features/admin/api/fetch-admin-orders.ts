import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminOrdersListResponseDto,
  AdminOrdersQueryDto,
} from "../types";

export async function fetchAdminOrders(
  query?: AdminOrdersQueryDto,
): Promise<AdminOrdersListResponseDto> {
  const { data } = await api.get<AdminOrdersListResponseDto>(
    ENDPOINTS.ADMIN.ORDERS.LIST,
    { params: query },
  );
  return data;
}
