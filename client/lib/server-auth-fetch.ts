import "server-only";

import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

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

function parseCookiePair(setCookieHeader: string): { name: string; value: string } | null {
  const pair = setCookieHeader.split(";")[0]?.trim();
  if (!pair) return null;
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  return {
    name: pair.slice(0, eq).trim(),
    value: pair.slice(eq + 1).trim(),
  };
}

function mergeCookieHeader(
  existingCookieHeader: string,
  setCookieHeaders: string[],
): string {
  const jar = new Map<string, string>();

  for (const part of existingCookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    jar.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }

  for (const header of setCookieHeaders) {
    const parsed = parseCookiePair(header);
    if (parsed) {
      jar.set(parsed.name, parsed.value);
    }
  }

  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function readServerCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function refreshServerSessionCookieHeader(
  cookieHeader: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(env.refreshCookieName)?.value;
  if (!refreshToken) return null;

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
      return null;
    }

    const setCookieHeaders = getSetCookieHeaders(refreshResponse.headers);
    if (setCookieHeaders.length === 0) {
      return cookieHeader;
    }

    return mergeCookieHeader(cookieHeader, setCookieHeaders);
  } catch {
    return null;
  }
}

/**
 * Server fetch for endpoints that may return different data when the viewer is
 * authenticated (e.g. creator viewing their own pending public profile).
 * Retries once after refreshing an expired access token.
 */
export async function fetchWithOptionalSessionRefresh(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieHeader = await readServerCookieHeader();

  const request = (cookiesForRequest: string) =>
    fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
        ...(cookiesForRequest ? { Cookie: cookiesForRequest } : {}),
      },
      cache: "no-store",
    });

  const first = await request(cookieHeader);
  if (first.ok || (first.status !== 401 && first.status !== 404)) {
    return first;
  }

  const refreshedCookieHeader = await refreshServerSessionCookieHeader(cookieHeader);
  if (!refreshedCookieHeader || refreshedCookieHeader === cookieHeader) {
    return first;
  }

  const second = await request(refreshedCookieHeader);
  return second.ok ? second : first;
}
