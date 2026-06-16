import { NextRequest, NextResponse } from "next/server";
import {
  getAuthFromCookies,
  getRefreshTokenFromCookies,
} from "@/lib/auth/cookies";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth/jwt";
import { ACCESS_COOKIE, accessCookieOptions } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/crypto/encryption";
import type { AuthContext } from "@/types";
import { MANAGER_ROLES } from "@/types";

export type ApiHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse>;

interface RouteOptions {
  roles?: AuthContext["role"][];
  requireMfa?: boolean;
}

/**
 * Core API authentication middleware.
 * Validates JWT from HttpOnly cookie, enforces RBAC, and injects AuthContext.
 */
export function withAuth(handler: ApiHandler, options: RouteOptions = {}) {
  const { roles, requireMfa: mfaRequired = true } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let auth = await getAuthFromCookies();

      if (!auth) {
        const refreshed = await tryRefreshAccessToken();
        if (!refreshed) {
          return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }
        auth = refreshed;
      }

      if (mfaRequired && !auth.mfaVerified) {
        return NextResponse.json({ error: "MFA verification required" }, { status: 403 });
      }

      if (roles && !roles.includes(auth.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return handler(req, auth);
    } catch (error) {
      console.error("[withAuth]", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export const withMemberAuth = (handler: ApiHandler) =>
  withAuth(handler, { roles: ["MEMBER", "MANAGER", "ADMIN"] });

export const withManagerAuth = (handler: ApiHandler) =>
  withAuth(handler, { roles: MANAGER_ROLES });

async function tryRefreshAccessToken(): Promise<AuthContext | null> {
  const refresh = getRefreshTokenFromCookies();
  if (!refresh) return null;

  try {
    const userId = await verifyRefreshToken(refresh);
    const tokenHash = hashToken(refresh);

    const stored = await prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive) return null;

    const access = await signAccessToken({
      sub: stored.user.id,
      role: stored.user.role,
      groupId: stored.user.groupId,
      mfaVerified: stored.user.mfaEnabled,
    });

    const response = NextResponse.next();
    response.cookies.set(ACCESS_COOKIE, access, {
      httpOnly: accessCookieOptions().httpOnly,
      secure: accessCookieOptions().secure,
      sameSite: accessCookieOptions().sameSite,
      path: accessCookieOptions().path,
      maxAge: accessCookieOptions().maxAge,
    });

    return {
      userId: stored.user.id,
      role: stored.user.role,
      groupId: stored.user.groupId,
      mfaVerified: stored.user.mfaEnabled,
    };
  } catch {
    return null;
  }
}
