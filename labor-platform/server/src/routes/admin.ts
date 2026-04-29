import { Router } from 'express';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/admin.js';

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

    if (!studentId || !nickname || !gradeId || !classCode) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息',
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

    const hashedPassword = await bcrypt.hash(password || '123456', 10);

    const user = await prisma.student.create({
      data: {
        id: uuidv4(),
        studentId,
        password: hashedPassword,
        nickname,
        gradeId: parseInt(gradeId),
        classCode,
        role: role || 'STUDENT',
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

    const updateData: any = {};
    if (nickname) updateData.nickname = nickname;
    if (classCode) updateData.classCode = classCode;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
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

// 获取所有成果
router.get('/achievements', async (req: AuthRequest, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            nickname: true,
            avatarEmoji: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      code: 0,
      message: 'success',
      data: achievements,
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

// 更新成果
router.put('/achievements/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isPublic, title, description } = req.body;

    const updateData: any = {};
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    const achievement = await prisma.achievement.update({
      where: { id },
      data: updateData,
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

    await prisma.achievement.delete({
      where: { id },
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
    const [totalUsers, totalCourses, totalAchievements, totalLikes] = await Promise.all([
      prisma.student.count(),
      prisma.course.count(),
      prisma.achievement.count(),
      prisma.like.count(),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        totalUsers,
        totalCourses,
        totalAchievements,
        totalLikes,
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

export default router;