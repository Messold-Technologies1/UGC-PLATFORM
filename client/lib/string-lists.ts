export function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function splitCommaSeparatedList(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function appendUniqueCommaSeparatedItem(
  current: string,
  item: string,
): string {
  const trimmed = item.trim();
  if (!trimmed) return current;
  const parts = splitCommaSeparatedList(current);
  if (parts.some((part) => part.toLowerCase() === trimmed.toLowerCase())) {
    return current;
  }
  return parts.length ? `${parts.join(", ")}, ${trimmed}` : trimmed;
}

export function toggleCommaSeparatedItem(
  current: string,
  item: string,
): string {
  const trimmed = item.trim();
  if (!trimmed) return current;

  const parts = splitCommaSeparatedList(current);
  const filtered = parts.filter(
    (part) => part.toLowerCase() !== trimmed.toLowerCase(),
  );

  if (filtered.length !== parts.length) {
    return filtered.join(", ");
  }

  return parts.length ? `${parts.join(", ")}, ${trimmed}` : trimmed;
}

export function splitMultilineList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}
