import { env } from "@/lib/env";

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** Normalize a public profile slug from a URL segment (preserves `-suffix`). */
export function normalizePublicProfileSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).trim().toLowerCase().replace(/\s+/g, "");
  } catch {
    return slug.trim().toLowerCase().replace(/\s+/g, "");
  }
}

export type CreatorPublicProfileLinkInput = {
  publicSlug?: string | null;
  displayName: string;
};

/**
 * Resolve the opaque public slug. Only the API-provided `publicSlug` is used —
 * we never derive a URL from the display name, which would leak the creator's
 * real identity.
 */
export function resolveCreatorPublicProfileSlug(
  profile: CreatorPublicProfileLinkInput,
): string | null {
  const fromApi = profile.publicSlug?.trim();
  if (fromApi) {
    const normalized = normalizePublicProfileSlug(fromApi);
    if (normalized && normalized !== "undefined") {
      return normalized;
    }
  }

  return null;
}

export function creatorPublicProfilePath(publicSlug: string): string {
  const slug = normalizePublicProfileSlug(publicSlug);
  if (!slug || slug === "undefined") return "/";
  return `/${encodeURIComponent(slug)}`;
}

export function creatorPublicProfilePathForProfile(
  profile: CreatorPublicProfileLinkInput,
): string | null {
  const slug = resolveCreatorPublicProfileSlug(profile);
  if (!slug) return null;
  return creatorPublicProfilePath(slug);
}

export function creatorPublicProfileUrl(publicSlug: string): string {
  return `${normalizeSiteUrl(env.siteUrl)}${creatorPublicProfilePath(publicSlug)}`;
}

export function creatorPublicProfileUrlForProfile(
  profile: CreatorPublicProfileLinkInput,
): string | null {
  const slug = resolveCreatorPublicProfileSlug(profile);
  if (!slug) return null;
  return creatorPublicProfileUrl(slug);
}

/** Host + path for read-only link fields (no protocol). */
export function creatorPublicProfileDisplayUrl(publicSlug: string): string {
  const url = new URL(creatorPublicProfileUrl(publicSlug));
  return `${url.host}${url.pathname}`;
}

export function creatorPublicProfileDisplayUrlForProfile(
  profile: CreatorPublicProfileLinkInput,
): string | null {
  const url = creatorPublicProfileUrlForProfile(profile);
  if (!url) return null;
  const parsed = new URL(url);
  return `${parsed.host}${parsed.pathname}`;
}
