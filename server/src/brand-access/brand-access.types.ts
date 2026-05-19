import type { BrandProfile } from '@prisma/client';

export type ResolvedBrandContext = {
  brand: BrandProfile & {
    agency: { id: string; ownerUserId: string } | null;
    user: { email: string } | null;
  };
  brandProfileId: string;
  actorUserId: string;
  /** User id used for order chat / realtime (standalone owner or agency owner). */
  brandActorUserId: string;
  isAgencyManaged: boolean;
};
