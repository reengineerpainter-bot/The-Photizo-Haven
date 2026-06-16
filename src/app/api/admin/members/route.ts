import { NextResponse } from "next/server";
import { withManagerAuth } from "@/lib/auth/middleware";
import { assertResourceAccess } from "@/lib/auth/rbac";
import { withRlsContext } from "@/lib/db/prisma";
import { adminCommentSchema, memberFeedbackSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/security/rate-limit";
import { decryptField } from "@/lib/crypto/encryption";
import { maskEmail, maskPhone } from "@/lib/dlp/masking";

export const GET = withManagerAuth(async (_req, auth) => {
  const members = await withRlsContext(auth, (tx) =>
    tx.user.findMany({
      where: { groupId: auth.groupId, role: "MEMBER" },
      select: {
        id: true,
        fullName: true,
        emailEncrypted: true,
        phoneEncrypted: true,
        consistency: true,
        lastGivingAt: true,
        dateJoined: true,
        givingRecords: {
          orderBy: { periodMonth: "desc" },
          take: 12,
        },
      },
    })
  );

  const matrix = members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    email: maskEmail(decryptField(m.emailEncrypted)),
    phone: maskPhone(decryptField(m.phoneEncrypted)),
    consistency: m.consistency,
    lastGivingAt: m.lastGivingAt,
    recentGiving: m.givingRecords,
  }));

  return NextResponse.json({ members: matrix });
});

export const POST = withManagerAuth(async (req, auth) => {
    const body = await req.json();
    const type = body.type as "comment" | "feedback";

    if (type === "comment") {
      const parsed = adminCommentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 });
      }

      const member = await withRlsContext(auth, (tx) =>
        tx.user.findUnique({ where: { id: parsed.data.memberId } })
      );
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      assertResourceAccess(auth, { userId: member.id, groupId: member.groupId });

      const comment = await withRlsContext(auth, (tx) =>
        tx.adminComment.create({
          data: {
            memberId: parsed.data.memberId,
            managerId: auth.userId,
            groupId: auth.groupId,
            body: parsed.data.body,
          },
        })
      );

      await writeAuditLog({
        actorId: auth.userId,
        groupId: auth.groupId,
        action: "ADMIN_COMMENT",
        resourceId: comment.id,
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({ comment }, { status: 201 });
    }

    const parsed = memberFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const member = await withRlsContext(auth, (tx) =>
      tx.user.findUnique({ where: { id: parsed.data.memberId } })
    );
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    assertResourceAccess(auth, { userId: member.id, groupId: member.groupId });

    const feedback = await withRlsContext(auth, (tx) =>
      tx.memberFeedback.create({
        data: {
          memberId: parsed.data.memberId,
          managerId: auth.userId,
          groupId: auth.groupId,
          subject: parsed.data.subject,
          body: parsed.data.body,
        },
      })
    );

    await writeAuditLog({
      actorId: auth.userId,
      groupId: auth.groupId,
      action: "ADMIN_FEEDBACK",
      resourceId: feedback.id,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ feedback }, { status: 201 });
});
