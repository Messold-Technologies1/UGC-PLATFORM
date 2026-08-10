/** Safe label when BrandProfile.brandName is null/empty. */
export function brandDisplayName(
  name?: string | null,
  fallback = "Brand",
): string {
  const trimmed = name?.trim();
  return trimmed || fallback;
}

/** Initials for avatars when brandName may be missing. */
export function brandInitials(
  name?: string | null,
  fallback = "Brand",
): string {
  const label = brandDisplayName(name, fallback);
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "B";
}
