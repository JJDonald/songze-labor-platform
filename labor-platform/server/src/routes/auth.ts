import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'labor-platform-secret-key-2026';
const DEFAULT_PASSWORD = '123456';

router.post('/register', async (req, res) => {
  try {
    const { studentId, nickname, gradeId, classCode } = req.body;

    if (!studentId || !nickname || !gradeId || !classCode) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息',
        data: null,
      });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { studentId },
    });

    if (existingStudent) {
      return res.status(400).json({
        code: 400,
        message: '该学籍号已被注册',
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const student = await prisma.student.create({
      data: {
        id: uuidv4(),
        studentId,
        password: hashedPassword,
        nickname,
        gradeId: parseInt(gradeId),
        classCode,
      },
    });

    const token = jwt.sign(
      { studentId: student.id, studentIdNumber: student.studentId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      code: 0,
      message: '注册成功',
      data: {
        token,
        student: {
          id: student.id,
          studentId: student.studentId,
          nickname: student.nickname,
          avatarEmoji: student.avatarEmoji,
          gradeId: student.gradeId,
          classCode: student.classCode,
        },
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

router.post('/login', async (req, res) => {
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

    const token = jwt.sign(
      { studentId: student.id, studentIdNumber: student.studentId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        student: {
          id: student.id,
          studentId: student.studentId,
          nickname: student.nickname,
          avatarEmoji: student.avatarEmoji,
          gradeId: student.gradeId,
          classCode: student.classCode,
        },
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

router.get('/me', async (req, res) => {
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

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: student.id,
        studentId: student.studentId,
        nickname: student.nickname,
        avatarEmoji: student.avatarEmoji,
        gradeId: student.gradeId,
        classCode: student.classCode,
        totalAchievements: student.totalAchievements,
        totalLikes: student.totalLikes,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({
      code: 401,
      message: '登录已过期，请重新登录',
      data: null,
    });
  }
});

router.post('/update-avatar', async (req, res) => {
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

    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({
        code: 400,
        message: '请选择头像',
        data: null,
      });
    }

    const student = await prisma.student.update({
      where: { id: decoded.studentId },
      data: { avatarEmoji: avatar },
    });

    res.json({
      code: 0,
      message: '头像修改成功',
      data: {
        id: student.id,
        studentId: student.studentId,
        nickname: student.nickname,
        avatarEmoji: student.avatarEmoji,
        gradeId: student.gradeId,
        classCode: student.classCode,
      },
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

router.post('/change-password', async (req, res) => {
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

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        message: '请填写完整信息',
        data: null,
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码长度至少6位',
        data: null,
      });
    }

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

    const isValidPassword = await bcrypt.compare(oldPassword, student.password);
    if (!isValidPassword) {
      return res.status(400).json({
        code: 400,
        message: '原密码错误',
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.student.update({
      where: { id: decoded.studentId },
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