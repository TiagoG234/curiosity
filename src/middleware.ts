import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/topics",
  "/reflections",
  "/history",
  "/focus",
  "/explore",
  "/create",
  "/graph",
  "/insights",
  "/settings"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip protection in development (demo user fallback handles auth)
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth)
  const sessionToken =
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)"
  ]
};
