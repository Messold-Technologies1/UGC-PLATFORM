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

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: filterRequestHeaders(request.headers),
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
    response.headers.set(key, value);
  });

  for (const setCookie of getSetCookieHeaders(upstreamResponse.headers)) {
    response.headers.append("set-cookie", setCookie);
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

