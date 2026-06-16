import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, UserRole } from "@/types";

const ACCESS_COOKIE = "ph_access";
const REFRESH_COOKIE = "ph_refresh";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function parseExpiry(env: string | undefined, fallback: string): string {
  return env ?? fallback;
}

export async function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({
    role: payload.role,
    groupId: payload.groupId,
    mfaVerified: payload.mfaVerified,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(parseExpiry(process.env.JWT_ACCESS_EXPIRY, "15m"))
    .sign(getSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(parseExpiry(process.env.JWT_REFRESH_EXPIRY, "7d"))
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    sub: payload.sub as string,
    role: payload.role as UserRole,
    groupId: payload.groupId as string,
    mfaVerified: Boolean(payload.mfaVerified),
    iat: payload.iat,
    exp: payload.exp,
  };
}

export async function verifyRefreshToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (payload.type !== "refresh" || !payload.sub) {
    throw new Error("Invalid refresh token");
  }
  return payload.sub;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export function accessCookieOptions() {
  return {
    ...cookieOptions,
    name: ACCESS_COOKIE,
    maxAge: 15 * 60,
  };
}

export function refreshCookieOptions() {
  return {
    ...cookieOptions,
    name: REFRESH_COOKIE,
    maxAge: 7 * 24 * 60 * 60,
  };
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
