import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminOrderDetailsResponseDto } from "../types";

export async function fetchAdminOrderDetails(
  orderId: string,
): Promise<AdminOrderDetailsResponseDto> {
  const { data } = await api.get<AdminOrderDetailsResponseDto>(
    ENDPOINTS.ADMIN.ORDERS.DETAIL(orderId),
  );
  return data;
}
