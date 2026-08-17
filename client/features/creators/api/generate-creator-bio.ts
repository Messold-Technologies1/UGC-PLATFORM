import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/**
 * Signals sent to the AI bio generator. All optional; the creator's name is
 * deliberately never sent (the bio is first-person and must not include it).
 * Values are human-readable labels, not slugs.
 */
export type GenerateCreatorBioPayload = {
  niches?: string[];
  creatorTypes?: string[];
  occupations?: string[];
  languages?: string[];
  gender?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
};

export type GeneratedBioResponse = {
  bio: string;
};

export async function generateCreatorBio(
  payload: GenerateCreatorBioPayload,
): Promise<GeneratedBioResponse> {
  const { data } = await api.post<GeneratedBioResponse>(
    ENDPOINTS.CREATORS.GENERATE_BIO,
    payload,
  );
  return data;
}
