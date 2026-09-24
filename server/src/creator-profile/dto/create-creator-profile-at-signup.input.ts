/** Fields persisted when an account becomes a creator at POST /auth/onboarding/role.
 * Profile details (DOB, gender, location, bio, categories, portfolio) are filled later via Edit Profile.
 */
export type CreateCreatorProfileAtSignupInput = {
  displayName: string;
  contactEmail: string;
  /** Meta attribution identifiers captured in the creator's browser at signup. */
  metaFbp?: string | null;
  metaFbc?: string | null;
  metaSignupIp?: string | null;
  metaSignupUserAgent?: string | null;
};
