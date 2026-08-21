import { Router, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/admin.js';
import { DEFAULT_EVALUATION_DIMENSIONS, ensureEvaluationDimensions } from '../services/evaluationDimensions.js';
import {
  getAiPublicSettings,
  testAiConnection,
  updateAiSettings,
  type UpdateAiSettingsInput,
} from '../services/aiSettings.js';
import { assertPasswordStrength, parsePagination } from '../utils.js';
import { syncStudentBadges } from '../services/badges.js';

const router = Router();

// 所有 admin 路由都需要认证和管理员权限
router.use(authenticate);
router.use(requireAdmin);

// ==================== 用户管理 ====================

// 获取所有用户
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.student.findMany({
      select: {
        id: true,
        studentId: true,
        nickname: true,
        avatarEmoji: true,
        role: true,
        gradeId: true,
        classCode: true,
        totalAchievements: true,
        totalLikes: true,
        createdAt: true,
        grade: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      code: 0,
      message: 'success',
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      code: 500,
      message: '获取用户列表失败',
      data: null,
    });
  }
});

// 创建用户
router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { studentId, password, nickname, gradeId, classCode, role } = req.body;

    if (!studentId || !nickname || !gradeId || !classCode || !password) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息，并设置登录密码',
        data: null,
      });
    }

    try {
      assertPasswordStrength(String(password));
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: error instanceof Error ? error.message : '密码不符合要求',
        data: null,
      });
    }

    const existing = await prisma.student.findUnique({
      where: { studentId },
    });

    if (existing) {
      return res.status(400).json({
        code: 400,
        message: '该学籍号已存在',
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const nextRole = role === 'ADMIN' ? 'ADMIN' : 'STUDENT';

    const user = await prisma.student.create({
      data: {
        id: uuidv4(),
        studentId: String(studentId).trim(),
        password: hashedPassword,
        nickname: String(nickname).trim(),
        gradeId: parseInt(gradeId, 10),
        classCode: String(classCode).trim(),
        role: nextRole,
      },
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: {
        id: user.id,
        studentId: user.studentId,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      code: 500,
      message: '创建用户失败',
      data: null,
    });
  }
});

// 更新用户
router.put('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nickname, password, classCode, role } = req.body;
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      });
    }

    const updateData: { nickname?: string; classCode?: string; role?: 'STUDENT' | 'ADMIN'; password?: string } = {};
    if (nickname) updateData.nickname = String(nickname).trim();
    if (classCode) updateData.classCode = String(classCode).trim();
    if (role) {
      const nextRole = role === 'ADMIN' ? 'ADMIN' : role === 'STUDENT' ? 'STUDENT' : null;
      if (!nextRole) {
        return res.status(400).json({
          code: 400,
          message: '角色无效',
          data: null,
        });
      }
      if (existing.role === 'ADMIN' && nextRole !== 'ADMIN') {
        const adminCount = await prisma.student.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          return res.status(400).json({
            code: 400,
            message: '不能取消最后一个管理员',
            data: null,
          });
        }
      }
      updateData.role = nextRole;
    }
    if (password) {
      try {
        assertPasswordStrength(String(password));
      } catch (error) {
        return res.status(400).json({
          code: 400,
          message: error instanceof Error ? error.message : '密码不符合要求',
          data: null,
        });
      }
      updateData.password = await bcrypt.hash(String(password), 10);
    }

    const user = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: {
        id: user.id,
        studentId: user.studentId,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      code: 500,
      message: '更新用户失败',
      data: null,
    });
  }
});

// 删除用户
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({
        code: 400,
        message: '不能删除自己的账户',
        data: null,
      });
    }

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      });
    }

    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.student.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          code: 400,
          message: '不能删除最后一个管理员',
          data: null,
        });
      }
    }

    await prisma.student.delete({
      where: { id },
    });

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      code: 500,
      message: '删除用户失败',
      data: null,
    });
  }
});

// ==================== 课程管理 ====================

// 获取所有课程
router.get('/courses', async (req: AuthRequest, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        grade: true,
        taskGroup: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      code: 0,
      message: 'success',
      data: courses,
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      code: 500,
      message: '获取课程列表失败',
      data: null,
    });
  }
});

// 创建课程
router.post('/courses', async (req: AuthRequest, res) => {
  try {
    const {
      title, description, objectives, materials, steps, safetyTips,
      gradeId, semesterId, taskGroupId, emoji, color, coverImage, demoVideo, demoImages
    } = req.body;

    if (!title || !description || !gradeId || !taskGroupId) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息',
        data: null,
      });
    }

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        title,
        description,
        objectives: typeof objectives === 'string' ? objectives : JSON.stringify(objectives || []),
        materials: typeof materials === 'string' ? materials : JSON.stringify(materials || []),
        steps: typeof steps === 'string' ? steps : JSON.stringify(steps || []),
        safetyTips: safetyTips || '',
        gradeId: parseInt(gradeId),
        semesterId: semesterId || 1,
        taskGroupId,
        emoji: emoji || '🌱',
        color: color || '#E8F5E9',
        coverImage: coverImage || null,
        demoVideo: demoVideo || null,
        demoImages: typeof demoImages === 'string' ? demoImages : JSON.stringify(demoImages || []),
      },
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: course,
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      code: 500,
      message: '创建课程失败',
      data: null,
    });
  }
});

// 更新课程
router.put('/courses/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, objectives, materials, steps, safetyTips,
      gradeId, semesterId, taskGroupId, emoji, color, coverImage, demoVideo, demoImages, isActive
    } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (objectives) updateData.objectives = typeof objectives === 'string' ? objectives : JSON.stringify(objectives);
    if (materials) updateData.materials = typeof materials === 'string' ? materials : JSON.stringify(materials);
    if (steps) updateData.steps = typeof steps === 'string' ? steps : JSON.stringify(steps);
    if (safetyTips !== undefined) updateData.safetyTips = safetyTips;
    if (gradeId) updateData.gradeId = parseInt(gradeId);
    if (semesterId) updateData.semesterId = semesterId;
    if (taskGroupId) updateData.taskGroupId = taskGroupId;
    if (emoji) updateData.emoji = emoji;
    if (color) updateData.color = color;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (demoVideo !== undefined) updateData.demoVideo = demoVideo;
    if (demoImages !== undefined) updateData.demoImages = typeof demoImages === 'string' ? demoImages : JSON.stringify(demoImages);
    if (isActive !== undefined) updateData.isActive = isActive;

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: course,
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      code: 500,
      message: '更新课程失败',
      data: null,
    });
  }
});

// 删除课程
router.delete('/courses/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.course.delete({
      where: { id },
    });

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      code: 500,
      message: '删除课程失败',
      data: null,
    });
  }
});

// ==================== 成果管理 ====================

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const parseReviewStatus = (value: unknown): ReviewStatus | null => {
  const status = String(value || '').toUpperCase();
  return status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED'
    ? status
    : null;
};

const parseExpectedUpdatedAt = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const serializeAdminAchievement = <T extends {
  images: string;
  courseId: string | null;
  courseTitle: string | null;
  taskGroupId: string | null;
}>(achievement: T) => ({
  ...achievement,
  course: achievement.courseTitle
    ? {
        id: achievement.courseId,
        title: achievement.courseTitle,
        taskGroupId: achievement.taskGroupId,
      }
    : null,
  images: (() => {
    try {
      const images = JSON.parse(achievement.images);
      return Array.isArray(images) ? images : [];
    } catch {
      return [];
    }
  })(),
});

const reviewAchievementInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    status: ReviewStatus;
    reviewComment: string | null;
    expectedUpdatedAt: Date;
    reviewerId: string;
    syncBadges?: boolean;
  }
) => {
  const current = await tx.achievement.findUnique({
    where: { id: input.id },
    select: { id: true, studentId: true, updatedAt: true },
  });
  if (!current) throw new Error('NOT_FOUND');
  if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    throw new Error('CONFLICT');
  }

  const updated = await tx.achievement.updateMany({
    where: { id: input.id, updatedAt: input.expectedUpdatedAt },
    data: {
      reviewStatus: input.status,
      reviewComment: input.reviewComment,
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
    },
  });
  if (updated.count !== 1) throw new Error('CONFLICT');
  if (input.syncBadges !== false) await syncStudentBadges(tx, current.studentId);
  return current.studentId;
};

// 获取所有成果
router.get('/achievements', async (req: AuthRequest, res) => {
  try {
    const pageValue = Number.parseInt(String(req.query.page ?? '1'), 10);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSizeValue = req.query.pageSize ?? req.query.limit;
    const { limit: pageSize } = parsePagination(0, pageSizeValue, 100);
    const requestedStatus = req.query.status ?? req.query.reviewStatus;
    const normalizedRequestedStatus = typeof requestedStatus === 'string' ? requestedStatus.toLowerCase() : requestedStatus;
    const status = normalizedRequestedStatus && normalizedRequestedStatus !== 'all'
      ? parseReviewStatus(requestedStatus)
      : null;
    if (normalizedRequestedStatus && normalizedRequestedStatus !== 'all' && !status) {
      return res.status(400).json({ code: 400, message: '审核状态无效', data: null });
    }

    const where = status ? { reviewStatus: status } : {};
    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              nickname: true,
              avatarEmoji: true,
              gradeId: true,
              classCode: true,
            },
          },
          reviewedBy: {
            select: { id: true, studentId: true, nickname: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.achievement.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        data: achievements.map(serializeAdminAchievement),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      code: 500,
      message: '获取成果列表失败',
      data: null,
    });
  }
});

router.get('/achievements/:id', async (req: AuthRequest, res) => {
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { id: req.params.id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            nickname: true,
            avatarEmoji: true,
            gradeId: true,
            classCode: true,
            grade: { select: { id: true, name: true } },
          },
        },
        reviewedBy: { select: { id: true, studentId: true, nickname: true } },
        evaluations: {
          include: {
            student: { select: { id: true, studentId: true, nickname: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!achievement) {
      return res.status(404).json({ code: 404, message: '成果不存在', data: null });
    }
    res.json({ code: 0, message: 'success', data: serializeAdminAchievement(achievement) });
  } catch (error) {
    console.error('Get achievement detail error:', error);
    res.status(500).json({ code: 500, message: '获取成果详情失败', data: null });
  }
});

const reviewAchievementHandler = async (req: AuthRequest, res: Response) => {
  const status = parseReviewStatus(req.body.status ?? req.body.reviewStatus);
  const expectedUpdatedAt = parseExpectedUpdatedAt(req.body.expectedUpdatedAt);
  const reviewComment = typeof (req.body.reviewComment ?? req.body.comment) === 'string'
    ? String(req.body.reviewComment ?? req.body.comment).trim()
    : '';
  if (!status || status === 'PENDING') {
    return res.status(400).json({ code: 400, message: '审核结果必须为 APPROVED 或 REJECTED', data: null });
  }
  if (status === 'REJECTED' && (reviewComment.length < 5 || reviewComment.length > 500)) {
    return res.status(400).json({ code: 400, message: '驳回意见需为 5-500 字', data: null });
  }
  if (!expectedUpdatedAt) {
    return res.status(400).json({ code: 400, message: 'expectedUpdatedAt 无效或缺失', data: null });
  }

  try {
    await prisma.$transaction((tx) => reviewAchievementInTransaction(tx, {
      id: req.params.id,
      status,
      reviewComment: reviewComment || null,
      expectedUpdatedAt,
      reviewerId: req.student!.id,
    }));
    const achievement = await prisma.achievement.findUnique({
      where: { id: req.params.id },
      include: { reviewedBy: { select: { id: true, studentId: true, nickname: true } } },
    });
    res.json({ code: 0, message: status === 'APPROVED' ? '审核通过' : '已驳回', data: achievement });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return res.status(404).json({ code: 404, message: '成果不存在', data: null });
    }
    if (error instanceof Error && error.message === 'CONFLICT') {
      return res.status(409).json({ code: 409, message: '成果已被修改，请刷新后重试', data: null });
    }
    console.error('Review achievement error:', error);
    res.status(500).json({ code: 500, message: '审核失败', data: null });
  }
};

router.post('/achievements/:id/review', reviewAchievementHandler);
router.patch('/achievements/:id/review', reviewAchievementHandler);

router.post('/achievements/batch-review', async (req: AuthRequest, res) => {
  const rawItems: unknown[] = Array.isArray(req.body.items)
    ? req.body.items
    : Array.isArray(req.body.achievements)
      ? req.body.achievements
      : Array.isArray(req.body.ids)
        ? req.body.ids.map((id: unknown) => ({
            id,
            expectedUpdatedAt: req.body.expectedUpdatedAtById?.[String(id)] ?? req.body.expectedUpdatedAt,
          }))
        : [];
  const sharedStatus = parseReviewStatus(req.body.status ?? req.body.reviewStatus);
  const sharedComment = typeof (req.body.reviewComment ?? req.body.comment) === 'string'
    ? String(req.body.reviewComment ?? req.body.comment).trim()
    : '';
  if (rawItems.length === 0) {
    return res.status(400).json({ code: 400, message: '请选择要审核的成果', data: null });
  }
  if (rawItems.length > 100) {
    return res.status(400).json({ code: 400, message: '单次最多审核 100 条成果', data: null });
  }

  const items = rawItems.map((item: unknown) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const status = parseReviewStatus(value.status ?? value.reviewStatus) ?? sharedStatus;
    const commentValue = value.reviewComment ?? value.comment;
    const reviewComment = typeof commentValue === 'string' ? commentValue.trim() : sharedComment;
    return {
      id: typeof value.id === 'string' ? value.id : '',
      status,
      reviewComment,
      expectedUpdatedAt: parseExpectedUpdatedAt(value.expectedUpdatedAt),
    };
  });

  if (items.some((item) => !item.id || !item.expectedUpdatedAt || !item.status || item.status === 'PENDING')) {
    return res.status(400).json({ code: 400, message: '批量审核参数不完整', data: null });
  }
  if (items.some((item) => item.status === 'REJECTED' && (item.reviewComment.length < 5 || item.reviewComment.length > 500))) {
    return res.status(400).json({ code: 400, message: '驳回意见需为 5-500 字', data: null });
  }
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    return res.status(400).json({ code: 400, message: '批量审核包含重复成果', data: null });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const affectedStudentIds = new Set<string>();
      for (const item of items) {
        const studentId = await reviewAchievementInTransaction(tx, {
          id: item.id,
          status: item.status!,
          reviewComment: item.reviewComment || null,
          expectedUpdatedAt: item.expectedUpdatedAt!,
          reviewerId: req.student!.id,
          syncBadges: false,
        });
        affectedStudentIds.add(studentId);
      }
      for (const studentId of affectedStudentIds) {
        await syncStudentBadges(tx, studentId);
      }
    });
    res.json({ code: 0, message: '批量审核完成', data: { count: items.length, updated: items.length } });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return res.status(404).json({ code: 404, message: '部分成果不存在，未执行审核', data: null });
    }
    if (error instanceof Error && error.message === 'CONFLICT') {
      return res.status(409).json({ code: 409, message: '部分成果已被修改，请刷新后重试', data: null });
    }
    console.error('Batch review achievements error:', error);
    res.status(500).json({ code: 500, message: '批量审核失败', data: null });
  }
});

// 更新成果
router.put('/achievements/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isPublic, title, description } = req.body;

    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ code: 404, message: '成果不存在', data: null });
    }

    const updateData: Prisma.AchievementUpdateInput = {};
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (title !== undefined) {
      const nextTitle = String(title).trim();
      if (!nextTitle) return res.status(400).json({ code: 400, message: '成果标题不能为空', data: null });
      updateData.title = nextTitle;
    }
    if (description !== undefined) {
      const nextDescription = String(description).trim();
      if (!nextDescription) return res.status(400).json({ code: 400, message: '成果描述不能为空', data: null });
      updateData.description = nextDescription;
    }
    const substantiveChanged =
      (updateData.title !== undefined && updateData.title !== existing.title) ||
      (updateData.description !== undefined && updateData.description !== existing.description);
    if (substantiveChanged) {
      updateData.reviewStatus = 'PENDING';
      updateData.reviewComment = null;
      updateData.reviewedAt = null;
      updateData.reviewedBy = { disconnect: true };
    }

    const achievement = await prisma.$transaction(async (tx) => {
      if (substantiveChanged) {
        await Promise.all([
          tx.like.deleteMany({ where: { achievementId: id } }),
          tx.evaluation.deleteMany({ where: { achievementId: id } }),
        ]);
        if (existing.likesCount > 0) {
          await tx.student.update({
            where: { id: existing.studentId },
            data: { totalLikes: { decrement: existing.likesCount } },
          });
        }
        updateData.likesCount = 0;
        updateData.avgAttitude = 0;
        updateData.avgSkill = 0;
        updateData.avgResult = 0;
        updateData.evalCount = 0;
      }
      const updated = await tx.achievement.update({ where: { id }, data: updateData });
      await syncStudentBadges(tx, existing.studentId);
      return updated;
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: achievement,
    });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '更新成果失败',
      data: null,
    });
  }
});

// 删除成果
router.delete('/achievements/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在',
        data: null,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.achievement.delete({ where: { id } });
      await tx.student.update({
        where: { id: achievement.studentId },
        data: {
          totalAchievements: { decrement: 1 },
          totalLikes: { decrement: achievement.likesCount },
        },
      });
      await syncStudentBadges(tx, achievement.studentId);
    });

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '删除成果失败',
      data: null,
    });
  }
});

// ==================== 任务群管理 ====================

// 获取所有任务群
router.get('/task-groups', async (req: AuthRequest, res) => {
  try {
    const taskGroups = await prisma.taskGroup.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      code: 0,
      message: 'success',
      data: taskGroups,
    });
  } catch (error) {
    console.error('Get task groups error:', error);
    res.status(500).json({
      code: 500,
      message: '获取任务群列表失败',
      data: null,
    });
  }
});

// ==================== 年级管理 ====================

// 获取所有年级
router.get('/grades', async (req: AuthRequest, res) => {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { id: 'asc' }
    });

    res.json({
      code: 0,
      message: 'success',
      data: grades,
    });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({
      code: 500,
      message: '获取年级列表失败',
      data: null,
    });
  }
});

// ==================== 统计信息 ====================

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [totalUsers, totalCourses, totalAchievements, totalLikes, pendingAchievements] = await Promise.all([
      prisma.student.count(),
      prisma.course.count(),
      prisma.achievement.count(),
      prisma.like.count(),
      prisma.achievement.count({ where: { reviewStatus: 'PENDING' } }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        totalUsers,
        totalCourses,
        totalAchievements,
        totalLikes,
        pendingAchievements,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      code: 500,
      message: '获取统计信息失败',
      data: null,
    });
  }
});

// ==================== 评价维度配置 ====================

router.get('/evaluation-dimensions', async (req: AuthRequest, res) => {
  try {
    const dimensions = await ensureEvaluationDimensions();

    res.json({
      code: 0,
      message: 'success',
      data: dimensions,
    });
  } catch (error) {
    console.error('Get evaluation dimensions error:', error);
    res.status(500).json({
      code: 500,
      message: '获取评价维度失败',
      data: null,
    });
  }
});

router.put('/evaluation-dimensions', async (req: AuthRequest, res) => {
  try {
    const { dimensions } = req.body as {
      dimensions?: Array<{
        key?: string;
        label?: string;
        description?: string;
        prompt?: string;
        weight?: number;
        sortOrder?: number;
        isEnabled?: boolean;
      }>;
    };

    if (!Array.isArray(dimensions) || dimensions.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提交评价维度配置',
        data: null,
      });
    }

    const allowedKeys = DEFAULT_EVALUATION_DIMENSIONS.map((dimension) => dimension.key);
    const incomingKeys = dimensions.map((dimension) => dimension.key);
    const hasAllRequiredKeys = allowedKeys.every((key) => incomingKeys.includes(key));

    if (!hasAllRequiredKeys) {
      return res.status(400).json({
        code: 400,
        message: '评价维度必须包含态度、技能、成果三项',
        data: null,
      });
    }

    for (const dimension of dimensions) {
      const defaultDimension = DEFAULT_EVALUATION_DIMENSIONS.find((item) => item.key === dimension.key);
      if (!defaultDimension) {
        return res.status(400).json({
          code: 400,
          message: `不支持的评价维度：${dimension.key || '未知'}`,
          data: null,
        });
      }

      if (!dimension.label?.trim() || !dimension.description?.trim() || !dimension.prompt?.trim()) {
        return res.status(400).json({
          code: 400,
          message: '维度名称、说明和 AI 提示词不能为空',
          data: null,
        });
      }

      const normalizedWeight = Number(dimension.weight);
      if (!Number.isFinite(normalizedWeight) || normalizedWeight <= 0) {
        return res.status(400).json({
          code: 400,
          message: '维度权重必须是大于 0 的数字',
          data: null,
        });
      }
    }

    await Promise.all(
      dimensions.map((dimension) => {
        const defaultDimension = DEFAULT_EVALUATION_DIMENSIONS.find((item) => item.key === dimension.key)!;
        return prisma.evaluationDimension.upsert({
          where: { key: defaultDimension.key },
          update: {
            label: dimension.label!.trim(),
            description: dimension.description!.trim(),
            prompt: dimension.prompt!.trim(),
            weight: Number(dimension.weight),
            sortOrder: Number.isFinite(Number(dimension.sortOrder)) ? Number(dimension.sortOrder) : defaultDimension.sortOrder,
            isEnabled: dimension.isEnabled !== false,
          },
          create: {
            key: defaultDimension.key,
            label: dimension.label!.trim(),
            description: dimension.description!.trim(),
            prompt: dimension.prompt!.trim(),
            weight: Number(dimension.weight),
            sortOrder: Number.isFinite(Number(dimension.sortOrder)) ? Number(dimension.sortOrder) : defaultDimension.sortOrder,
            isEnabled: dimension.isEnabled !== false,
          },
        });
      })
    );

    const updated = await ensureEvaluationDimensions();

    res.json({
      code: 0,
      message: '评价维度已更新',
      data: updated,
    });
  } catch (error) {
    console.error('Update evaluation dimensions error:', error);
    res.status(500).json({
      code: 500,
      message: '更新评价维度失败',
      data: null,
    });
  }
});

router.post('/evaluation-dimensions/reset', async (req: AuthRequest, res) => {
  try {
    await Promise.all(
      DEFAULT_EVALUATION_DIMENSIONS.map((dimension) =>
        prisma.evaluationDimension.upsert({
          where: { key: dimension.key },
          update: dimension,
          create: dimension,
        })
      )
    );

    const dimensions = await ensureEvaluationDimensions();

    res.json({
      code: 0,
      message: '已恢复默认评价维度',
      data: dimensions,
    });
  } catch (error) {
    console.error('Reset evaluation dimensions error:', error);
    res.status(500).json({
      code: 500,
      message: '恢复默认评价维度失败',
      data: null,
    });
  }
});

// ==================== AI 服务对接配置 ====================

router.get('/ai-settings', async (_req: AuthRequest, res) => {
  try {
    const settings = await getAiPublicSettings();
    res.json({
      code: 0,
      message: 'success',
      data: settings,
    });
  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({
      code: 500,
      message: '获取 AI 配置失败',
      data: null,
    });
  }
});

router.put('/ai-settings', async (req: AuthRequest, res) => {
  try {
    const body = req.body as UpdateAiSettingsInput;

    if (body.provider && body.provider !== 'custom' && body.provider !== 'openai_compatible') {
      return res.status(400).json({
        code: 400,
        message: '不支持的 AI 提供方',
        data: null,
      });
    }

    if (body.temperature !== undefined) {
      const temperature = Number(body.temperature);
      if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
        return res.status(400).json({
          code: 400,
          message: 'temperature 需要在 0 到 2 之间',
          data: null,
        });
      }
    }

    if (body.thinkingLevel !== undefined) {
      const level = String(body.thinkingLevel).trim().toLowerCase();
      if (!['off', 'low', 'medium', 'high'].includes(level)) {
        return res.status(400).json({
          code: 400,
          message: '思考等级需为 off / low / medium / high',
          data: null,
        });
      }
    }

    const settings = await updateAiSettings(body);
    res.json({
      code: 0,
      message: 'AI 配置已保存',
      data: settings,
    });
  } catch (error) {
    console.error('Update AI settings error:', error);
    res.status(400).json({
      code: 400,
      message: error instanceof Error ? error.message : '保存 AI 配置失败',
      data: null,
    });
  }
});

router.post('/ai-settings/test', async (_req: AuthRequest, res) => {
  try {
    const result = await testAiConnection();
    res.json({
      code: result.ok ? 0 : 400,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Test AI settings error:', error);
    res.status(500).json({
      code: 500,
      message: '测试 AI 连接失败',
      data: null,
    });
  }
});

export default router;
