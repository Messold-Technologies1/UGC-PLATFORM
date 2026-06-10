import { env } from "@/lib/env";

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** URL slug from display name: lowercase, no spaces (e.g. "Riya Sharma" → "riyasharma"). */
export function creatorPublicProfileSlug(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, "");
}

export function creatorPublicProfilePath(displayName: string): string {
  const slug = creatorPublicProfileSlug(displayName);
  if (!slug) return "/";
  return `/${encodeURIComponent(slug)}`;
}

export function creatorPublicProfileUrl(displayName: string): string {
  return `${normalizeSiteUrl(env.siteUrl)}${creatorPublicProfilePath(displayName)}`;
}

/** Host + path for read-only link fields (no protocol). */
export function creatorPublicProfileDisplayUrl(displayName: string): string {
  const url = new URL(creatorPublicProfileUrl(displayName));
  return `${url.host}${url.pathname}`;
}
