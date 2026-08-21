import { PrismaClient } from '@prisma/client';
import { syncStudentBadges } from '../src/services/badges.js';

const prisma = new PrismaClient();

async function main() {
  const achievements = await prisma.achievement.findMany({
    where: { courseId: { not: null } },
    select: { id: true, courseId: true },
  });
  const courseIds = [...new Set(achievements.map((item) => item.courseId).filter((id): id is string => Boolean(id)))];
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true, taskGroupId: true },
  });
  const courseById = new Map(courses.map((course) => [course.id, course]));

  await prisma.$transaction(async (tx) => {
    for (const achievement of achievements) {
      const course = achievement.courseId ? courseById.get(achievement.courseId) : undefined;
      if (!course) continue;
      await tx.achievement.updateMany({
        where: { id: achievement.id, taskGroupId: null },
        data: { taskGroupId: course.taskGroupId },
      });
    }

    const students = await tx.student.findMany({ select: { id: true } });
    for (const student of students) {
      const [totalAchievements, receivedLikes] = await Promise.all([
        tx.achievement.count({ where: { studentId: student.id } }),
        tx.like.count({ where: { achievement: { studentId: student.id } } }),
      ]);
      await tx.student.update({
        where: { id: student.id },
        data: { totalAchievements, totalLikes: receivedLikes },
      });
      await syncStudentBadges(tx, student.id);
    }
  });

  const [achievementCount, approvedCount, badgeAwardCount] = await Promise.all([
    prisma.achievement.count(),
    prisma.achievement.count({ where: { reviewStatus: 'APPROVED' } }),
    prisma.studentBadge.count(),
  ]);
  console.log(JSON.stringify({ achievementCount, approvedCount, badgeAwardCount }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
