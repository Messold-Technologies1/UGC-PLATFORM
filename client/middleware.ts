import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Preserve the requested path for server auth guards (login callbackUrl). */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (pathname.match(/^\/brand\/orders\/[^\/]+\/brief$/)) {
    const newPathname = pathname.replace('/brief', '');
    // Relative `Location` on purpose — see app/auth/session-restore/route.ts.
    // `new URL(path, request.url)` resolves against the origin this process
    // listens on (127.0.0.1:3000 under PM2), not the host the visitor asked
    // for, so an absolute redirect here would hand out localhost URLs.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: `${newPathname}${search}` },
    });
  }

  requestHeaders.set("x-pathname", `${pathname}${search}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/creator/:path*", "/brand/:path*", "/agency/:path*", "/admin/:path*"],
};
