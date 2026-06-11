import { cache } from "react";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { creatorsByIdPath } from "@/lib/endpoints";
import type { CreatorProfileItemApi } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCreatorProfileUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export type FetchCreatorProfileResult =
  | { ok: true; profile: CreatorProfileItemApi }
  | { ok: false; status: number };

export const fetchCreatorProfileById = cache(async function fetchCreatorProfileById(
  id: string,
): Promise<FetchCreatorProfileResult> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const path = creatorsByIdPath(id);
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
      console.error("FETCH ERROR", res.status, url);
      try {
        const text = await res.text();
        console.error("FETCH ERROR BODY:", text);
      } catch (e) {
        console.error("FETCH ERROR BODY PARSE ERROR", e);
      }
      return { ok: false, status: res.status };
    }

    const profile = (await res.json()) as CreatorProfileItemApi;
    return { ok: true, profile };
  } catch (error) {
    console.error("[fetchCreatorProfileById] API unreachable:", url, error);
    return { ok: false, status: 503 };
  }
});
