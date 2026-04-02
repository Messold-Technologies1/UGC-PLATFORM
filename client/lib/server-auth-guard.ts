import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

type ServerAuthUser = {
  id: string;
  email: string;
};

type MeResponse = {
  user?: ServerAuthUser | null;
};

async function fetchServerAuthUser(): Promise<ServerAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const res = await fetch(`${env.apiUrl}${ENDPOINTS.AUTH.ME}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as MeResponse;
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(callbackPath: string) {
  const user = await fetchServerAuthUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
}
