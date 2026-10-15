import type { Prisma } from '@prisma/client';

export const brandAccessSelect = {
  id: true,
  userId: true,
  brandName: true,
  logoKey: true,
  logoUrl: true,
  website: true,
  contactFullName: true,
  contactEmail: true,
  contactPhone: true,
  brandPronunciationAudioKey: true,
  brandPronunciationAudioUrl: true,
  instagramUrl: true,
  productType: true,
  otherCategoryLabel: true,
  emailNotificationsEnabled: true,
  whatsappNotificationsEnabled: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { email: true } },
} as const;

export type BrandAccessProfile = Prisma.BrandProfileGetPayload<{
  select: typeof brandAccessSelect;
}>;

export type ResolvedAgencyContext = {
  id: string;
  ownerUserId: string;
};

export type ResolvedBrandContext = {
  brand: BrandAccessProfile | null;
  agency: ResolvedAgencyContext | null;
  brandProfileId: string | null;
  agencyId: string | null;
  actorUserId: string;
  /** User id used for order chat / realtime (standalone owner or agency owner). */
  brandActorUserId: string;
  isAgencyWorkspace: boolean;
  /**
   * Set when a partner-linked agency is acting INSIDE a brand's workspace.
   *
   * Distinct from `agencyId`, which means the agency is the owner (legacy
   * agency-direct mode). Here the brand owns everything and this only records
   * who acted — so it drives attribution columns and the blocked-action checks,
   * never ownership queries. `isAgencyWorkspace` stays false, because this IS
   * the brand's workspace.
   */
  actingAgencyId: string | null;
};
