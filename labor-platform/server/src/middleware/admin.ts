import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Student } from '@prisma/client';
import prisma from '../prisma.js';
import { JWT_SECRET } from '../config.js';
import { consumeRateLimit, clientKey } from '../utils.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    studentId: string;
    role: string;
  };
  student?: Student;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string; studentIdNumber: string };

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

    req.user = {
      id: student.id,
      studentId: student.studentId,
      role: student.role,
    };
    req.student = student;
    next();
  } catch {
    res.status(401).json({
      code: 401,
      message: '登录已过期，请重新登录',
      data: null,
    });
  }
};

export const optionalAuthenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string };
    const student = await prisma.student.findUnique({
      where: { id: decoded.studentId },
    });
    if (student) {
      req.user = {
        id: student.id,
        studentId: student.studentId,
        role: student.role,
      };
      req.student = student;
    }
  } catch {
    // ignore invalid optional tokens
  }
  next();
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      code: 403,
      message: '权限不足，仅管理员可访问',
      data: null,
    });
  }
  next();
};

export const rateLimit = (suffix: string, limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = consumeRateLimit(clientKey(req, suffix), limit, windowMs);
    if (!result.allowed) {
      return res.status(429).json({
        code: 429,
        message: '操作过于频繁，请稍后再试',
        data: null,
      });
    }
    next();
  };
};
