import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  FirstOrderFreeCreatorsListResponseDto,
  FirstOrderFreeCreatorsQuery,
} from "../types";

export async function fetchFirstOrderFreeCreators(
  query: FirstOrderFreeCreatorsQuery,
): Promise<FirstOrderFreeCreatorsListResponseDto> {
  const { data } = await api.get<FirstOrderFreeCreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.FIRST_ORDER_FREE_LIST,
    { params: query },
  );
  return data;
}
