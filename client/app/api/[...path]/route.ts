import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function filterRequestHeaders(headers: Headers): Headers {
  const out = new Headers(headers);
  out.delete("host");
  out.delete("connection");
  out.delete("content-length");
  out.delete("accept-encoding");
  return out;
}

function canHaveBody(status: number) {
  // Per RFC: these statuses must not include a response body.
  return ![204, 205, 304].includes(status);
}

async function proxy(request: NextRequest): Promise<NextResponse> {
  const upstreamBase = new URL(env.apiUrl);
  const upstreamUrl = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    upstreamBase,
  );

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstreamHeaders = filterRequestHeaders(request.headers);
  const cookie = request.headers.get("cookie");
  if (cookie) {
    // Make cookie forwarding explicit and robust across runtimes.
    upstreamHeaders.set("cookie", cookie);
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: upstreamHeaders,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseBody =
    method === "HEAD" || !canHaveBody(upstreamResponse.status)
      ? null
      : await upstreamResponse.arrayBuffer();

  const response = new NextResponse(responseBody, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });

  upstreamResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    const lower = key.toLowerCase();
    if (lower === "content-encoding") return;
    if (lower === "content-length") return;
    if (lower === "transfer-encoding") return;
    response.headers.set(key, value);
  });

  for (const setCookie of getSetCookieHeaders(upstreamResponse.headers)) {
    response.headers.append("set-cookie", setCookie);
  }

  // Debug helpers (safe): confirm whether proxy received cookies.
  response.headers.set("x-proxy-has-cookie", cookie ? "1" : "0");
  response.headers.set("x-proxy-cookie-bytes", String(cookie?.length ?? 0));

  // Selective caching for stable, public reference endpoints.
  if (method === "GET" && upstreamResponse.status === 200) {
    const path = request.nextUrl.pathname;
    if (
      path === "/api/briefs/field-options" ||
      path.startsWith("/api/creator-portfolio/suggestions")
    ) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=86400",
      );
    } else if (path.match(/^\/api\/creators\/profile\/[^/]+$/)) {
      response.headers.set(
        "Cache-Control",
        "private, max-age=3600, stale-while-revalidate=3600",
      );
    }
  }

  return response;
}

export async function GET(request: NextRequest) {
  return proxy(request);
}
export async function POST(request: NextRequest) {
  return proxy(request);
}
export async function PUT(request: NextRequest) {
  return proxy(request);
}
export async function PATCH(request: NextRequest) {
  return proxy(request);
}
export async function DELETE(request: NextRequest) {
  return proxy(request);
}
export async function OPTIONS(request: NextRequest) {
  return proxy(request);
}

