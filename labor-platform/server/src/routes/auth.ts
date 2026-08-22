import { Router } from 'express';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET } from '../config.js';
import { authenticate, rateLimit, type AuthRequest } from '../middleware/admin.js';
import { assertPasswordStrength } from '../utils.js';
import { getRegistrationSettings } from '../services/registrationSettings.js';

const router = Router();

const signToken = (student: { id: string; studentId: string }) =>
  jwt.sign(
    { studentId: student.id, studentIdNumber: student.studentId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const publicStudent = (student: {
  id: string;
  studentId: string;
  nickname: string;
  avatarEmoji: string;
  gradeId: number;
  classCode: string;
  role: string;
  totalAchievements?: number;
  totalLikes?: number;
}) => ({
  id: student.id,
  studentId: student.studentId,
  nickname: student.nickname,
  avatarEmoji: student.avatarEmoji,
  gradeId: student.gradeId,
  classCode: student.classCode,
  role: student.role,
  totalAchievements: student.totalAchievements,
  totalLikes: student.totalLikes,
});

/** 学籍号按文本保存，仅清理首尾空白，保留可能存在的前导零 */
const normalizeStudentId = (value: unknown) => String(value ?? '').trim();

/** 姓名规范化：trim 并合并连续空白，用于与名册姓名匹配 */
const normalizeName = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

// 获取注册配置（开放注册模式，供前端判断是否展示学籍号/姓名校验流程）
router.get('/registration-settings', async (_req, res) => {
  try {
    const settings = await getRegistrationSettings();
    res.json({
      code: 0,
      message: 'success',
      data: settings,
    });
  } catch (error) {
    console.error('Get registration settings error:', error);
    res.status(500).json({
      code: 500,
      message: '获取注册配置失败',
      data: null,
    });
  }
});

router.post('/register', rateLimit('register', 8, 15 * 60 * 1000), async (req, res) => {
  try {
    const { studentId, nickname, realName, gradeId, classCode, password } = req.body;
    const registration = await getRegistrationSettings();

    if (registration.mode === 'CLOSED') {
      return res.status(403).json({
        code: 403,
        message: '当前未开放注册',
        data: null,
      });
    }

    if (!studentId || !nickname || !password) {
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

    // ROSTER_ONLY：必须提供真实姓名，且学籍号+姓名需匹配名册中未认领的条目
    if (registration.mode === 'ROSTER_ONLY') {
      const normalizedRealName = normalizeName(realName);
      if (!normalizedRealName) {
        return res.status(400).json({
          code: 400,
          message: '请填写真实姓名',
          data: null,
        });
      }

      const normalizedId = normalizeStudentId(studentId);
      const rosterEntry = await prisma.studentRosterEntry.findUnique({
        where: { studentId: normalizedId },
      });

      if (!rosterEntry || rosterEntry.name !== normalizedRealName) {
        return res.status(400).json({
          code: 400,
          message: '学籍号或姓名不在名册中，无法注册',
          data: null,
        });
      }
      if (rosterEntry.claimedStudentId) {
        return res.status(400).json({
          code: 400,
          message: '该学籍号已被注册',
          data: null,
        });
      }
      const existingStudent = await prisma.student.findUnique({
        where: { studentId: normalizedId },
      });
      if (existingStudent) {
        return res.status(400).json({
          code: 400,
          message: '该学籍号已被注册',
          data: null,
        });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      try {
        const student = await prisma.$transaction(async (tx) => {
          const created = await tx.student.create({
            data: {
              id: uuidv4(),
              studentId: normalizedId,
              password: hashedPassword,
              nickname: String(nickname).trim(),
              gradeId: rosterEntry.gradeId,
              classCode: rosterEntry.classCode,
            },
          });
          await tx.studentRosterEntry.update({
            where: { id: rosterEntry.id },
            data: {
              claimedStudent: { connect: { id: created.id } },
              claimedAt: new Date(),
            },
          });
          return created;
        });

        return res.json({
          code: 0,
          message: '注册成功',
          data: {
            token: signToken(student),
            student: publicStudent(student),
          },
        });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          return res.status(400).json({
            code: 400,
            message: '该学籍号已被注册',
            data: null,
          });
        }
        throw error;
      }
    }

    // OPEN：保持原有行为
    if (!gradeId || !classCode) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息，并设置登录密码',
        data: null,
      });
    }

    const grade = await prisma.grade.findUnique({
      where: { id: parseInt(String(gradeId), 10) },
    });
    if (!grade) {
      return res.status(400).json({
        code: 400,
        message: '年级不存在',
        data: null,
      });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { studentId: String(studentId).trim() },
    });

    if (existingStudent) {
      return res.status(400).json({
        code: 400,
        message: '该学籍号已被注册',
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const student = await prisma.student.create({
      data: {
        id: uuidv4(),
        studentId: String(studentId).trim(),
        password: hashedPassword,
        nickname: String(nickname).trim(),
        gradeId: grade.id,
        classCode: String(classCode).trim(),
      },
    });

    res.json({
      code: 0,
      message: '注册成功',
      data: {
        token: signToken(student),
        student: publicStudent(student),
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      code: 500,
      message: '注册失败',
      data: null,
    });
  }
});

router.post('/login', rateLimit('login', 10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({
        code: 400,
        message: '请输入学籍号和密码',
        data: null,
      });
    }

    const student = await prisma.student.findUnique({
      where: { studentId },
    });

    if (!student) {
      return res.status(401).json({
        code: 401,
        message: '学籍号或密码错误',
        data: null,
      });
    }

    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      return res.status(401).json({
        code: 401,
        message: '学籍号或密码错误',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token: signToken(student),
        student: publicStudent(student),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      code: 500,
      message: '登录失败',
      data: null,
    });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const student = req.student!;
  res.json({
    code: 0,
    message: 'success',
    data: publicStudent(student),
  });
});

router.post('/update-avatar', authenticate, async (req: AuthRequest, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({
        code: 400,
        message: '请选择头像',
        data: null,
      });
    }

    const student = await prisma.student.update({
      where: { id: req.student!.id },
      data: { avatarEmoji: avatar.slice(0, 8) },
    });

    res.json({
      code: 0,
      message: '头像修改成功',
      data: publicStudent(student),
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      code: 500,
      message: '修改头像失败',
      data: null,
    });
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息',
        data: null,
      });
    }

    try {
      assertPasswordStrength(String(newPassword));
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: error instanceof Error ? error.message : '密码不符合要求',
        data: null,
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: req.student!.id },
    });

    if (!student) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        data: null,
      });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, student.password);
    if (!isValidPassword) {
      return res.status(400).json({
        code: 400,
        message: '原密码错误',
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await prisma.student.update({
      where: { id: student.id },
      data: { password: hashedPassword },
    });

    res.json({
      code: 0,
      message: '密码修改成功',
      data: null,
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      code: 500,
      message: '修改密码失败',
      data: null,
    });
  }
});

export default router;
