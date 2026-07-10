"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { identifyClarityUser, setClarityTag } from "@/lib/clarity";

/**
 * Associates the Clarity session with the signed-in user and tags it by role,
 * so recordings can be filtered (e.g. "creators stuck on Go Live" vs "brands
 * abandoning checkout"). Must render inside AuthProvider. Renders nothing.
 */
export function ClarityIdentify() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    identifyClarityUser(user.id, user.name ?? undefined);
    if (user.primaryRole) {
      setClarityTag("role", user.primaryRole);
    }
  }, [user]);

  return null;
}
