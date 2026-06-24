import type { Prisma } from '@prisma/client';

export const brandAccessSelect = {
  id: true,
  userId: true,
  agencyId: true,
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
  agency: { select: { id: true, ownerUserId: true } },
  user: { select: { email: true } },
} as const;

export type BrandAccessProfile = Prisma.BrandProfileGetPayload<{
  select: typeof brandAccessSelect;
}>;

export type ResolvedBrandContext = {
  brand: BrandAccessProfile;
  brandProfileId: string;
  actorUserId: string;
  /** User id used for order chat / realtime (standalone owner or agency owner). */
  brandActorUserId: string;
  isAgencyManaged: boolean;
};
