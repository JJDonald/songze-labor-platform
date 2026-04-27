import { Router } from 'express';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

const router = Router();

const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未登录',
        data: null,
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string };

    const student = await prisma.student.findUnique({
      where: { id: decoded.studentId },
    });

    if (!student) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        data: null,
      });
    }

    req.student = student;
    next();
  } catch (error) {
    res.status(401).json({
      code: 401,
      message: '登录已过期',
      data: null,
    });
  }
};

router.get('/:id/profile', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (req.student.id !== id) {
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

    const allBadges = await prisma.badge.findMany();

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
      course: { title: '劳动项目', emoji: '📝' },
      title: a.title,
      description: a.description,
      images: a.images ? JSON.parse(a.images) : [],
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

router.get('/my-achievements', authMiddleware, async (req: any, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { studentId: req.student.id },
      orderBy: { createdAt: 'desc' },
    });

    const data = achievements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      images: a.images ? JSON.parse(a.images) : [],
      isPublic: a.isPublic,
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