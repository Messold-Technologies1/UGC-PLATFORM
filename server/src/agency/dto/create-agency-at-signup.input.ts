/** Fields persisted when an agency registers via POST /auth/register?role=agency */
export type CreateAgencyAtSignupInput = {
  name: string;
  contactFullName: string;
  contactEmail: string;
  contactPhone?: string | null;
  contactPhoneVerified: boolean;
  website?: string | null;
};
