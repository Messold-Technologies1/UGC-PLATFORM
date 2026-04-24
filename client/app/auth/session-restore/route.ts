import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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

function clearAuthCookies(response: NextResponse) {
  const sameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: sameSite as "lax" | "none",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(env.authCookieName, "", baseOptions);
  response.cookies.set(env.refreshCookieName, "", baseOptions);
}

export async function GET(request: NextRequest) {
  const callbackUrl = normalizeInternalPath(
    request.nextUrl.searchParams.get("callbackUrl"),
    "/",
  );
  const fallbackUrl = normalizeInternalPath(
    request.nextUrl.searchParams.get("fallbackUrl"),
    callbackUrl,
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

    const response = NextResponse.redirect(new URL(callbackUrl, request.url));
    for (const setCookieHeader of getSetCookieHeaders(refreshResponse.headers)) {
      response.headers.append("set-cookie", setCookieHeader);
    }
    return response;
  } catch {
    return NextResponse.redirect(new URL(fallbackUrl, request.url));
  }
}
