import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';
import appPrisma from '../src/prisma.js';

const prisma = new PrismaClient();
const auth = (id: string, studentId: string) =>
  `Bearer ${jwt.sign({ studentId: id, studentIdNumber: studentId }, process.env.JWT_SECRET!)}`;

const ids = {
  student: 'student-review-test',
  other: 'other-review-test',
  admin: 'admin-review-test',
  course: 'course-tech-test',
  badge: 'badge-tech-test',
};

beforeEach(async () => {
  await prisma.evaluation.deleteMany();
  await prisma.like.deleteMany();
  await prisma.studentBadge.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.course.deleteMany();
  await prisma.studentRosterEntry.deleteMany();
  await prisma.student.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.taskGroup.deleteMany();

  await prisma.taskGroup.create({
    data: { id: 'tech', name: '新技术体验与应用', icon: 'T', type: '生产劳动', sortOrder: 1 },
  });
  await prisma.grade.create({ data: { id: 6, name: '六年级' } });
  await prisma.course.create({
    data: {
      id: ids.course,
      gradeId: 6,
      semesterId: 1,
      taskGroupId: 'tech',
      title: '智能工具体验',
      description: '课程说明',
      objectives: '[]',
      materials: '[]',
      steps: '[]',
      safetyTips: '注意安全',
    },
  });
  await prisma.badge.create({
    data: {
      id: ids.badge,
      key: 'tech-1',
      name: '科技先锋',
      emoji: 'T',
      description: '完成一次新技术体验',
      category: 'tech',
      taskGroupId: 'tech',
      threshold: 1,
      sortOrder: 1,
    },
  });
  await prisma.student.createMany({
    data: [
      { id: ids.student, studentId: 'S001', password: 'hash', nickname: '学生', gradeId: 6, classCode: '1班' },
      { id: ids.other, studentId: 'S002', password: 'hash', nickname: '同学', gradeId: 6, classCode: '1班' },
      { id: ids.admin, studentId: 'ADMIN', password: 'hash', nickname: '管理员', gradeId: 6, classCode: '管理', role: 'ADMIN' },
    ],
  });
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), appPrisma.$disconnect()]);
});

async function submitAchievement(isPublic = true) {
  return request(app)
    .post('/api/achievements')
    .set('Authorization', auth(ids.student, 'S001'))
    .send({
      courseId: ids.course,
      courseTitle: '伪造标题',
      title: '我的智能劳动成果',
      description: '完成了智能工具实践',
      reflection: '学会了核对结果',
      images: [],
      isPublic,
      evalAttitude: 5,
      evalSkill: 4,
      evalResult: 5,
      reviewStatus: 'APPROVED',
    });
}

async function review(id: string, status: 'APPROVED' | 'REJECTED', expectedUpdatedAt: string, reviewComment?: string) {
  return request(app)
    .patch(`/api/admin/achievements/${id}/review`)
    .set('Authorization', auth(ids.admin, 'ADMIN'))
    .send({ status, expectedUpdatedAt, reviewComment });
}

describe('achievement review workflow', () => {
  it('creates a pending achievement from a server-verified course snapshot', async () => {
    const response = await submitAchievement();
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      reviewStatus: 'PENDING',
      courseId: ids.course,
      courseTitle: '智能工具体验',
      taskGroupId: 'tech',
    });
    expect(await prisma.studentBadge.count()).toBe(0);
  });

  it('hides pending work from public views and interactions while allowing owner and admin access', async () => {
    const created = (await submitAchievement()).body.data;

    const [wall, anonymousDetail, otherDetail, ownerDetail, adminDetail, like] = await Promise.all([
      request(app).get('/api/achievements'),
      request(app).get(`/api/achievements/${created.id}`),
      request(app).get(`/api/achievements/${created.id}`).set('Authorization', auth(ids.other, 'S002')),
      request(app).get(`/api/achievements/${created.id}`).set('Authorization', auth(ids.student, 'S001')),
      request(app).get(`/api/achievements/${created.id}`).set('Authorization', auth(ids.admin, 'ADMIN')),
      request(app).post(`/api/achievements/${created.id}/like`).set('Authorization', auth(ids.other, 'S002')),
    ]);

    expect(wall.body.data.data).toHaveLength(0);
    expect(anonymousDetail.status).toBe(404);
    expect(otherDetail.status).toBe(404);
    expect(ownerDetail.status).toBe(200);
    expect(adminDetail.status).toBe(200);
    expect(like.status).toBe(404);
  });

  it('requires a meaningful rejection reason and detects stale reviews', async () => {
    const created = (await submitAchievement()).body.data;
    const shortReason = await review(created.id, 'REJECTED', created.updatedAt, '短');
    expect(shortReason.status).toBe(400);

    const approved = await review(created.id, 'APPROVED', created.updatedAt);
    expect(approved.status).toBe(200);

    const stale = await review(created.id, 'REJECTED', created.updatedAt, '内容需要补充实践过程');
    expect(stale.status).toBe(409);
  });

  it('publishes approved work, awards a badge, and keeps private approved work out of the wall', async () => {
    const publicWork = (await submitAchievement()).body.data;
    expect((await review(publicWork.id, 'APPROVED', publicWork.updatedAt)).status).toBe(200);
    expect((await request(app).get('/api/achievements')).body.data.data).toHaveLength(1);
    expect(await prisma.studentBadge.count({ where: { studentId: ids.student } })).toBe(1);

    await prisma.achievement.deleteMany();
    await prisma.studentBadge.deleteMany();
    const privateWork = (await submitAchievement(false)).body.data;
    expect((await review(privateWork.id, 'APPROVED', privateWork.updatedAt)).status).toBe(200);
    expect((await request(app).get('/api/achievements')).body.data.data).toHaveLength(0);
    expect(await prisma.studentBadge.count({ where: { studentId: ids.student } })).toBe(1);
  });

  it('returns approved work to pending while keeping its earned badge after substantive edits', async () => {
    const created = (await submitAchievement()).body.data;
    await review(created.id, 'APPROVED', created.updatedAt);
    expect(await prisma.studentBadge.count()).toBe(1);
    await prisma.like.create({ data: { studentId: ids.other, achievementId: created.id } });
    await prisma.evaluation.create({
      data: { studentId: ids.other, achievementId: created.id, attitude: 5, skill: 5, result: 5 },
    });
    await prisma.achievement.update({
      where: { id: created.id },
      data: { likesCount: 1, avgAttitude: 5, avgSkill: 5, avgResult: 5, evalCount: 1 },
    });
    await prisma.student.update({ where: { id: ids.student }, data: { totalLikes: 1 } });

    const update = await request(app)
      .put(`/api/achievements/${created.id}`)
      .set('Authorization', auth(ids.student, 'S001'))
      .send({ description: '补充并修改了实践过程' });

    expect(update.status).toBe(200);
    expect(update.body.data.reviewStatus).toBe('PENDING');
    expect(update.body.data).toMatchObject({ likesCount: 0, avgAttitude: 0, avgSkill: 0, avgResult: 0, evalCount: 0 });
    expect(await prisma.like.count({ where: { achievementId: created.id } })).toBe(0);
    expect(await prisma.evaluation.count({ where: { achievementId: created.id } })).toBe(0);
    expect((await prisma.student.findUniqueOrThrow({ where: { id: ids.student } })).totalLikes).toBe(0);
    expect(await prisma.studentBadge.count()).toBe(1);
  });

  it('does not require another review when only visibility changes', async () => {
    const created = (await submitAchievement()).body.data;
    const approved = (await review(created.id, 'APPROVED', created.updatedAt)).body.data;

    const update = await request(app)
      .put(`/api/achievements/${created.id}`)
      .set('Authorization', auth(ids.student, 'S001'))
      .send({ isPublic: false });

    expect(update.status).toBe(200);
    expect(update.body.data.reviewStatus).toBe('APPROVED');
    expect(update.body.data.reviewedAt).toBe(approved.reviewedAt);
    expect(await prisma.studentBadge.count()).toBe(1);
  });

  it('reviews multiple achievements atomically and awards the badge idempotently', async () => {
    const first = (await submitAchievement()).body.data;
    const second = await prisma.achievement.create({
      data: {
        studentId: ids.student,
        courseId: ids.course,
        courseTitle: '智能工具体验',
        taskGroupId: 'tech',
        title: '第二个成果',
        description: '继续实践',
        images: '[]',
        isPublic: true,
        reviewStatus: 'PENDING',
        evalAttitude: 4,
        evalSkill: 4,
        evalResult: 4,
      },
    });

    const response = await request(app)
      .post('/api/admin/achievements/batch-review')
      .set('Authorization', auth(ids.admin, 'ADMIN'))
      .send({
        status: 'APPROVED',
        items: [
          { id: first.id, expectedUpdatedAt: first.updatedAt },
          { id: second.id, expectedUpdatedAt: second.updatedAt },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.updated).toBe(2);
    expect(await prisma.studentBadge.count({ where: { studentId: ids.student } })).toBe(1);
  });
});
