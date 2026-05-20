import type { Request } from 'express';
import { ACTIVE_BRAND_PROFILE_ID_HEADER } from './brand-access.constants';

export function readBrandProfileIdFromRequest(
  req: Request,
): string | undefined {
  const raw = req.headers[ACTIVE_BRAND_PROFILE_ID_HEADER];
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  if (Array.isArray(raw) && raw[0]?.trim()) {
    return raw[0].trim();
  }
  return undefined;
}
