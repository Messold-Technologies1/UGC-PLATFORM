"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";
import { env } from "@/lib/env";
import { identifyClarityUser } from "@/lib/clarity";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";

/**
 * Initializes the Microsoft Clarity SDK once on the client. No-op when
 * NEXT_PUBLIC_CLARITY_PROJECT_ID is empty (the kill switch). Mounted in
 * `app/layout.tsx` alongside the other analytics loaders.
 */
export function ClarityInit() {
  useEffect(() => {
    if (!env.clarityProjectId) return;
    try {
      Clarity.init(env.clarityProjectId);
    } catch {
      // Ignore init failures (e.g. blocked by an ad blocker).
    }
  }, []);

  return null;
}

/**
 * Links Clarity sessions to the signed-in user via a stable, non-PII id.
 * Re-runs whenever the authenticated user changes (login, OAuth, reload).
 * No-op when Clarity is disabled or no user is present.
 */
export function ClarityUserSync() {
  const { data: user } = useMeQuery();

  useEffect(() => {
    if (!user?.id) return;
    identifyClarityUser(user.id, user.primaryRole);
  }, [user?.id, user?.primaryRole]);

  return null;
}
