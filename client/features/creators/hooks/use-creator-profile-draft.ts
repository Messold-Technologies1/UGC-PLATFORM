"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Client-only draft for the creator profile editor's free-text fields.
 *
 * Before a creator goes live we keep unsaved progress in localStorage (no DB
 * writes / API spam). On the next visit on the same browser we restore it,
 * unless the server copy is newer (edited elsewhere). Selection-based fields
 * (location, facets, packages) and portfolio videos are not drafted — videos
 * already persist server-side and selections are quick to re-pick.
 */
export interface CreatorProfileDraftFields {
  displayName: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
  shippingAddress: string;
  instagramUrl: string;
  youtubeUrl: string;
  snapchatUrl: string;
  contentVolume: string;
  collaborationCount: string;
  travelRadius: string;
  onLocationAvailable: boolean;
}

interface StoredDraft {
  savedAt: number;
  /** Server updatedAt the draft was based on, used as a staleness guard. */
  basedOn?: string;
  values: CreatorProfileDraftFields;
}

const PREFIX = "creatorDraft:v1";
const PERSIST_DEBOUNCE_MS = 600;

function keyFor(userId?: string, profileId?: string): string | null {
  if (!userId || !profileId) return null;
  return `${PREFIX}:${userId}:${profileId}`;
}

export function useCreatorProfileDraft(params: {
  enabled: boolean;
  userId?: string;
  profileId?: string;
  serverUpdatedAt?: string;
  values: CreatorProfileDraftFields;
  apply: (draft: CreatorProfileDraftFields) => void;
}) {
  const { enabled, userId, profileId, serverUpdatedAt, values, apply } = params;
  const storageKey = keyFor(userId, profileId);

  const restoredRef = useRef(false);

  // Restore once on mount. Deferred via timeout so the setState calls don't run
  // synchronously inside the effect body.
  useEffect(() => {
    if (!enabled || !storageKey || restoredRef.current) return;
    restoredRef.current = true;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (!raw) return;

    let draft: StoredDraft | null = null;
    try {
      draft = JSON.parse(raw) as StoredDraft;
    } catch {
      return;
    }
    if (!draft?.values) return;

    // Discard the draft if the server profile is newer than what it was based on.
    if (
      serverUpdatedAt &&
      draft.basedOn &&
      new Date(serverUpdatedAt).getTime() > new Date(draft.basedOn).getTime()
    ) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      return;
    }

    const values = draft.values;
    const timer = setTimeout(() => apply(values), 0);
    return () => clearTimeout(timer);
  }, [enabled, storageKey, serverUpdatedAt, apply]);

  // Persist (debounced) whenever a tracked field changes.
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!enabled || !storageKey || !restoredRef.current) return;
    const timer = setTimeout(() => {
      const payload: StoredDraft = {
        savedAt: Date.now(),
        basedOn: serverUpdatedAt,
        values: JSON.parse(serialized) as CreatorProfileDraftFields,
      };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        /* ignore quota/private-mode failures */
      }
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, storageKey, serverUpdatedAt, serialized]);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return { clearDraft };
}
