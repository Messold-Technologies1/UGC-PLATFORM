import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CreatorUnavailabilityResponse = {
  id: string;
  startsOn: string;
  endsOn: string;
  isCurrentlyUnavailable: boolean;
};

export type UpsertCreatorUnavailabilityPayload = {
  startsOn: string;
  endsOn: string;
};

export async function fetchMyUnavailability(): Promise<CreatorUnavailabilityResponse | null> {
  const { data } = await api.get<CreatorUnavailabilityResponse | null>(
    ENDPOINTS.CREATORS.PROFILE_UNAVAILABILITY,
  );
  return data ?? null;
}

export async function upsertMyUnavailability(
  payload: UpsertCreatorUnavailabilityPayload,
): Promise<CreatorUnavailabilityResponse> {
  const { data } = await api.put<CreatorUnavailabilityResponse>(
    ENDPOINTS.CREATORS.PROFILE_UNAVAILABILITY,
    payload,
  );
  return data;
}

export async function clearMyUnavailability(): Promise<void> {
  await api.delete(ENDPOINTS.CREATORS.PROFILE_UNAVAILABILITY);
}
