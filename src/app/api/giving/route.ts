import { NextRequest, NextResponse } from "next/server";
import { withMemberAuth } from "@/lib/auth/middleware";
import { withRlsContext, prisma } from "@/lib/db/prisma";
import { givingRecordSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/security/rate-limit";
import { checkLapseAndMilestone } from "@/lib/notifications/triggers";
import { currentPeriodMonth, toNumber } from "@/lib/giving/utils";
import type { GivingRecordDto, GivingSummary, GivingTargetDto } from "@/types/giving";

export const GET = withMemberAuth(async (_req, auth) => {
  const periodMonth = currentPeriodMonth();
  const periodDate = new Date(periodMonth);

  const [records, targets, activeProject] = await withRlsContext(auth, async (tx) => {
    const [recs, tgts, project] = await Promise.all([
      tx.givingRecord.findMany({
        where: { userId: auth.userId },
        orderBy: { periodMonth: "desc" },
        take: 50,
      }),
      tx.givingTarget.findMany({
        where: { userId: auth.userId },
      }),
      tx.partnershipProject.findFirst({
        where: {
          groupId: auth.groupId,
          activeMonth: periodDate,
        },
      }),
    ]);
    return [recs, tgts, project] as const;
  });

  const summary: GivingSummary = {
    periodMonth,
    records: records.map(
      (r): GivingRecordDto => ({
        id: r.id,
        category: r.category,
        amount: toNumber(r.amount),
        currency: r.currency,
        periodMonth: r.periodMonth.toISOString().slice(0, 10),
        notes: r.notes,
        projectDesc: r.projectDesc,
        recordedAt: r.recordedAt.toISOString(),
      })
    ),
    targets: targets.map(
      (t): GivingTargetDto => ({
        category: t.category,
        targetAmount: toNumber(t.targetAmount),
        isPercentage: t.isPercentage,
        percentage: t.percentage ? toNumber(t.percentage) : null,
      })
    ),
    activeProject: activeProject
      ? { title: activeProject.title, description: activeProject.description }
      : null,
  };

  return NextResponse.json(summary);
});

export const POST = withMemberAuth(async (req, auth) => {
  const body = await req.json();
  const parsed = givingRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { category, amount, periodMonth, notes, projectDesc } = parsed.data;

  const record = await withRlsContext(auth, (tx) =>
    tx.givingRecord.upsert({
      where: {
        userId_category_periodMonth: {
          userId: auth.userId,
          category,
          periodMonth: new Date(periodMonth),
        },
      },
      create: {
        userId: auth.userId,
        groupId: auth.groupId,
        category,
        amount,
        periodMonth: new Date(periodMonth),
        notes,
        projectDesc: category === "LOCAL_PARTNERSHIP" ? projectDesc : undefined,
      },
      update: { amount, notes, projectDesc },
    })
  );

  await prisma.user.update({
    where: { id: auth.userId },
    data: { lastGivingAt: new Date() },
  });

  await writeAuditLog({
    actorId: auth.userId,
    groupId: auth.groupId,
    action: "GIVING_RECORDED",
    resourceType: "giving_record",
    resourceId: record.id,
    ipAddress: getClientIp(req),
    metadata: { category, amount },
  });

  await checkLapseAndMilestone(auth.userId);

  return NextResponse.json(
    {
      record: {
        id: record.id,
        category: record.category,
        amount: toNumber(record.amount),
        currency: record.currency,
        periodMonth: record.periodMonth.toISOString().slice(0, 10),
        notes: record.notes,
        projectDesc: record.projectDesc,
        recordedAt: record.recordedAt.toISOString(),
      },
    },
    { status: 201 }
  );
});
