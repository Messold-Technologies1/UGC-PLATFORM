/** Name shown in the admin creator list for who shortlisted / sent / approved. */
export function adminActorDisplayName(user?: {
  name?: string | null;
  email?: string | null;
} | null): string | null {
  if (!user) return null;
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  return email || null;
}
