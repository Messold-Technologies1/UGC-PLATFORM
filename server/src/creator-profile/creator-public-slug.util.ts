export function normalizeCreatorPublicProfileSlug(input: string): string {
  return decodeURIComponent(input).trim().toLowerCase().replace(/\s+/g, '');
}
