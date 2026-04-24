import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// 安全的 JSON 解析，解析失败返回默认值
function safeJsonParse(str: string | null | undefined, fallback: unknown = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

router.get('/grades', async (req, res) => {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { id: 'asc' },
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

router.get('/task-groups', async (req, res) => {
  try {
    const taskGroups = await prisma.taskGroup.findMany({
      orderBy: { sortOrder: 'asc' },
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

router.get('/', async (req, res) => {
  try {
    const { gradeId, taskGroupId, search } = req.query;

    const where: any = { isActive: true };
    if (gradeId) where.gradeId = parseInt(gradeId as string);
    if (taskGroupId) where.taskGroupId = taskGroupId;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        taskGroup: {
          select: { id: true, name: true, icon: true },
        },
        grade: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ gradeId: 'asc' }, { semesterId: 'asc' }],
    });

    const data = courses.map((c) => ({
      id: c.id,
      title: c.title,
      emoji: c.emoji,
      color: c.color,
      description: c.description,
      objectives: safeJsonParse(c.objectives),
      materials: safeJsonParse(c.materials),
      steps: safeJsonParse(c.steps),
      safetyTips: c.safetyTips,
      coverSvg: c.coverSvg,
      coverImage: c.coverImage,
      grade: c.grade,
      taskGroup: c.taskGroup,
      semesterId: c.semesterId,
    }));

    res.json({
      code: 0,
      message: 'success',
      data,
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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        taskGroup: {
          select: { id: true, name: true, icon: true, type: true },
        },
        grade: {
          select: { id: true, name: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        code: 404,
        message: '课程不存在',
        data: null,
      });
    }

    const data = {
      id: course.id,
      title: course.title,
      emoji: course.emoji,
      color: course.color,
      description: course.description,
      objectives: safeJsonParse(course.objectives),
      materials: safeJsonParse(course.materials),
      steps: safeJsonParse(course.steps),
      safetyTips: course.safetyTips,
      coverSvg: course.coverSvg,
      coverImage: course.coverImage,
      grade: course.grade,
      taskGroup: course.taskGroup,
      semesterId: course.semesterId,
    };

    res.json({
      code: 0,
      message: 'success',
      data,
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      code: 500,
      message: '获取课程详情失败',
      data: null,
    });
  }
});

export default router;