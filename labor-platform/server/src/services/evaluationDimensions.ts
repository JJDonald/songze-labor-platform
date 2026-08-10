import prisma from '../prisma.js';

export type EvaluationDimensionKey = 'attitude' | 'skill' | 'result';

export interface EvaluationDimensionInput {
  key: EvaluationDimensionKey;
  label: string;
  description: string;
  prompt: string;
  weight: number;
  sortOrder: number;
  isEnabled: boolean;
}

export const DEFAULT_EVALUATION_DIMENSIONS: EvaluationDimensionInput[] = [
  {
    key: 'attitude',
    label: '劳动态度',
    description: '关注学生是否认真投入、坚持完成任务，并能体现责任意识。',
    prompt: '评价学生在劳动过程中的投入程度、坚持性、责任意识和安全规范。',
    weight: 1,
    sortOrder: 1,
    isEnabled: true,
  },
  {
    key: 'skill',
    label: '劳动技能',
    description: '关注学生是否掌握课程要求的工具使用、操作步骤和方法技巧。',
    prompt: '评价学生对劳动技能、工具使用、操作流程和方法技巧的掌握程度。',
    weight: 1,
    sortOrder: 2,
    isEnabled: true,
  },
  {
    key: 'result',
    label: '劳动成果',
    description: '关注作品完成度、质量、美观度、实用性和反思表达。',
    prompt: '评价学生上传成果的完成度、质量、美观度、实用性，以及反思表达是否具体。',
    weight: 1,
    sortOrder: 3,
    isEnabled: true,
  },
];

export const ensureEvaluationDimensions = async () => {
  await Promise.all(
    DEFAULT_EVALUATION_DIMENSIONS.map((dimension) =>
      prisma.evaluationDimension.upsert({
        where: { key: dimension.key },
        update: {},
        create: dimension,
      })
    )
  );

  return prisma.evaluationDimension.findMany({
    orderBy: { sortOrder: 'asc' },
  });
};

export const enabledEvaluationDimensions = async () => {
  const dimensions = await ensureEvaluationDimensions();
  return dimensions.filter((dimension) => dimension.isEnabled);
};

export const normalizeScore = (value: unknown) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.min(5, Math.max(1, Math.round(score)));
};
