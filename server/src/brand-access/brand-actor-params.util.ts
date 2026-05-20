import type { Request } from 'express';
import { readBrandProfileIdFromRequest } from './brand-context.util';

export function brandActorParams(req: Request & { user: { id: string } }): {
  actorUserId: string;
  brandProfileId?: string;
} {
  return {
    actorUserId: req.user.id,
    brandProfileId: readBrandProfileIdFromRequest(req),
  };
}
