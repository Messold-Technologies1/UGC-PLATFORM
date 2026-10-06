/** Fields persisted when creating an agency profile for an account owner. */
export type CreateAgencyAtSignupInput = {
  name: string;
  contactFullName: string;
  contactEmail: string;
  contactPhone?: string | null;
  contactPhoneVerified: boolean;
  website?: string | null;
};
