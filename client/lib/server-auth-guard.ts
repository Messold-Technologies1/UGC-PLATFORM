import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

export type ServerAuthUser = {
  id: string;
  email: string;
  roles?: Array<"CREATOR" | "BRAND" | "ADMIN">;
  primaryRole?: "CREATOR" | "BRAND" | "ADMIN" | null;
  brandAccessRevoked?: boolean;
};

type MeResponse = {
  user?: ServerAuthUser | null;
};

export async function fetchServerAuthUser(): Promise<ServerAuthUser | null> {
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

function fallbackWorkspacePath(user: ServerAuthUser): string {
  if (user.roles?.includes("ADMIN")) return "/admin";
  if (user.roles?.includes("CREATOR")) return "/creator/dashboard";
  return "/auth/continue";
}

export async function requireBrandWorkspace(callbackPath: string) {
  const user = await fetchServerAuthUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const hasBrandRole = user.roles?.includes("BRAND") ?? false;
  if (!hasBrandRole || user.brandAccessRevoked) {
    redirect(fallbackWorkspacePath(user));
  }

  return user;
}

export async function requireCreatorWorkspace(callbackPath: string) {
  const user = await fetchServerAuthUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const hasCreatorRole = user.roles?.includes("CREATOR") ?? false;
  if (!hasCreatorRole) {
    redirect(fallbackWorkspacePath(user));
  }

  return user;
}
