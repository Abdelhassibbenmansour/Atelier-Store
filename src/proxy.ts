// Optimistic auth check: redirect visitors without a session cookie away from
// protected areas before rendering. It only looks at the cookie (no database read),
// so a forged or expired cookie gets through. The real checks are requireUser() and
// requireAdmin() in src/lib/session.ts.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { signInPath } from "@/lib/redirect";

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(signInPath(`${pathname}${search}`), request.url));
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/checkout/:path*"],
};
