import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "./jwt";
import type { AuthContext, JwtPayload, UserRole } from "@/types";

export async function setAuthCookies(
  payload: Omit<JwtPayload, "iat" | "exp">,
  refreshTokenValue?: string
): Promise<void> {
  const access = await signAccessToken(payload);
  const refresh = refreshTokenValue ?? (await signRefreshToken(payload.sub));
  const jar = cookies();

  jar.set(ACCESS_COOKIE, access, {
    httpOnly: accessCookieOptions().httpOnly,
    secure: accessCookieOptions().secure,
    sameSite: accessCookieOptions().sameSite,
    path: accessCookieOptions().path,
    maxAge: accessCookieOptions().maxAge,
  });

  jar.set(REFRESH_COOKIE, refresh, {
    httpOnly: refreshCookieOptions().httpOnly,
    secure: refreshCookieOptions().secure,
    sameSite: refreshCookieOptions().sameSite,
    path: refreshCookieOptions().path,
    maxAge: refreshCookieOptions().maxAge,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const jar = cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getAuthFromCookies(): Promise<AuthContext | null> {
  const jar = cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    return {
      userId: payload.sub,
      role: payload.role,
      groupId: payload.groupId,
      mfaVerified: payload.mfaVerified,
    };
  } catch {
    return null;
  }
}

export function toAuthContext(payload: JwtPayload): AuthContext {
  return {
    userId: payload.sub,
    role: payload.role,
    groupId: payload.groupId,
    mfaVerified: payload.mfaVerified,
  };
}

export function getRefreshTokenFromCookies(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
