import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { CreatorProfileResponseDto } from "../types";

export interface RejectCreatorArgs {
  id: string;
  rejectionReason: string;
}

export async function rejectCreator({ id, rejectionReason }: RejectCreatorArgs): Promise<CreatorProfileResponseDto> {
  const { data } = await api.patch<CreatorProfileResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.REJECT(id),
    { rejectionReason }
  );
  return data;
}
