import { Router } from 'express';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET } from '../config.js';
import { authenticate, rateLimit, type AuthRequest } from '../middleware/admin.js';
import { assertPasswordStrength } from '../utils.js';

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

router.post('/register', rateLimit('register', 8, 15 * 60 * 1000), async (req, res) => {
  try {
    const { studentId, nickname, gradeId, classCode, password } = req.body;

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
