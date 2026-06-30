import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Preserve the requested path for server auth guards (login callbackUrl). */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (pathname.match(/^\/brand\/orders\/[^\/]+\/brief$/)) {
    const newPathname = pathname.replace('/brief', '');
    return NextResponse.redirect(new URL(newPathname, request.url));
  }

  requestHeaders.set("x-pathname", `${pathname}${search}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/creator/:path*", "/brand/:path*", "/admin/:path*"],
};
