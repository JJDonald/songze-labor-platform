import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate, type AuthRequest } from '../middleware/admin.js';
import { safeJsonParse } from '../utils.js';

const router = Router();

router.get('/:id/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.student!.id !== id && req.student!.role !== 'ADMIN') {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        data: null,
      });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        grade: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      });
    }

    const achievements = await prisma.achievement.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const evalStats = await prisma.achievement.aggregate({
      where: { studentId: id },
      _avg: {
        evalAttitude: true,
        evalSkill: true,
        evalResult: true,
      },
    });

    const badges = await prisma.studentBadge.findMany({
      where: { studentId: id },
      include: {
        badge: true,
      },
    });

    const allBadges = await prisma.badge.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const approvedCounts = await prisma.achievement.groupBy({
      by: ['taskGroupId'],
      where: {
        studentId: id,
        reviewStatus: 'APPROVED',
        taskGroupId: { not: null },
      },
      _count: { _all: true },
    });
    const progressByTaskGroup = new Map(
      approvedCounts.map((item) => [item.taskGroupId, item._count._all])
    );

    const profile = {
      id: student.id,
      nickname: student.nickname,
      avatarEmoji: student.avatarEmoji,
      grade: student.grade,
      classCode: student.classCode,
      stats: {
        totalAchievements: student.totalAchievements,
        totalLikes: student.totalLikes,
        totalBadges: badges.length,
      },
      evalAverage: {
        attitude: evalStats._avg.evalAttitude || 0,
        skill: evalStats._avg.evalSkill || 0,
        result: evalStats._avg.evalResult || 0,
      },
    };

    const timeline = achievements.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      course: { title: a.courseTitle || '劳动项目', emoji: '📝', taskGroupId: a.taskGroupId || 'other' },
      title: a.title,
      description: a.description,
      reflection: a.reflection,
      images: safeJsonParse<string[]>(a.images, []),
      isPublic: a.isPublic,
      reviewStatus: a.reviewStatus,
      reviewComment: a.reviewComment,
      reviewedAt: a.reviewedAt,
      evalAttitude: a.evalAttitude,
      evalSkill: a.evalSkill,
      evalResult: a.evalResult,
      likesCount: a.likesCount,
      isLikedByMe: false,
    }));

    const badgeStatus = allBadges.map((b) => {
      const earned = badges.find((sb) => sb.badgeId === b.id);
      return {
        id: b.id,
        name: b.name,
        emoji: b.emoji,
        description: b.description,
        key: b.key,
        taskGroupId: b.taskGroupId,
        threshold: b.threshold,
        progress: progressByTaskGroup.get(b.taskGroupId) ?? 0,
        remaining: Math.max(0, b.threshold - (progressByTaskGroup.get(b.taskGroupId) ?? 0)),
        earned: !!earned,
        earnedAt: earned?.earnedAt || null,
      };
    });

    res.json({
      code: 0,
      message: 'success',
      data: {
        profile,
        timeline,
        badges: badgeStatus,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      code: 500,
      message: '获取个人档案失败',
      data: null,
    });
  }
});

router.get('/my-achievements', authenticate, async (req: AuthRequest, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { studentId: req.student!.id },
      orderBy: { createdAt: 'desc' },
    });

    const data = achievements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      reflection: a.reflection,
      images: safeJsonParse<string[]>(a.images, []),
      isPublic: a.isPublic,
      reviewStatus: a.reviewStatus,
      reviewComment: a.reviewComment,
      reviewedAt: a.reviewedAt,
      evalAttitude: a.evalAttitude,
      evalSkill: a.evalSkill,
      evalResult: a.evalResult,
      likesCount: a.likesCount,
      createdAt: a.createdAt,
    }));

    res.json({
      code: 0,
      message: 'success',
      data,
    });
  } catch (error) {
    console.error('Get my achievements error:', error);
    res.status(500).json({
      code: 500,
      message: '获取我的成果失败',
      data: null,
    });
  }
});

export default router;
