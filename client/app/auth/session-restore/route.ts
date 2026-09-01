import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { resolveLandingWorkspacePath } from "@/features/auth/lib/post-auth-destination";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

export const dynamic = "force-dynamic";

function normalizeInternalPath(
  path: string | null | undefined,
  fallbackPath: string,
) {
  if (!path?.trim()) return fallbackPath;
  if (!path.startsWith("/") || path.startsWith("//")) return fallbackPath;
  return path;
}

function splitSetCookieHeader(value: string): string[] {
  return value
    .split(/,(?=[^;,=\s]+=[^;,]+)/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSetCookieHeaders(headers: Headers): string[] {
  const cookieHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof cookieHeaders.getSetCookie === "function") {
    return cookieHeaders.getSetCookie();
  }

  const rawHeader = headers.get("set-cookie");
  return rawHeader ? splitSetCookieHeader(rawHeader) : [];
}

function overlayCookieHeader(
  existing: { name: string; value: string }[],
  setCookieHeaders: string[],
): string {
  const map = new Map(existing.map((cookie) => [cookie.name, cookie.value]));
  for (const header of setCookieHeaders) {
    const pair = header.split(";")[0]?.trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name) continue;
    if (!value) {
      map.delete(name);
      continue;
    }
    map.set(name, value);
  }
  return [...map.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function applySetCookies(response: NextResponse, setCookieHeaders: string[]) {
  for (const setCookieHeader of setCookieHeaders) {
    response.headers.append("set-cookie", setCookieHeader);
  }
}

function clearAuthCookies(response: NextResponse) {
  const sameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: sameSite as "lax" | "none",
    path: "/",
    maxAge: 0,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };

  response.cookies.set(env.authCookieName, "", baseOptions);
  response.cookies.set(env.refreshCookieName, "", baseOptions);
}

async function resolveHomeWorkspacePath(cookieHeader: string): Promise<string | null> {
  try {
    const meResponse = await fetch(`${env.apiUrl}${ENDPOINTS.AUTH.ME}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });
    if (!meResponse.ok) return null;
    const data = (await meResponse.json()) as {
      user?: {
        primaryRole?: string | null;
        roles?: string[] | null;
        brandAccessRevoked?: boolean;
      } | null;
    };
    return resolveLandingWorkspacePath(data.user ?? null);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const resumeHome = request.nextUrl.searchParams.get("resumeHome") === "1";
  const callbackUrl = normalizeInternalPath(
    request.nextUrl.searchParams.get("callbackUrl"),
    "/",
  );
  const fallbackUrl = normalizeInternalPath(
    request.nextUrl.searchParams.get("fallbackUrl"),
    resumeHome ? "/?noRestore=1" : callbackUrl,
  );

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(env.refreshCookieName)?.value;
  if (!refreshToken) {
    return NextResponse.redirect(new URL(fallbackUrl, request.url));
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  try {
    const refreshResponse = await fetch(`${env.apiUrl}${ENDPOINTS.AUTH.REFRESH}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (!refreshResponse.ok) {
      const response = NextResponse.redirect(new URL(fallbackUrl, request.url));
      if (refreshResponse.status === 401 || refreshResponse.status === 403) {
        clearAuthCookies(response);
      }
      return response;
    }

    const setCookieHeaders = getSetCookieHeaders(refreshResponse.headers);

    let destination = callbackUrl;
    if (resumeHome) {
      const meCookieHeader = overlayCookieHeader(
        cookieStore.getAll(),
        setCookieHeaders,
      );
      destination =
        (await resolveHomeWorkspacePath(meCookieHeader)) ?? "/";
    }

    const response = NextResponse.redirect(new URL(destination, request.url));
    applySetCookies(response, setCookieHeaders);
    return response;
  } catch {
    return NextResponse.redirect(new URL(fallbackUrl, request.url));
  }
}
