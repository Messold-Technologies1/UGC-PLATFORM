"use client";

export function getDisplayNameFromUser(user: {
  name: string | null;
  email: string;
}) {
  return user.name?.trim() || user.email.split("@")[0] || "Account";
}

export function getInitials(value: string) {
  const base = value.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase().slice(0, 2);
  }
  return base.slice(0, 2).toUpperCase();
}

export function getInitialsFromUser(user: {
  name: string | null;
  email: string;
}) {
  return getInitials(getDisplayNameFromUser(user));
}
