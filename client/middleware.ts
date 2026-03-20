import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "token";

const PROTECTED_PREFIXES = ["/brand", "/creator"];
const AUTH_ROUTES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

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
