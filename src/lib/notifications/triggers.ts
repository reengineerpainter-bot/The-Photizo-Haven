import { prisma } from "@/lib/db/prisma";

const LAPSE_DAYS = 30;

export async function checkLapseAndMilestone(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      givingRecords: { orderBy: { recordedAt: "desc" }, take: 6 },
    },
  });

  if (!user) return;

  const now = Date.now();
  const lastGiving = user.lastGivingAt?.getTime() ?? 0;
  const daysSince = (now - lastGiving) / (1000 * 60 * 60 * 24);

  if (daysSince > LAPSE_DAYS) {
    await prisma.user.update({
      where: { id: userId },
      data: { consistency: "LAPSED" },
    });

    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: "LAPSED_MEMBER",
        triggeredAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          type: "LAPSED_MEMBER",
          title: "We miss your giving update",
          body: `It's been over ${LAPSE_DAYS} days since your last contribution. Log your giving to stay on track.`,
        },
      });
    }
    return;
  }

  const recentMonths = new Set(
    user.givingRecords.map((r) => r.periodMonth.toISOString().slice(0, 7))
  );

  if (recentMonths.size >= 6) {
    await prisma.user.update({
      where: { id: userId },
      data: { consistency: "OUTSTANDING" },
    });

    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: "OUTSTANDING_MEMBER",
        triggeredAt: { gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          type: "OUTSTANDING_MEMBER",
          title: "Outstanding consistency!",
          body: "You've maintained exceptional giving consistency. Keep shining!",
        },
      });
    }
  } else if (daysSince > 14) {
    await prisma.user.update({
      where: { id: userId },
      data: { consistency: "LAGGING" },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { consistency: "CONSISTENT" },
    });
  }
}

export async function runNightlyLapseCheck(): Promise<void> {
  const cutoff = new Date(Date.now() - LAPSE_DAYS * 24 * 60 * 60 * 1000);
  const lapsed = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      isActive: true,
      OR: [{ lastGivingAt: null }, { lastGivingAt: { lt: cutoff } }],
    },
  });

  for (const user of lapsed) {
    await checkLapseAndMilestone(user.id);
  }
}
