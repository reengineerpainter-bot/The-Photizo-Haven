import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getAuthFromCookies } from "@/lib/auth/cookies";
import { writeAuditLog } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromCookies();

  if (auth) {
    await writeAuditLog({
      actorId: auth.userId,
      groupId: auth.groupId,
      action: "LOGOUT",
      ipAddress: getClientIp(req),
    });
  }

  await clearAuthCookies();
  return NextResponse.json({ message: "Logged out" });
}
