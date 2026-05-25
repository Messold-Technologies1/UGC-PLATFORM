import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

type ServerWorkspaceRole = "CREATOR" | "BRAND" | "ADMIN" | "AGENCY";

export type ServerAuthUser = {
  id: string;
  email: string;
  roles?: ServerWorkspaceRole[];
  primaryRole?: ServerWorkspaceRole | null;
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

function workspacePathForRole(role: ServerWorkspaceRole): string {
  if (role === "ADMIN") return "/admin";
  if (role === "BRAND") return "/brand/creators";
  return "/creator/orders";
}

function canAccessWorkspaceRole(
  user: ServerAuthUser,
  role: ServerWorkspaceRole,
): boolean {
  if (role === "BRAND") {
    const hasBrandAccess =
      (user.roles?.includes("BRAND") || user.roles?.includes("AGENCY")) ?? false;
    if (!hasBrandAccess) return false;
    if (user.roles?.includes("BRAND") && user.brandAccessRevoked) {
      return false;
    }
    return true;
  }

  return user.roles?.includes(role) ?? false;
}

function fallbackWorkspacePath(user: ServerAuthUser): string {
  const rolePriority: Array<ServerWorkspaceRole | null | undefined> = [
    "ADMIN",
    user.primaryRole,
    "BRAND",
    "CREATOR",
  ];

  for (const role of rolePriority) {
    if (role && canAccessWorkspaceRole(user, role)) {
      return workspacePathForRole(role);
    }
  }

  return "/";
}

async function requireWorkspaceRole(
  callbackPath: string,
  role: ServerWorkspaceRole,
) {
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

  if (!canAccessWorkspaceRole(user, role)) {
    redirect(fallbackWorkspacePath(user));
  }

  return user;
}

export async function requireAdminWorkspace(callbackPath: string) {
  return requireWorkspaceRole(callbackPath, "ADMIN");
}

export async function requireBrandWorkspace(callbackPath: string) {
  return requireWorkspaceRole(callbackPath, "BRAND");
}

export async function requireCreatorWorkspace(callbackPath: string) {
  return requireWorkspaceRole(callbackPath, "CREATOR");
}
