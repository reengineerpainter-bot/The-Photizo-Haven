import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validation/schemas";
import { hashForLookup, hashToken } from "@/lib/crypto/encryption";
import { setAuthCookies } from "@/lib/auth/cookies";
import { signRefreshToken } from "@/lib/auth/jwt";
import { verifyMfaCode } from "@/lib/auth/mfa";
import { writeAuditLog } from "@/lib/audit/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`login:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { email, password, mfaCode } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { emailHash: hashForLookup(email) },
    });

    if (!user || !user.isActive) {
      await writeAuditLog({
        action: "LOGIN_FAILURE",
        ipAddress: ip,
        metadata: { email },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await writeAuditLog({
        actorId: user.id,
        groupId: user.groupId,
        action: "LOGIN_FAILURE",
        ipAddress: ip,
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let mfaVerified = false;

    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaCode) {
        return NextResponse.json({ mfaRequired: true }, { status: 200 });
      }
      if (!verifyMfaCode(user.mfaSecret, mfaCode)) {
        await writeAuditLog({
          actorId: user.id,
          groupId: user.groupId,
          action: "LOGIN_FAILURE",
          ipAddress: ip,
          metadata: { reason: "mfa_failed" },
        });
        return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
      }
      mfaVerified = true;
      await writeAuditLog({
        actorId: user.id,
        groupId: user.groupId,
        action: "MFA_VERIFIED",
        ipAddress: ip,
      });
    } else if (user.mfaSecret && !user.mfaEnabled) {
      if (!mfaCode) {
        const refresh = await signRefreshToken(user.id);
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(refresh),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        await setAuthCookies(
          {
            sub: user.id,
            role: user.role,
            groupId: user.groupId,
            mfaVerified: false,
          },
          refresh
        );
        return NextResponse.json({ mfaSetupRequired: true });
      }
      if (!verifyMfaCode(user.mfaSecret, mfaCode)) {
        return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      });
      mfaVerified = true;
      await writeAuditLog({
        actorId: user.id,
        groupId: user.groupId,
        action: "MFA_ENABLED",
        ipAddress: ip,
      });
    } else {
      mfaVerified = true;
    }

    const refresh = await signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await setAuthCookies(
      {
        sub: user.id,
        role: user.role,
        groupId: user.groupId,
        mfaVerified,
      },
      refresh
    );

    await writeAuditLog({
      actorId: user.id,
      groupId: user.groupId,
      action: "LOGIN_SUCCESS",
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      message: "Login successful",
      role: user.role,
      mfaVerified,
    });
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
