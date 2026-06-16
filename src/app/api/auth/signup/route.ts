import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { signupSchema } from "@/lib/validation/schemas";
import {
  encryptField,
  hashForLookup,
  hashToken,
} from "@/lib/crypto/encryption";
import { setAuthCookies } from "@/lib/auth/cookies";
import { signRefreshToken } from "@/lib/auth/jwt";
import { writeAuditLog } from "@/lib/audit/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { generateMfaSecret } from "@/lib/auth/mfa";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`signup:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, phone, email, dateJoined, password, groupId } = parsed.data;
    const emailHash = hashForLookup(email);

    const existing = await prisma.user.findUnique({ where: { emailHash } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    let resolvedGroupId = groupId;
    if (!resolvedGroupId) {
      const defaultGroup = await prisma.group.findFirst();
      if (!defaultGroup) {
        const created = await prisma.group.create({ data: { name: "The Photizo Haven" } });
        resolvedGroupId = created.id;
      } else {
        resolvedGroupId = defaultGroup.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const mfaSecret = generateMfaSecret();

    const user = await prisma.user.create({
      data: {
        groupId: resolvedGroupId,
        fullName,
        phoneEncrypted: encryptField(phone),
        phoneHash: hashForLookup(phone),
        emailEncrypted: encryptField(email),
        emailHash,
        passwordHash,
        dateJoined: new Date(dateJoined),
        mfaSecret,
        role: "MEMBER",
      },
    });

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

    await writeAuditLog({
      actorId: user.id,
      groupId: user.groupId,
      action: "MEMBER_CREATED",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(
      {
        message: "Account created. Complete MFA setup.",
        userId: user.id,
        mfaRequired: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[signup]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
