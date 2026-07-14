import { CreatorGender } from '@prisma/client';

/** Fields persisted when a creator registers via POST /auth/register?role=creator */
export type CreateCreatorProfileAtSignupInput = {
  displayName: string;
  contactEmail: string;
  /** ISO date string (YYYY-MM-DD), derived from signup age */
  dateOfBirth: string;
  gender: CreatorGender;
  city: string;
  stateName: string;
  countryName: string;
  bio?: string | null;
  instagramUrl?: string | null;
  categorySlugs: string[];
  /** Meta attribution identifiers captured in the creator's browser at signup. */
  metaFbp?: string | null;
  metaFbc?: string | null;
  metaSignupIp?: string | null;
  metaSignupUserAgent?: string | null;
};
