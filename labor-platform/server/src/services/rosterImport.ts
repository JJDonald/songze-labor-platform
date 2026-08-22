import ExcelJS from 'exceljs';
import prisma from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';
import type { Prisma } from '@prisma/client';

// ==================== 常量与类型 ====================

export const ROSTER_HEADERS = ['学籍号', '姓名', '年级', '班级'] as const;
export const ROSTER_MAX_ROWS = 1000;

export type RosterRowAction = 'create' | 'update' | 'claimed' | 'existingStudent' | 'error';

export interface RosterRowData {
  studentId: string;
  name: string;
  gradeId: number;
  gradeName: string;
  classCode: string;
}

export interface RosterRowResult extends RosterRowData {
  row: number;
  action: RosterRowAction;
  error?: string;
}

export interface RosterPreviewSummary {
  total: number;
  create: number;
  update: number;
  claimed: number;
  existingStudent: number;
  errors: number;
}

export interface RosterPreview {
  summary: RosterPreviewSummary;
  rows: RosterRowResult[];
}

interface ParsedRow {
  row: number;
  data: RosterRowData;
  error?: string;
}

interface ExistingLookup {
  grades: Map<string, number>;
  existingByStudentId: Map<string, string>;
  entryByStudentId: Map<string, string>;
  claimedByStudentId: Map<string, string>;
}

// ==================== 解析工具 ====================

const normalizeStudentId = (value: unknown): string =>
  String(value ?? '').trim();

const normalizeText = (value: unknown): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ');

/** 从表头行解析出四个标准列的位置（支持列序任意），缺列或表头不匹配时返回 null */
const resolveHeaderIndexes = (cells: string[]): [number, number, number, number] | null => {
  const idx = {
    studentId: -1,
    name: -1,
    grade: -1,
    classCode: -1,
  };
  cells.forEach((cell, index) => {
    const key = normalizeText(cell);
    if (key === '学籍号') idx.studentId = index;
    else if (key === '姓名') idx.name = index;
    else if (key === '年级') idx.grade = index;
    else if (key === '班级') idx.classCode = index;
  });
  const { studentId, name, grade, classCode } = idx;
  if (studentId < 0 || name < 0 || grade < 0 || classCode < 0) return null;
  return [studentId, name, grade, classCode];
};

// 年级仅支持一到九（一 -> 1 ... 九 -> 9），不支持「初一」等学段写法
const GRADE_DIGITS: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

const guessGradeId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  // 纯数字（7 -> 7）
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  // 中文数字或带「年级」后缀：七 -> 7、七年级 -> 7、7年级 -> 7
  const stripped = raw.replace(/年级/g, '');
  if (GRADE_DIGITS[stripped] !== undefined) return GRADE_DIGITS[stripped];
  const strippedNumeric = Number(stripped);
  if (Number.isInteger(strippedNumeric) && strippedNumeric > 0) return strippedNumeric;
  return null;
};

const parseRow = (row: number, cells: unknown[], indexes: [number, number, number, number]): ParsedRow => {
  const [studentIdIdx, nameIdx, gradeIdx, classCodeIdx] = indexes;
  const studentId = normalizeStudentId(cells[studentIdIdx]);
  const name = normalizeText(cells[nameIdx]);
  const gradeName = normalizeText(cells[gradeIdx]);
  const classCode = normalizeText(cells[classCodeIdx]);

  const errors: string[] = [];
  if (!studentId) errors.push('学籍号不能为空');
  if (!name) errors.push('姓名不能为空');
  if (!gradeName) errors.push('年级不能为空');
  if (!classCode) errors.push('班级不能为空');

  const gradeId = guessGradeId(cells[gradeIdx]);

  return {
    row,
    data: { studentId, name, gradeId: gradeId ?? 0, gradeName, classCode },
    error: errors.length > 0 || gradeId === null
      ? errors.concat(gradeId === null && gradeName ? '年级格式无效' : []).join('；')
      : undefined,
  };
};

// ==================== 文件解析（exceljs） ====================

const readRowCells = (excelRow: ExcelJS.Row): unknown[] => {
  const cells: unknown[] = [];
  excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cells[colNumber - 1] = cell.text;
  });
  return cells;
};

const readXlsx = async (buffer: Buffer): Promise<ParsedRow[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: ParsedRow[] = [];
  const headerCells = readRowCells(worksheet.getRow(1));
  const indexes = resolveHeaderIndexes(headerCells.map(String));

  worksheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = readRowCells(excelRow);
    if (cells.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) return;

    if (!indexes) {
      rows.push({
        row: rowNumber,
        data: { studentId: '', name: '', gradeId: 0, gradeName: '', classCode: '' },
        error: '表头缺少标准列（学籍号/姓名/年级/班级）',
      });
      return;
    }
    rows.push(parseRow(rowNumber, cells, indexes));
  });

  return rows;
};

interface CsvRow {
  row: number;
  cells: string[];
}

const parseCsvCells = (text: string): CsvRow[] => {
  const rows: CsvRow[] = [];
  let index = 0;
  let rowNumber = 1;
  let cell = '';
  let inQuotes = false;
  let cells: string[] = [];
  const pushCell = () => {
    cells.push(cell);
    cell = '';
  };
  const pushRow = () => {
    pushCell();
    if (cells.some((value) => value.trim() !== '')) {
      rows.push({ row: rowNumber, cells });
    }
    cells = [];
    rowNumber += 1;
  };

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }
    if (char === '"' && cell === '') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      pushCell();
      index += 1;
      continue;
    }
    if (char === '\r') {
      index += 1;
      continue;
    }
    if (char === '\n') {
      pushRow();
      index += 1;
      continue;
    }
    cell += char;
    index += 1;
  }
  pushRow();

  return rows;
};

const readCsv = async (buffer: Buffer): Promise<ParsedRow[]> => {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const csvRows = parseCsvCells(text);
  if (csvRows.length === 0) return [];

  const indexes = resolveHeaderIndexes(csvRows[0].cells);
  if (!indexes) {
    return [{ row: 1, data: { studentId: '', name: '', gradeId: 0, gradeName: '', classCode: '' }, error: '表头缺少标准列（学籍号/姓名/年级/班级）' }];
  }

  return csvRows.slice(1).map((csvRow) => parseRow(csvRow.row, csvRow.cells, indexes));
};

/** 按扩展名解析名册文件，仅支持 xlsx / csv，超过 1000 数据行直接报错 */
export const parseRosterFile = async (buffer: Buffer, filename: string): Promise<{ rows: ParsedRow[]; error?: string }> => {
  const lower = filename.toLowerCase();
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
    return { rows: [], error: '仅支持 xlsx / csv 格式文件' };
  }

  const rows = lower.endsWith('.xlsx')
    ? await readXlsx(buffer)
    : await readCsv(buffer);

  if (rows.length > ROSTER_MAX_ROWS) {
    return { rows: [], error: `名册数据行数超过上限（最多 ${ROSTER_MAX_ROWS} 行）` };
  }
  if (rows.length === 0) {
    return { rows: [], error: '文件为空，未解析到数据行' };
  }

  return { rows };
};

// ==================== 预览（预检） ====================

const loadExisting = async (): Promise<ExistingLookup> => {
  const [grades, students, rosterEntries] = await Promise.all([
    prisma.grade.findMany(),
    prisma.student.findMany({ select: { id: true, studentId: true, nickname: true } }),
    prisma.studentRosterEntry.findMany({
      select: { id: true, studentId: true, name: true, claimedStudentId: true },
    }),
  ]);

  const gradesMap = new Map<string, number>();
  for (const grade of grades) gradesMap.set(String(grade.id), grade.id);

  const existingByStudentId = new Map<string, string>();
  for (const student of students) {
    existingByStudentId.set(normalizeStudentId(student.studentId), student.id);
  }

  const entryByStudentId = new Map<string, string>();
  const claimedByStudentId = new Map<string, string>();
  for (const entry of rosterEntries) {
    entryByStudentId.set(entry.studentId, entry.id);
    if (entry.claimedStudentId) {
      claimedByStudentId.set(entry.studentId, entry.id);
    }
  }

  return { grades: gradesMap, existingByStudentId, entryByStudentId, claimedByStudentId };
};

const classifyRow = (
  row: ParsedRow,
  lookup: ExistingLookup,
  seen: Map<string, number>
): RosterRowResult => {
  const result: RosterRowResult = { ...row.data, row: row.row, action: 'create' };

  if (row.error) {
    result.action = 'error';
    result.error = row.error;
    return result;
  }

  const { studentId, gradeName } = row.data;
  if (seen.has(studentId)) {
    result.action = 'error';
    result.error = `学籍号与第 ${seen.get(studentId)} 行重复`;
    return result;
  }
  seen.set(studentId, row.row);

  const gradeId = lookup.grades.get(String(row.data.gradeId)) ?? lookup.grades.get(gradeName);
  if (gradeId === undefined) {
    result.action = 'error';
    result.error = `年级「${gradeName}」不存在`;
    return result;
  }
  result.gradeId = gradeId;

  if (lookup.entryByStudentId.has(studentId)) {
    result.action = lookup.claimedByStudentId.has(studentId) ? 'claimed' : 'update';
  } else if (lookup.existingByStudentId.has(studentId)) {
    result.action = 'existingStudent';
  } else {
    result.action = 'create';
  }

  return result;
};

/** 预检：不写库，返回 summary 与带 action/error 的行明细 */
export const previewRoster = async (buffer: Buffer, filename: string): Promise<RosterPreview> => {
  const { rows, error } = await parseRosterFile(buffer, filename);
  if (error) {
    return {
      summary: { total: 0, create: 0, update: 0, claimed: 0, existingStudent: 0, errors: 1 },
      rows: [{ row: 1, studentId: '', name: '', gradeId: 0, gradeName: '', classCode: '', action: 'error', error }],
    };
  }

  const lookup = await loadExisting();
  const seen = new Map<string, number>();
  const classified = rows.map((row) => classifyRow(row, lookup, seen));

  const summary: RosterPreviewSummary = {
    total: classified.length,
    create: 0,
    update: 0,
    claimed: 0,
    existingStudent: 0,
    errors: 0,
  };
  for (const row of classified) {
    summary[row.action === 'error' ? 'errors' : row.action]++;
  }

  return { summary, rows: classified };
};

// ==================== 正式导入（事务） ====================

export const importRoster = async (buffer: Buffer, filename: string): Promise<RosterPreview> => {
  const { rows, error } = await parseRosterFile(buffer, filename);
  if (error) {
    return {
      summary: { total: 0, create: 0, update: 0, claimed: 0, existingStudent: 0, errors: 1 },
      rows: [{ row: 1, studentId: '', name: '', gradeId: 0, gradeName: '', classCode: '', action: 'error', error }],
    };
  }

  const lookup = await loadExisting();
  const seen = new Map<string, number>();
  const classified = rows.map((row) => classifyRow(row, lookup, seen));
  const hasErrors = classified.some((row) => row.action === 'error');

  if (hasErrors) {
    const summary: RosterPreviewSummary = { total: 0, create: 0, update: 0, claimed: 0, existingStudent: 0, errors: 0 };
    summary.total = classified.length;
    for (const row of classified) {
      summary[row.action === 'error' ? 'errors' : row.action]++;
    }
    return { summary, rows: classified };
  }

  await prisma.$transaction(async (tx) => {
    for (const row of classified) {
      if (row.action === 'claimed') continue;

      const { studentId, name, gradeId, classCode } = row;
      const existingEntry = lookup.entryByStudentId.get(studentId);
      const existingStudentId = lookup.existingByStudentId.get(studentId);
      const data: Prisma.StudentRosterEntryCreateInput = {
        studentId,
        name,
        grade: { connect: { id: gradeId } },
        classCode,
        claimedStudent: existingStudentId ? { connect: { id: existingStudentId } } : undefined,
        claimedAt: existingStudentId ? new Date() : undefined,
      };
      if (existingEntry) {
        await tx.studentRosterEntry.update({
          where: { id: existingEntry },
          data: {
            name,
            grade: { connect: { id: gradeId } },
            classCode,
            claimedStudent: existingStudentId ? { connect: { id: existingStudentId } } : undefined,
            claimedAt: existingStudentId ? new Date() : undefined,
          },
        });
      } else {
        await tx.studentRosterEntry.create({ data });
      }
    }
  });

  const summary: RosterPreviewSummary = {
    total: classified.length,
    create: 0,
    update: 0,
    claimed: 0,
    existingStudent: 0,
    errors: 0,
  };
  for (const row of classified) {
    summary[row.action === 'error' ? 'errors' : row.action]++;
  }
  return { summary, rows: classified };
};

/** 生成模板：默认 xlsx；format=csv 时输出 CSV 文本 */
export const buildRosterTemplate = async (format: 'xlsx' | 'csv'): Promise<{ buffer: Buffer; contentType: string; filename: string }> => {
  const headers = ROSTER_HEADERS;
  const sample = ['2026060101', '张三', '六年级', '1班'];

  if (format === 'csv') {
    const csv = `${headers.join(',')}\n${sample.join(',')}\n`;
    return {
      buffer: Buffer.from('\uFEFF' + csv, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      filename: '名册导入模板.csv',
    };
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('学生名册');
  worksheet.addRow(headers);
  worksheet.addRow(sample);
  worksheet.columns.forEach((column, index) => {
    column.width = [14, 14, 12, 12][index] ?? 12;
  });
  // 学籍号列固定为文本格式，避免长数字被 Excel 存成科学计数法丢失精度
  worksheet.getColumn(1).numFmt = '@';
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  worksheet.getCell('A1').note = '学籍号：学生的唯一编号（如 2026060101）';
  worksheet.getCell('C1').note = '年级：需与系统中已有的年级匹配（如 六年级 或 6）';
  worksheet.getCell('D1').note = '班级：如 1班';

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: '名册导入模板.xlsx',
  };
};
