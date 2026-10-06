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
};
