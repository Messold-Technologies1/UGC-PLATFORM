/** Collapse brand names that match after trim + case-insensitive compare. */
export function uniqueBrandNames(
  names: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of names) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

/** Prefer the existing stored spelling when the typed name matches one. */
export function resolveExistingBrandName(
  input: string,
  names: string[],
): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const match = names.find((name) => name.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}
