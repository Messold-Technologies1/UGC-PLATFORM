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

type ServerAuthUserState = {
  user: ServerAuthUser | null;
  status: "authenticated" | "unauthenticated" | "unavailable";
};

function normalizeInternalPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}

function sessionRestoreHref(callbackPath: string, fallbackPath: string): string {
  const params = new URLSearchParams({
    callbackUrl: normalizeInternalPath(callbackPath),
    fallbackUrl: normalizeInternalPath(fallbackPath),
  });

  return `/auth/session-restore?${params.toString()}`;
}

export async function redirectToSessionRestoreIfPossible(
  callbackPath: string,
  fallbackPath: string,
) {
  const cookieStore = await cookies();
  const hasRefreshToken = !!cookieStore.get(env.refreshCookieName)?.value;

  if (hasRefreshToken) {
    redirect(sessionRestoreHref(callbackPath, fallbackPath));
  }
}

export async function fetchServerAuthUserState(): Promise<ServerAuthUserState> {
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

    if (!res.ok) {
      return {
        user: null,
        status:
          res.status === 401 || res.status === 403
            ? "unauthenticated"
            : "unavailable",
      };
    }

    const data = (await res.json()) as MeResponse;
    return {
      user: data.user ?? null,
      status: data.user ? "authenticated" : "unauthenticated",
    };
  } catch {
    return {
      user: null,
      status: "unavailable",
    };
  }
}

export async function fetchServerAuthUser(): Promise<ServerAuthUser | null> {
  const result = await fetchServerAuthUserState();
  return result.user;
}

export async function requireAuthenticatedUser(callbackPath: string) {
  const auth = await fetchServerAuthUserState();
  const user = auth.user;
  if (!user) {
    if (auth.status === "unauthenticated") {
      await redirectToSessionRestoreIfPossible(
        callbackPath,
        `/login?callbackUrl=${encodeURIComponent(callbackPath)}`,
      );
    }
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
}

function fallbackWorkspacePath(user: ServerAuthUser): string {
  if (user.roles?.includes("ADMIN")) return "/admin";
  if (
    user.primaryRole === "BRAND" &&
    user.roles?.includes("BRAND") &&
    !user.brandAccessRevoked
  ) {
    return "/brand/dashboard";
  }
  if (user.primaryRole === "CREATOR" && user.roles?.includes("CREATOR")) {
    return "/creator/dashboard";
  }
  if (user.roles?.includes("BRAND") && !user.brandAccessRevoked) {
    return "/brand/dashboard";
  }
  if (user.roles?.includes("CREATOR")) return "/creator/dashboard";
  return "/auth/continue";
}

export async function requireAdminWorkspace(callbackPath: string) {
  const auth = await fetchServerAuthUserState();
  const user = auth.user;
  if (!user) {
    if (auth.status === "unauthenticated") {
      await redirectToSessionRestoreIfPossible(
        callbackPath,
        `/login?callbackUrl=${encodeURIComponent(callbackPath)}`,
      );
    }
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const hasAdminRole = user.roles?.includes("ADMIN") ?? false;
  if (!hasAdminRole) {
    redirect(fallbackWorkspacePath(user));
  }

  return user;
}

export async function requireBrandWorkspace(callbackPath: string) {
  const auth = await fetchServerAuthUserState();
  const user = auth.user;
  if (!user) {
    if (auth.status === "unauthenticated") {
      await redirectToSessionRestoreIfPossible(
        callbackPath,
        `/login?callbackUrl=${encodeURIComponent(callbackPath)}`,
      );
    }
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const hasBrandRole = user.roles?.includes("BRAND") ?? false;
  if (!hasBrandRole || user.brandAccessRevoked) {
    redirect(fallbackWorkspacePath(user));
  }

  return user;
}

export async function requireCreatorWorkspace(callbackPath: string) {
  const auth = await fetchServerAuthUserState();
  const user = auth.user;
  if (!user) {
    if (auth.status === "unauthenticated") {
      await redirectToSessionRestoreIfPossible(
        callbackPath,
        `/login?callbackUrl=${encodeURIComponent(callbackPath)}`,
      );
    }
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const hasCreatorRole = user.roles?.includes("CREATOR") ?? false;
  if (!hasCreatorRole) {
    redirect(fallbackWorkspacePath(user));
  }

  return user;
}
