import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { verifyMfaCode } from "@/lib/auth/mfa";
import { setAuthCookies } from "@/lib/auth/cookies";
import { mfaVerifySchema } from "@/lib/validation/mfa";
import { writeAuditLog } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/security/rate-limit";

export const POST = withAuth(
  async (req: NextRequest, auth) => {
    const body = await req.json();
    const parsed = mfaVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid code", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { mfaSecret: true, mfaEnabled: true, role: true, groupId: true },
    });

    if (!user?.mfaSecret) {
      return NextResponse.json({ error: "MFA not configured" }, { status: 400 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: "MFA already enabled" }, { status: 400 });
    }

    if (!verifyMfaCode(user.mfaSecret, parsed.data.code)) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { mfaEnabled: true },
    });

    await setAuthCookies({
      sub: auth.userId,
      role: user.role,
      groupId: user.groupId,
      mfaVerified: true,
    });

    await writeAuditLog({
      actorId: auth.userId,
      groupId: user.groupId,
      action: "MFA_ENABLED",
      ipAddress: getClientIp(req),
    });

    await writeAuditLog({
      actorId: auth.userId,
      groupId: user.groupId,
      action: "MFA_VERIFIED",
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      message: "MFA enabled successfully",
      role: user.role,
    });
  },
  { requireMfa: false }
);
