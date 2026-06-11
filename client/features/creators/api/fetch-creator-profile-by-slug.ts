import { cache } from "react";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { creatorsByPublicSlugPath } from "@/lib/endpoints";
import type { FetchCreatorProfileResult } from "./fetch-creator-profile";
import type { CreatorProfileItemApi } from "./types";
import { creatorPublicProfileSlug } from "../lib/creator-public-profile-url";

export const fetchCreatorProfileByPublicSlug = cache(
  async function fetchCreatorProfileByPublicSlug(
    slug: string,
  ): Promise<FetchCreatorProfileResult> {
    const normalized = creatorPublicProfileSlug(slug);
    if (!normalized) {
      return { ok: false, status: 404 };
    }

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const path = creatorsByPublicSlugPath(normalized);
    const url = `${env.apiUrl}${path}`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        next: { revalidate: 3600 },
      });

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
