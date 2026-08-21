import type { Prisma } from '@prisma/client';

export async function syncStudentBadges(tx: Prisma.TransactionClient, studentId: string) {
  const [badges, approvedCounts, earnedBadges] = await Promise.all([
    tx.badge.findMany({
      select: { id: true, taskGroupId: true, threshold: true },
    }),
    tx.achievement.groupBy({
      by: ['taskGroupId'],
      where: {
        studentId,
        reviewStatus: 'APPROVED',
        taskGroupId: { not: null },
      },
      _count: { _all: true },
    }),
    tx.studentBadge.findMany({
      where: { studentId },
      select: { badgeId: true },
    }),
  ]);

  const countByTaskGroup = new Map(
    approvedCounts.map((item) => [item.taskGroupId, item._count._all])
  );
  const earnedIds = new Set(earnedBadges.map((item) => item.badgeId));
  // 徽章一旦达成条件就永久保留，之后成果被退回/删除也不收回
  const eligibleIds = new Set(
    badges
      .filter((badge) => (countByTaskGroup.get(badge.taskGroupId) ?? 0) >= badge.threshold)
      .map((badge) => badge.id)
  );

  for (const badgeId of eligibleIds) {
    if (!earnedIds.has(badgeId)) {
      await tx.studentBadge.upsert({
        where: { studentId_badgeId: { studentId, badgeId } },
        update: {},
        create: { studentId, badgeId },
      });
    }
  }
}
