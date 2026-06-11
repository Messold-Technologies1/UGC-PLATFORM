import { cache } from "react";
import { env } from "@/lib/env";
import { fetchWithOptionalSessionRefresh } from "@/lib/server-auth-fetch";
import { creatorsByPublicSlugPath } from "@/lib/endpoints";
import type { FetchCreatorProfileResult } from "./fetch-creator-profile";
import type { CreatorProfileItemApi } from "./types";
import { normalizePublicProfileSlug } from "../lib/creator-public-profile-url";

export const fetchCreatorProfileByPublicSlug = cache(
  async function fetchCreatorProfileByPublicSlug(
    slug: string,
  ): Promise<FetchCreatorProfileResult> {
    const normalized = normalizePublicProfileSlug(slug);
    if (!normalized) {
      return { ok: false, status: 404 };
    }

    const path = creatorsByPublicSlugPath(normalized);
    const url = `${env.apiUrl}${path}`;

    try {
      const res = await fetchWithOptionalSessionRefresh(url);

      if (!res.ok) {
        return { ok: false, status: res.status };
      }

      const profile = (await res.json()) as CreatorProfileItemApi;
      return { ok: true, profile };
    } catch (error) {
      console.error(
        "[fetchCreatorProfileByPublicSlug] API unreachable:",
        url,
        error,
      );
      return { ok: false, status: 503 };
    }
  },
);
