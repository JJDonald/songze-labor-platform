import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';
import appPrisma from '../src/prisma.js';

const prisma = new PrismaClient();
const adminId = 'admin-roster-test';
const studentId = 'student-roster-test';
const auth = (id: string, studentIdNumber: string) =>
  `Bearer ${jwt.sign({ studentId: id, studentIdNumber }, process.env.JWT_SECRET!)}`;
const adminAuth = () => auth(adminId, 'ADMIN-ROSTER');
const studentAuth = () => auth(studentId, 'EXISTING-001');

const csv = (rows: string[]) => Buffer.from(`\uFEFF学籍号,姓名,年级,班级\n${rows.join('\n')}\n`, 'utf-8');

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

  await prisma.grade.createMany({
    data: [
      { id: 6, name: '六年级' },
      { id: 7, name: '七年级' },
    ],
  });
  await prisma.student.createMany({
    data: [
      {
        id: adminId,
        studentId: 'ADMIN-ROSTER',
        password: 'hash',
        nickname: '管理员',
        gradeId: 6,
        classCode: '管理',
        role: 'ADMIN',
      },
      {
        id: studentId,
        studentId: 'EXISTING-001',
        password: 'hash',
        nickname: '已有学生',
        gradeId: 6,
        classCode: '1班',
      },
    ],
  });
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), appPrisma.$disconnect()]);
});

async function setMode(mode: 'OPEN' | 'ROSTER_ONLY' | 'CLOSED') {
  return request(app)
    .put('/api/admin/registration-settings')
    .set('Authorization', adminAuth())
    .send({ mode });
}

async function register(body: Record<string, unknown>) {
  return request(app).post('/api/auth/register').send({
    studentId: 'NEW-001',
    nickname: '新同学',
    gradeId: 6,
    classCode: '1班',
    password: 'Secure789',
    ...body,
  });
}

describe('registration control', () => {
  it('defaults to open registration and preserves the existing response contract', async () => {
    const settings = await request(app).get('/api/auth/registration-settings');
    expect(settings.status).toBe(200);
    expect(settings.body.data).toEqual({ mode: 'OPEN' });

    const response = await register({});
    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.student).toMatchObject({
      studentId: 'NEW-001',
      gradeId: 6,
      classCode: '1班',
    });
  });

  it('closes registration without affecting the public settings endpoint', async () => {
    expect((await setMode('CLOSED')).status).toBe(200);
    const response = await register({});
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('当前未开放注册');
    expect((await request(app).get('/api/auth/registration-settings')).body.data.mode).toBe('CLOSED');
  });

  it('requires an unclaimed matching roster entry and uses roster grade and class', async () => {
    await setMode('ROSTER_ONLY');
    await prisma.studentRosterEntry.create({
      data: {
        studentId: '000123',
        name: '张 三',
        gradeId: 7,
        classCode: '5班',
      },
    });

    const rejected = await register({ studentId: '000123', realName: '李四' });
    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toBe('学籍号或姓名不在名册中，无法注册');

    const accepted = await register({
      studentId: '000123',
      realName: '  张   三 ',
      gradeId: 6,
      classCode: '1班',
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.student).toMatchObject({ studentId: '000123', gradeId: 7, classCode: '5班' });

    const entry = await prisma.studentRosterEntry.findUniqueOrThrow({ where: { studentId: '000123' } });
    expect(entry.claimedStudentId).toBe(accepted.body.data.student.id);
    expect(entry.claimedAt).toBeInstanceOf(Date);
  });

  it('rejects non-admin setting changes', async () => {
    const response = await request(app)
      .put('/api/admin/registration-settings')
      .set('Authorization', studentAuth())
      .send({ mode: 'CLOSED' });
    expect(response.status).toBe(403);
  });
});

describe('student roster import', () => {
  it('previews and atomically imports CSV while preserving leading zeroes', async () => {
    const file = csv(['000001,张三,六年级,1班', '000002,李四,7,2班']);
    const preview = await request(app)
      .post('/api/admin/roster/import-preview')
      .set('Authorization', adminAuth())
      .attach('file', file, { filename: 'roster.csv', contentType: 'text/csv' });

    expect(preview.status).toBe(200);
    expect(preview.body.data.summary).toMatchObject({ total: 2, create: 2, errors: 0 });
    expect(preview.body.data.rows[0]).toMatchObject({ studentId: '000001', action: 'create' });
    expect(await prisma.studentRosterEntry.count()).toBe(0);

    const imported = await request(app)
      .post('/api/admin/roster/import')
      .set('Authorization', adminAuth())
      .attach('file', file, { filename: 'roster.csv', contentType: 'text/csv' });

    expect(imported.status).toBe(200);
    expect(imported.body.data).toMatchObject({ total: 2, create: 2, errors: 0 });
    expect(await prisma.studentRosterEntry.findUnique({ where: { studentId: '000001' } })).not.toBeNull();
  });

  it('parses grade labels in supported formats and rejects 初一-style input', async () => {
    const file = csv([
      '000010,小七,七年级,1班',
      '000011,小数字,7年级,2班',
      '000012,小六,6,3班',
      '000013,小初,初一,4班',
    ]);
    const preview = await request(app)
      .post('/api/admin/roster/import-preview')
      .set('Authorization', adminAuth())
      .attach('file', file, { filename: 'roster.csv', contentType: 'text/csv' });

    expect(preview.status).toBe(200);
    const rows = preview.body.data.rows;
    expect(rows[0]).toMatchObject({ studentId: '000010', gradeId: 7, action: 'create' });
    expect(rows[1]).toMatchObject({ studentId: '000011', gradeId: 7, action: 'create' });
    expect(rows[2]).toMatchObject({ studentId: '000012', gradeId: 6, action: 'create' });
    expect(rows[3]).toMatchObject({ studentId: '000013', action: 'error', error: '年级格式无效' });
  });

  it('imports XLSX and links an existing student as claimed', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('学生名册');
    sheet.addRow(['学籍号', '姓名', '年级', '班级']);
    sheet.addRow(['EXISTING-001', '王同学', '六年级', '1班']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const response = await request(app)
      .post('/api/admin/roster/import')
      .set('Authorization', adminAuth())
      .attach('file', buffer, {
        filename: 'roster.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.existingStudent).toBe(1);
    const entry = await prisma.studentRosterEntry.findUniqueOrThrow({ where: { studentId: 'EXISTING-001' } });
    expect(entry.claimedStudentId).toBe(studentId);
  });

  it('rejects numeric XLSX student IDs instead of silently changing them', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('学生名册');
    sheet.addRow(['学籍号', '姓名', '年级', '班级']);
    sheet.addRow([202606010101, '数字学籍号', '六年级', '1班']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const response = await request(app)
      .post('/api/admin/roster/import')
      .set('Authorization', adminAuth())
      .attach('file', buffer, {
        filename: 'numeric-student-id.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(response.status).toBe(400);
    expect(response.body.data.rows[0]).toMatchObject({
      action: 'error',
      error: expect.stringContaining('学籍号必须使用文本格式'),
    });
    expect(await prisma.studentRosterEntry.count()).toBe(0);
  });

  it('rejects invalid or duplicate rows without writing partial data', async () => {
    const file = csv(['A001,张三,六年级,1班', 'A001,李四,九年级,2班']);
    const response = await request(app)
      .post('/api/admin/roster/import')
      .set('Authorization', adminAuth())
      .attach('file', file, { filename: 'roster.csv', contentType: 'text/csv' });

    expect(response.status).toBe(400);
    expect(response.body.data.summary.errors).toBeGreaterThan(0);
    expect(await prisma.studentRosterEntry.count()).toBe(0);
  });

  it('updates unclaimed entries but leaves claimed roster data unchanged', async () => {
    await prisma.studentRosterEntry.createMany({
      data: [
        { id: 'unclaimed', studentId: 'U001', name: '旧姓名', gradeId: 6, classCode: '1班' },
        {
          id: 'claimed',
          studentId: 'EXISTING-001',
          name: '原姓名',
          gradeId: 6,
          classCode: '1班',
          claimedStudentId: studentId,
          claimedAt: new Date(),
        },
      ],
    });
    const file = csv(['U001,新姓名,七年级,3班', 'EXISTING-001,篡改姓名,七年级,6班']);

    const response = await request(app)
      .post('/api/admin/roster/import')
      .set('Authorization', adminAuth())
      .attach('file', file, { filename: 'roster.csv', contentType: 'text/csv' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ update: 1, claimed: 1 });

    expect(await prisma.studentRosterEntry.findUniqueOrThrow({ where: { id: 'unclaimed' } })).toMatchObject({
      name: '新姓名', gradeId: 7, classCode: '3班',
    });
    expect(await prisma.studentRosterEntry.findUniqueOrThrow({ where: { id: 'claimed' } })).toMatchObject({
      name: '原姓名', gradeId: 6, classCode: '1班',
    });
  });

  it('filters roster entries, returns global stats, and protects claimed deletion', async () => {
    await prisma.studentRosterEntry.createMany({
      data: [
        { id: 'six', studentId: 'SIX-001', name: '六年级学生', gradeId: 6, classCode: '1班' },
        {
          id: 'seven', studentId: 'EXISTING-001', name: '七年级学生', gradeId: 7, classCode: '2班',
          claimedStudentId: studentId, claimedAt: new Date(),
        },
      ],
    });

    const list = await request(app)
      .get('/api/admin/roster?gradeId=7&classCode=2班&status=claimed&search=七年级')
      .set('Authorization', adminAuth());
    expect(list.status).toBe(200);
    expect(list.body.data.data).toHaveLength(1);
    expect(list.body.data.stats).toEqual({ total: 2, claimed: 1, unclaimed: 1 });

    const claimedDelete = await request(app).delete('/api/admin/roster/seven').set('Authorization', adminAuth());
    expect(claimedDelete.status).toBe(400);
    expect(await prisma.studentRosterEntry.findUnique({ where: { id: 'seven' } })).not.toBeNull();

    const unclaimedDelete = await request(app).delete('/api/admin/roster/six').set('Authorization', adminAuth());
    expect(unclaimedDelete.status).toBe(200);
    expect(await prisma.studentRosterEntry.findUnique({ where: { id: 'six' } })).toBeNull();

    const missingDelete = await request(app).delete('/api/admin/roster/missing').set('Authorization', adminAuth());
    expect(missingDelete.status).toBe(404);
  });

  it('clears roster claim metadata when the linked student is deleted', async () => {
    await prisma.studentRosterEntry.create({
      data: {
        id: 'linked-entry',
        studentId: 'EXISTING-001',
        name: '已有学生',
        gradeId: 6,
        classCode: '1班',
        claimedStudentId: studentId,
        claimedAt: new Date(),
      },
    });

    const response = await request(app)
      .delete(`/api/admin/users/${studentId}`)
      .set('Authorization', adminAuth());
    expect(response.status).toBe(200);

    const entry = await prisma.studentRosterEntry.findUniqueOrThrow({ where: { id: 'linked-entry' } });
    expect(entry.claimedStudentId).toBeNull();
    expect(entry.claimedAt).toBeNull();
  });

  it('provides both supported template formats', async () => {
    const bufferParser = (res: { on: (event: string, listener: (chunk: Buffer) => void) => void }, callback: (error: null, body: Buffer) => void) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    };
    const [xlsx, csvTemplate] = await Promise.all([
      request(app).get('/api/admin/roster/template?format=xlsx').set('Authorization', adminAuth()).parse(bufferParser),
      request(app).get('/api/admin/roster/template?format=csv').set('Authorization', adminAuth()),
    ]);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers['content-type']).toContain('spreadsheetml');
    expect(csvTemplate.status).toBe(200);
    expect(csvTemplate.headers['content-type']).toContain('text/csv');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(xlsx.body));
    expect(workbook.worksheets[0].getColumn(1).numFmt).toBe('@');
  });
});
