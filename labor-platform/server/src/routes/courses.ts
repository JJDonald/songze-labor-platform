import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
      objectives: c.objectives ? JSON.parse(c.objectives) : [],
      materials: c.materials ? JSON.parse(c.materials) : [],
      steps: c.steps ? JSON.parse(c.steps) : [],
      safetyTips: c.safetyTips,
      coverSvg: c.coverSvg,
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
      objectives: course.objectives ? JSON.parse(course.objectives) : [],
      materials: course.materials ? JSON.parse(course.materials) : [],
      steps: course.steps ? JSON.parse(course.steps) : [],
      safetyTips: course.safetyTips,
      coverSvg: course.coverSvg,
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