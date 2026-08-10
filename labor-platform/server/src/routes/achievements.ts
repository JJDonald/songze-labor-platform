import { Router } from 'express';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET } from '../config.js';
import { enabledEvaluationDimensions, normalizeScore } from '../services/evaluationDimensions.js';
import { evaluateAchievementWithAgent } from '../services/aiEvaluation.js';

const router = Router();

const recalculateEvaluationAverages = async (achievementId: string) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { achievementId },
  });

  if (evaluations.length === 0) {
    return prisma.achievement.update({
      where: { id: achievementId },
      data: {
        avgAttitude: 0,
        avgSkill: 0,
        avgResult: 0,
        evalCount: 0,
      },
    });
  }

  const avgAttitude = evaluations.reduce((sum, e) => sum + e.attitude, 0) / evaluations.length;
  const avgSkill = evaluations.reduce((sum, e) => sum + e.skill, 0) / evaluations.length;
  const avgResult = evaluations.reduce((sum, e) => sum + e.result, 0) / evaluations.length;

  return prisma.achievement.update({
    where: { id: achievementId },
    data: {
      avgAttitude,
      avgSkill,
      avgResult,
      evalCount: evaluations.length,
    },
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF 格式的图片'));
    }
  },
});

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

router.get('/', async (req, res) => {
  try {
    const { taskGroupId, page = '0', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = { isPublic: true };

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              nickname: true,
              avatarEmoji: true,
              gradeId: true,
              classCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pageNum * limitNum,
        take: limitNum,
      }),
      prisma.achievement.count({ where }),
    ]);

    let currentStudentId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string };
        currentStudentId = decoded.studentId;
      } catch (error) {
        currentStudentId = null;
      }
    }

    let likedAchievementIds: string[] = [];
    if (currentStudentId) {
      const likes = await prisma.like.findMany({
        where: {
          studentId: currentStudentId,
          achievementId: { in: achievements.map((a) => a.id) },
        },
        select: { achievementId: true },
      });
      likedAchievementIds = likes.map((l: { achievementId: string }) => l.achievementId);
    }

    const data = achievements.map((a: any) => ({
      id: a.id,
      student: a.student,
      course: a.courseTitle ? { title: a.courseTitle, taskGroupId: 'other' } : null,
      title: a.title,
      description: a.description,
      images: a.images ? JSON.parse(a.images) : [],
      evalAttitude: a.evalAttitude,
      evalSkill: a.evalSkill,
      evalResult: a.evalResult,
      avgAttitude: a.avgAttitude,
      avgSkill: a.avgSkill,
      avgResult: a.avgResult,
      evalCount: a.evalCount,
      likesCount: a.likesCount,
      createdAt: a.createdAt,
      isLikedByMe: likedAchievementIds.includes(a.id),
    }));

    res.json({
      code: 0,
      message: 'success',
      data: { data, total },
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

router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { title, description, reflection, images, isPublic, evalAttitude, evalSkill, evalResult, courseId, courseTitle } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        code: 400,
        message: '请填写成果标题和描述',
        data: null,
      });
    }

    const achievement = await prisma.achievement.create({
      data: {
        id: uuidv4(),
        studentId: req.student.id,
        courseId: courseId || null,
        courseTitle: courseTitle || null,
        title,
        description,
        reflection: reflection || null,
        images: images ? JSON.stringify(images) : '[]',
        isPublic: isPublic !== false,
        evalAttitude: evalAttitude || 0,
        evalSkill: evalSkill || 0,
        evalResult: evalResult || 0,
      },
    });

    await prisma.student.update({
      where: { id: req.student.id },
      data: { totalAchievements: { increment: 1 } },
    });

    res.json({
      code: 0,
      message: '成果提交成功',
      data: achievement,
    });
  } catch (error) {
    console.error('Create achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '提交成果失败',
      data: null,
    });
  }
});

router.post('/:id/like', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;

    const existingLike = await prisma.like.findUnique({
      where: {
        studentId_achievementId: {
          studentId: req.student.id,
          achievementId: id,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      await prisma.achievement.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });
      res.json({
        code: 0,
        message: '取消点赞成功',
        data: { liked: false },
      });
    } else {
      await prisma.like.create({
        data: {
          id: uuidv4(),
          studentId: req.student.id,
          achievementId: id,
        },
      });
      await prisma.achievement.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      const achievement = await prisma.achievement.findUnique({
        where: { id },
        select: { studentId: true },
      });
      if (achievement) {
        await prisma.student.update({
          where: { id: achievement.studentId },
          data: { totalLikes: { increment: 1 } },
        });
      }

      res.json({
        code: 0,
        message: '点赞成功',
        data: { liked: true },
      });
    }
  } catch (error) {
    console.error('Like achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '操作失败',
      data: null,
    });
  }
});

router.post('/upload', authMiddleware, upload.single('image'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({
      code: 400,
      message: '请选择图片',
      data: null,
    });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({
    code: 0,
    message: '上传成功',
    data: { url: imageUrl },
  });
});

router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, reflection, images, isPublic, evalAttitude, evalSkill, evalResult } = req.body;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在',
        data: null,
      });
    }

    if (achievement.studentId !== req.student.id) {
      return res.status(403).json({
        code: 403,
        message: '无权编辑此成果',
        data: null,
      });
    }

    const updated = await prisma.achievement.update({
      where: { id },
      data: {
        title: title || achievement.title,
        description: description || achievement.description,
        reflection: reflection !== undefined ? reflection : achievement.reflection,
        images: images ? JSON.stringify(images) : achievement.images,
        isPublic: isPublic !== undefined ? isPublic : achievement.isPublic,
        evalAttitude: evalAttitude !== undefined ? evalAttitude : achievement.evalAttitude,
        evalSkill: evalSkill !== undefined ? evalSkill : achievement.evalSkill,
        evalResult: evalResult !== undefined ? evalResult : achievement.evalResult,
      },
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '更新失败',
      data: null,
    });
  }
});

router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在',
        data: null,
      });
    }

    if (achievement.studentId !== req.student.id) {
      return res.status(403).json({
        code: 403,
        message: '无权删除此成果',
        data: null,
      });
    }

    await prisma.like.deleteMany({
      where: { achievementId: id },
    });

    await prisma.achievement.delete({
      where: { id },
    });

    await prisma.student.update({
      where: { id: req.student.id },
      data: { totalAchievements: { decrement: 1 } },
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
      message: '删除失败',
      data: null,
    });
  }
});

// 获取成果详情（包含评价信息）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            nickname: true,
            avatarEmoji: true,
            gradeId: true,
            classCode: true,
          },
        },
      },
    });

    if (!achievement) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在',
        data: null,
      });
    }

    // 获取当前用户
    let currentStudentId: string | null = null;
    let myEvaluation: any = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string };
        currentStudentId = decoded.studentId;

        // 获取当前用户的评价
        myEvaluation = await prisma.evaluation.findUnique({
          where: {
            studentId_achievementId: {
              studentId: currentStudentId,
              achievementId: id,
            },
          },
        });
      } catch (error) {
        currentStudentId = null;
      }
    }

    // 检查是否点赞
    let isLikedByMe = false;
    if (currentStudentId) {
      const like = await prisma.like.findUnique({
        where: {
          studentId_achievementId: {
            studentId: currentStudentId,
            achievementId: id,
          },
        },
      });
      isLikedByMe = !!like;
    }

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: achievement.id,
        student: achievement.student,
        course: achievement.courseTitle ? { title: achievement.courseTitle, taskGroupId: 'other' } : null,
        title: achievement.title,
        description: achievement.description,
        reflection: achievement.reflection,
        images: achievement.images ? JSON.parse(achievement.images) : [],
        evalAttitude: achievement.evalAttitude,
        evalSkill: achievement.evalSkill,
        evalResult: achievement.evalResult,
        avgAttitude: achievement.avgAttitude,
        avgSkill: achievement.avgSkill,
        avgResult: achievement.avgResult,
        evalCount: achievement.evalCount,
        likesCount: achievement.likesCount,
        createdAt: achievement.createdAt,
        isLikedByMe,
        myEvaluation: myEvaluation ? {
          attitude: myEvaluation.attitude,
          skill: myEvaluation.skill,
          result: myEvaluation.result,
        } : null,
        isOwner: currentStudentId === achievement.studentId,
        evaluationDimensions: await enabledEvaluationDimensions(),
      },
    });
  } catch (error) {
    console.error('Get achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '获取成果详情失败',
      data: null,
    });
  }
});

// 提交或更新评价
router.post('/:id/evaluate', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { attitude, skill, result } = req.body;

    if (!attitude || !skill || !result) {
      return res.status(400).json({
        code: 400,
        message: '请完成所有评分',
        data: null,
      });
    }

    if (attitude < 1 || attitude > 5 || skill < 1 || skill > 5 || result < 1 || result > 5) {
      return res.status(400).json({
        code: 400,
        message: '评分必须在1-5之间',
        data: null,
      });
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在',
        data: null,
      });
    }

    // 不能评价自己的成果
    if (achievement.studentId === req.student.id) {
      return res.status(400).json({
        code: 400,
        message: '不能评价自己的成果',
        data: null,
      });
    }

    // 检查是否已评价
    const existingEvaluation = await prisma.evaluation.findUnique({
      where: {
        studentId_achievementId: {
          studentId: req.student.id,
          achievementId: id,
        },
      },
    });

    if (existingEvaluation) {
      // 更新评价
      await prisma.evaluation.update({
        where: { id: existingEvaluation.id },
        data: { attitude, skill, result },
      });
    } else {
      // 创建新评价
      await prisma.evaluation.create({
        data: {
          id: uuidv4(),
          studentId: req.student.id,
          achievementId: id,
          attitude,
          skill,
          result,
        },
      });
    }

    const updatedAchievement = await recalculateEvaluationAverages(id);

    res.json({
      code: 0,
      message: existingEvaluation ? '评价已更新' : '评价成功',
      data: {
        avgAttitude: updatedAchievement.avgAttitude,
        avgSkill: updatedAchievement.avgSkill,
        avgResult: updatedAchievement.avgResult,
        evalCount: updatedAchievement.evalCount,
      },
    });
  } catch (error) {
    console.error('Evaluate achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '评价失败',
      data: null,
    });
  }
});

// 使用 AI 智能体生成评价建议
router.post('/:id/ai-evaluate', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在',
        data: null,
      });
    }

    if (achievement.studentId === req.student.id) {
      return res.status(400).json({
        code: 400,
        message: '不能评价自己的成果',
        data: null,
      });
    }

    const dimensions = await enabledEvaluationDimensions();
    const aiResult = await evaluateAchievementWithAgent(achievement, dimensions);
    const attitude = normalizeScore(aiResult.scores.attitude);
    const skill = normalizeScore(aiResult.scores.skill);
    const result = normalizeScore(aiResult.scores.result);

    if (!attitude || !skill || !result) {
      return res.status(500).json({
        code: 500,
        message: 'AI 智能体返回的评分无效',
        data: null,
      });
    }

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: {
        studentId_achievementId: {
          studentId: req.student.id,
          achievementId: id,
        },
      },
    });

    if (existingEvaluation) {
      await prisma.evaluation.update({
        where: { id: existingEvaluation.id },
        data: { attitude, skill, result },
      });
    } else {
      await prisma.evaluation.create({
        data: {
          id: uuidv4(),
          studentId: req.student.id,
          achievementId: id,
          attitude,
          skill,
          result,
        },
      });
    }

    const updatedAchievement = await recalculateEvaluationAverages(id);

    res.json({
      code: 0,
      message: aiResult.source === 'agent' ? 'AI 智能体评价完成' : '已生成本地智能评价',
      data: {
        scores: { attitude, skill, result },
        summary: aiResult.summary,
        suggestions: aiResult.suggestions,
        source: aiResult.source,
        avgAttitude: updatedAchievement.avgAttitude,
        avgSkill: updatedAchievement.avgSkill,
        avgResult: updatedAchievement.avgResult,
        evalCount: updatedAchievement.evalCount,
      },
    });
  } catch (error) {
    console.error('AI evaluate achievement error:', error);
    res.status(500).json({
      code: 500,
      message: 'AI 智能体评价失败',
      data: null,
    });
  }
});

export default router;
