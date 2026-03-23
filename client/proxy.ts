import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const PROTECTED_PREFIXES = ["/brand", "/creator"];
const AUTH_ROUTES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(env.authCookieName)?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && token) {
    const callback = request.nextUrl.searchParams.get("callbackUrl");
    return NextResponse.redirect(
      new URL(callback || "/brand/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/brand/:path*", "/creator/:path*", "/login", "/signup"],
};
