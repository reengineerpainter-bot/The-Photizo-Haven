import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyToken } from "@/lib/auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/signup"];
const MFA_PATHS = ["/mfa/setup", "/api/auth/mfa"];
const AUTH_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  let mfaVerified = false;
  let hasAuth = false;

  if (token) {
    try {
      const payload = await verifyToken(token);
      hasAuth = true;
      mfaVerified = Boolean(payload.mfaVerified);
    } catch {
      hasAuth = false;
    }
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);
  const isMfaRoute = MFA_PATHS.some((p) => pathname.startsWith(p));
  const isAuthApi =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/logout");

  if (isPublic || isAuthApi) {
    if (hasAuth && mfaVerified && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isMfaRoute) {
    if (!hasAuth) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (mfaVerified && pathname === "/mfa/setup") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasAuth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!mfaVerified) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "MFA verification required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/mfa/setup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/mfa/setup",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
