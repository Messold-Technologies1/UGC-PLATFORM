/** Display label for creator "Open to" content preferences (API values stay lowercase). */
export function formatContentPreferenceLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
