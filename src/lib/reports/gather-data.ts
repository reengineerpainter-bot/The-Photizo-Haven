import { prisma, withRlsContext } from "@/lib/db/prisma";
import { toNumber, computeProgress } from "@/lib/giving/utils";
import { GIVING_CATEGORIES, MANAGER_ROLES } from "@/types";
import type { AuthContext } from "@/types";
import type { ConsistencyStatus } from "@/types";
import type { MemberReportRow, MonthlyReportData, ReportScope } from "@/types/reports";
import { assertResourceAccess } from "@/lib/auth/rbac";

function periodLabel(periodMonth: string): string {
  return new Date(periodMonth).toLocaleDateString("en-GH", {
    month: "long",
    year: "numeric",
  });
}

function emptyBreakdown(): Record<ConsistencyStatus, number> {
  return { OUTSTANDING: 0, CONSISTENT: 0, LAGGING: 0, LAPSED: 0 };
}

export class ReportError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ReportError";
  }
}

export async function gatherMonthlyReport(
  auth: AuthContext,
  periodMonth: string,
  scope: ReportScope,
  memberId?: string
): Promise<MonthlyReportData> {
  const periodDate = new Date(periodMonth);

  const group = await prisma.group.findUnique({
    where: { id: auth.groupId },
    select: { name: true },
  });

  if (scope === "individual") {
    const targetUserId =
      memberId && MANAGER_ROLES.includes(auth.role) ? memberId : auth.userId;

    if (targetUserId !== auth.userId) {
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, groupId: true },
      });
      if (!target) throw new ReportError("Member not found", 404);
      assertResourceAccess(auth, { userId: target.id, groupId: target.groupId });
    }

    const user = await withRlsContext(auth, (tx) =>
      tx.user.findUnique({
        where: { id: targetUserId },
        include: {
          givingRecords: { where: { periodMonth: periodDate } },
          givingTargets: true,
        },
      })
    );

    if (!user) throw new ReportError("Member not found", 404);

    const categories = GIVING_CATEGORIES.map((cat) => {
      const record = user.givingRecords.find((r) => r.category === cat.key);
      const target = user.givingTargets.find((t) => t.category === cat.key);
      const amount = record ? toNumber(record.amount) : 0;
      const targetAmount = target ? toNumber(target.targetAmount) : null;
      const targetDto = target
        ? {
            category: cat.key,
            targetAmount: targetAmount!,
            isPercentage: target.isPercentage,
            percentage: target.percentage ? toNumber(target.percentage) : null,
          }
        : undefined;

      return {
        category: cat.key,
        label: cat.label,
        amount,
        target: targetAmount,
        progress: computeProgress(amount, targetDto),
        projectDesc: record?.projectDesc ?? null,
      };
    });

    const totalContributed = categories.reduce((sum, c) => sum + c.amount, 0);

    return {
      scope: "individual",
      periodMonth,
      periodLabel: periodLabel(periodMonth),
      groupName: group?.name ?? "The Photizo Haven",
      generatedAt: new Date(),
      memberName: user.fullName,
      consistency: user.consistency,
      categories,
      totalContributed,
    };
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    throw new ReportError("Group reports require manager access", 403);
  }

  const members = await withRlsContext(auth, (tx) =>
    tx.user.findMany({
      where: { groupId: auth.groupId, role: "MEMBER", isActive: true },
      include: {
        givingRecords: { where: { periodMonth: periodDate } },
      },
      orderBy: { fullName: "asc" },
    })
  );

  const groupTotalsByCategory: MonthlyReportData["groupTotalsByCategory"] = {};
  const consistencyBreakdown = emptyBreakdown();

  const memberRows: MemberReportRow[] = members.map((m) => {
    consistencyBreakdown[m.consistency] += 1;
    const byCategory: MemberReportRow["byCategory"] = {};
    let total = 0;

    for (const rec of m.givingRecords) {
      const amt = toNumber(rec.amount);
      byCategory[rec.category] = amt;
      total += amt;
      groupTotalsByCategory[rec.category] =
        (groupTotalsByCategory[rec.category] ?? 0) + amt;
    }

    return {
      id: m.id,
      name: m.fullName,
      consistency: m.consistency,
      total,
      byCategory,
    };
  });

  const categories = GIVING_CATEGORIES.map((cat) => ({
    category: cat.key,
    label: cat.label,
    amount: groupTotalsByCategory[cat.key] ?? 0,
    target: null,
    progress: null,
    projectDesc: null,
  }));

  const totalContributed = categories.reduce((sum, c) => sum + c.amount, 0);

  return {
    scope: "group",
    periodMonth,
    periodLabel: periodLabel(periodMonth),
    groupName: group?.name ?? "The Photizo Haven",
    generatedAt: new Date(),
    categories,
    totalContributed,
    members: memberRows,
    groupTotalsByCategory,
    consistencyBreakdown,
  };
}
