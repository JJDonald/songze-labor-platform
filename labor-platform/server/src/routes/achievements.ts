import { Router } from 'express';
import prisma from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, optionalAuthenticate, rateLimit, type AuthRequest } from '../middleware/admin.js';
import { enabledEvaluationDimensions, normalizeScore } from '../services/evaluationDimensions.js';
import { evaluateAchievementWithAgent } from '../services/aiEvaluation.js';
import { studentImageUpload } from '../upload.js';
import { clampScore, parsePagination, requireCompleteSelfScores, safeJsonParse } from '../utils.js';
import { syncStudentBadges } from '../services/badges.js';

const router = Router();

const parseImages = (images: string | null | undefined) =>
  safeJsonParse<string[]>(images, []).filter((item) => typeof item === 'string');

const loadCourseMap = async (courseIds: Array<string | null | undefined>) => {
  const ids = [...new Set(courseIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, { id: string; title: string; taskGroupId: string }>();
  const courses = await prisma.course.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, taskGroupId: true },
  });
  return new Map(courses.map((course) => [course.id, course]));
};

const serializeCourse = (
  courseId: string | null,
  courseTitle: string | null,
  taskGroupId: string | null,
  courseMap: Map<string, { id: string; title: string; taskGroupId: string }>
) => {
  const course = courseId ? courseMap.get(courseId) : undefined;
  if (course) {
    return { title: courseTitle || course.title, taskGroupId: taskGroupId || course.taskGroupId };
  }
  if (courseTitle) {
    return { title: courseTitle, taskGroupId: taskGroupId || 'other' };
  }
  return null;
};

const canViewAchievement = (
  achievement: { isPublic: boolean; reviewStatus: string; studentId: string },
  user?: { id: string; role: string }
) => {
  if (user && (user.role === 'ADMIN' || user.id === achievement.studentId)) return true;
  return achievement.reviewStatus === 'APPROVED' && achievement.isPublic;
};

const isPubliclyInteractive = (achievement: { isPublic: boolean; reviewStatus: string }) =>
  achievement.reviewStatus === 'APPROVED' && achievement.isPublic;

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

router.get('/', optionalAuthenticate, async (req: AuthRequest, res) => {
  try {
    const { taskGroupId } = req.query;
    const { page, limit } = parsePagination(req.query.page, req.query.limit);
    const where: {
      isPublic: boolean;
      reviewStatus: 'APPROVED';
      taskGroupId?: string;
    } = { isPublic: true, reviewStatus: 'APPROVED' };

    if (typeof taskGroupId === 'string' && taskGroupId && taskGroupId !== 'all') {
      where.taskGroupId = taskGroupId;
    }

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
        skip: page * limit,
        take: limit,
      }),
      prisma.achievement.count({ where }),
    ]);

    const currentStudentId = req.user?.id ?? null;
    let likedAchievementIds: string[] = [];
    if (currentStudentId) {
      const likes = await prisma.like.findMany({
        where: {
          studentId: currentStudentId,
          achievementId: { in: achievements.map((a) => a.id) },
        },
        select: { achievementId: true },
      });
      likedAchievementIds = likes.map((like) => like.achievementId);
    }

    const courseMap = await loadCourseMap(achievements.map((a) => a.courseId));
    const data = achievements.map((a) => ({
      id: a.id,
      student: a.student,
      course: serializeCourse(a.courseId, a.courseTitle, a.taskGroupId, courseMap),
      title: a.title,
      description: a.description,
      images: parseImages(a.images),
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

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description, reflection, images, isPublic, evalAttitude, evalSkill, evalResult, courseId } = req.body;

    if (!title || !description || !courseId) {
      return res.status(400).json({
        code: 400,
        message: '请填写成果标题、描述并选择课程',
        data: null,
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: String(courseId) },
      select: { id: true, title: true, taskGroupId: true },
    });
    if (!course) {
      return res.status(400).json({
        code: 400,
        message: '课程不存在',
        data: null,
      });
    }

    let scores;
    try {
      scores = requireCompleteSelfScores(evalAttitude, evalSkill, evalResult);
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: error instanceof Error ? error.message : '请完成自我评价',
        data: null,
      });
    }

    const safeImages = Array.isArray(images) ? images.filter((item) => typeof item === 'string') : [];
    const achievement = await prisma.$transaction(async (tx) => {
      const created = await tx.achievement.create({
        data: {
          id: uuidv4(),
          studentId: req.student!.id,
          courseId: course.id,
          courseTitle: course.title,
          taskGroupId: course.taskGroupId,
          title: String(title).trim(),
          description: String(description).trim(),
          reflection: reflection ? String(reflection).trim() : null,
          images: JSON.stringify(safeImages),
          isPublic: isPublic !== false,
          reviewStatus: 'PENDING',
          ...scores,
        },
      });
      await tx.student.update({
        where: { id: req.student!.id },
        data: { totalAchievements: { increment: 1 } },
      });
      return created;
    });

    res.json({
      code: 0,
      message: '成果已提交，等待审核',
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

router.post('/:id/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const achievement = await prisma.achievement.findUnique({
      where: { id },
      select: { id: true, isPublic: true, reviewStatus: true, studentId: true, likesCount: true },
    });

    if (!achievement || !isPubliclyInteractive(achievement)) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在或不可互动',
        data: null,
      });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        studentId_achievementId: {
          studentId: req.student!.id,
          achievementId: id,
        },
      },
    });

    const liked = await prisma.$transaction(async (tx) => {
      if (existingLike) {
        await tx.like.delete({ where: { id: existingLike.id } });
        await tx.achievement.update({
          where: { id },
          data: { likesCount: { decrement: 1 } },
        });
        await tx.student.update({
          where: { id: achievement.studentId },
          data: { totalLikes: { decrement: 1 } },
        });
        return false;
      }

      await tx.like.create({
        data: {
          id: uuidv4(),
          studentId: req.student!.id,
          achievementId: id,
        },
      });
      await tx.achievement.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });
      await tx.student.update({
        where: { id: achievement.studentId },
        data: { totalLikes: { increment: 1 } },
      });
      return true;
    });

    res.json({
      code: 0,
      message: liked ? '点赞成功' : '取消点赞成功',
      data: { liked },
    });
  } catch (error) {
    console.error('Like achievement error:', error);
    res.status(500).json({
      code: 500,
      message: '操作失败',
      data: null,
    });
  }
});

router.post('/upload', authenticate, rateLimit('upload', 20, 10 * 60 * 1000), (req: AuthRequest, res) => {
  studentImageUpload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.message || '上传失败';
      return res.status(400).json({
        code: 400,
        message: message.includes('File too large') ? '图片大小不能超过 5MB' : message,
        data: null,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请选择图片',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '上传成功',
      data: { url: `/uploads/${req.file.filename}` },
    });
  });
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
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

    if (achievement.studentId !== req.student!.id) {
      return res.status(403).json({
        code: 403,
        message: '无权编辑此成果',
        data: null,
      });
    }

    const nextTitle = title !== undefined ? String(title).trim() : achievement.title;
    const nextDescription = description !== undefined ? String(description).trim() : achievement.description;
    if (!nextTitle || !nextDescription) {
      return res.status(400).json({
        code: 400,
        message: '成果标题和描述不能为空',
        data: null,
      });
    }

    const nextReflection = reflection !== undefined
      ? (reflection ? String(reflection).trim() : null)
      : achievement.reflection;
    const nextImages = Array.isArray(images)
      ? JSON.stringify(images.filter((item) => typeof item === 'string'))
      : achievement.images;
    const nextAttitude = evalAttitude !== undefined ? clampScore(evalAttitude, achievement.evalAttitude) : achievement.evalAttitude;
    const nextSkill = evalSkill !== undefined ? clampScore(evalSkill, achievement.evalSkill) : achievement.evalSkill;
    const nextResult = evalResult !== undefined ? clampScore(evalResult, achievement.evalResult) : achievement.evalResult;
    const substantiveChanged =
      nextTitle !== achievement.title ||
      nextDescription !== achievement.description ||
      nextReflection !== achievement.reflection ||
      nextImages !== achievement.images ||
      nextAttitude !== achievement.evalAttitude ||
      nextSkill !== achievement.evalSkill ||
      nextResult !== achievement.evalResult;

    const updated = await prisma.$transaction(async (tx) => {
      if (substantiveChanged) {
        await Promise.all([
          tx.like.deleteMany({ where: { achievementId: id } }),
          tx.evaluation.deleteMany({ where: { achievementId: id } }),
        ]);
        if (achievement.likesCount > 0) {
          await tx.student.update({
            where: { id: achievement.studentId },
            data: { totalLikes: { decrement: achievement.likesCount } },
          });
        }
      }
      const result = await tx.achievement.update({
        where: { id },
        data: {
          title: nextTitle,
          description: nextDescription,
          reflection: nextReflection,
          images: nextImages,
          isPublic: isPublic !== undefined ? Boolean(isPublic) : achievement.isPublic,
          evalAttitude: nextAttitude,
          evalSkill: nextSkill,
          evalResult: nextResult,
          ...(substantiveChanged
            ? {
                reviewStatus: 'PENDING' as const,
                reviewComment: null,
                reviewedAt: null,
                reviewedById: null,
                likesCount: 0,
                avgAttitude: 0,
                avgSkill: 0,
                avgResult: 0,
                evalCount: 0,
              }
            : {}),
        },
      });
      await syncStudentBadges(tx, achievement.studentId);
      return result;
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

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
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

    if (achievement.studentId !== req.student!.id) {
      return res.status(403).json({
        code: 403,
        message: '无权删除此成果',
        data: null,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.achievement.delete({ where: { id } });
      await tx.student.update({
        where: { id: req.student!.id },
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
      message: '删除失败',
      data: null,
    });
  }
});

router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res) => {
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

    if (!achievement || !canViewAchievement(achievement, req.user)) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在或无权查看',
        data: null,
      });
    }

    const currentStudentId = req.user?.id ?? null;
    let myEvaluation = null;
    let isLikedByMe = false;
    if (currentStudentId) {
      const [evaluation, like] = await Promise.all([
        prisma.evaluation.findUnique({
          where: {
            studentId_achievementId: {
              studentId: currentStudentId,
              achievementId: id,
            },
          },
        }),
        prisma.like.findUnique({
          where: {
            studentId_achievementId: {
              studentId: currentStudentId,
              achievementId: id,
            },
          },
        }),
      ]);
      myEvaluation = evaluation;
      isLikedByMe = Boolean(like);
    }

    const courseMap = await loadCourseMap([achievement.courseId]);
    res.json({
      code: 0,
      message: 'success',
      data: {
        id: achievement.id,
        student: achievement.student,
        course: serializeCourse(achievement.courseId, achievement.courseTitle, achievement.taskGroupId, courseMap),
        title: achievement.title,
        description: achievement.description,
        reflection: achievement.reflection,
        images: parseImages(achievement.images),
        isPublic: achievement.isPublic,
        reviewStatus: achievement.reviewStatus,
        reviewComment: achievement.reviewComment,
        reviewedAt: achievement.reviewedAt,
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
        myEvaluation: myEvaluation
          ? {
              attitude: myEvaluation.attitude,
              skill: myEvaluation.skill,
              result: myEvaluation.result,
            }
          : null,
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

router.post('/:id/evaluate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { attitude, skill, result } = req.body;
    const scores = [attitude, skill, result].map((value) => clampScore(value, 0));

    if (scores.some((score) => score < 1 || score > 5)) {
      return res.status(400).json({
        code: 400,
        message: '请完成所有评分，且评分必须在1-5之间',
        data: null,
      });
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement || !isPubliclyInteractive(achievement)) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在或不可互动',
        data: null,
      });
    }

    if (achievement.studentId === req.student!.id) {
      return res.status(400).json({
        code: 400,
        message: '不能评价自己的成果',
        data: null,
      });
    }

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: {
        studentId_achievementId: {
          studentId: req.student!.id,
          achievementId: id,
        },
      },
    });

    if (existingEvaluation) {
      await prisma.evaluation.update({
        where: { id: existingEvaluation.id },
        data: { attitude: scores[0], skill: scores[1], result: scores[2] },
      });
    } else {
      await prisma.evaluation.create({
        data: {
          id: uuidv4(),
          studentId: req.student!.id,
          achievementId: id,
          attitude: scores[0],
          skill: scores[1],
          result: scores[2],
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

router.post('/:id/ai-evaluate', authenticate, rateLimit('ai-evaluate', 8, 10 * 60 * 1000), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const achievement = await prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement || !isPubliclyInteractive(achievement)) {
      return res.status(404).json({
        code: 404,
        message: '成果不存在或不可互动',
        data: null,
      });
    }

    if (achievement.studentId === req.student!.id) {
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
          studentId: req.student!.id,
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
          studentId: req.student!.id,
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
