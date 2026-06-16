export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { decryptField } from "@/lib/crypto/encryption";
import { generateMfaQrDataUrl, getMfaProvisioningUri } from "@/lib/auth/mfa";

export const GET = withAuth(
  async (_req, auth) => {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        mfaSecret: true,
        mfaEnabled: true,
        emailEncrypted: true,
        fullName: true,
      },
    });

    if (!user?.mfaSecret) {
      return NextResponse.json({ error: "MFA not configured for this account" }, { status: 400 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: "MFA already enabled" }, { status: 400 });
    }

    const email = decryptField(user.emailEncrypted);
    const [qrDataUrl] = await Promise.all([
      generateMfaQrDataUrl(user.mfaSecret, email),
    ]);

    return NextResponse.json({
      qrDataUrl,
      secret: user.mfaSecret,
      email,
      provisioningUri: getMfaProvisioningUri(user.mfaSecret, email),
      fullName: user.fullName,
    });
  },
  { requireMfa: false }
);
