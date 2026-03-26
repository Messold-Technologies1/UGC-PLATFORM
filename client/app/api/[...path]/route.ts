import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

async function proxy(request: NextRequest, path: string[]) {
  const target = `${env.apiUrl}/api/${path.join("/")}`;
  const search = request.nextUrl.searchParams.toString();
  const url = search ? `${target}?${search}` : target;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("Location");
    const res = new NextResponse(null, { status: upstream.status });
    if (location) res.headers.set("Location", location);
    for (const c of upstream.headers.getSetCookie()) {
      res.headers.append("Set-Cookie", c);
    }
    return res;
  }

  const data = await upstream.text();
  /** 204/205/304 must not have a body per Fetch — NextResponse throws otherwise. */
  const status = upstream.status;
  const mustBeEmptyBody = status === 204 || status === 205 || status === 304;
  const res = new NextResponse(mustBeEmptyBody ? null : data, {
    status,
    headers: mustBeEmptyBody
      ? {}
      : {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
        },
  });

  for (const cookie of upstream.headers.getSetCookie()) {
    res.headers.append("Set-Cookie", cookie);
  }

  return res;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(request, path);
}
