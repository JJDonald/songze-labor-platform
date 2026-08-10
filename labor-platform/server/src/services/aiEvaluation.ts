import type { Achievement, EvaluationDimension } from '@prisma/client';
import { AI_AGENT_API_KEY, AI_AGENT_BASE_URL } from '../config.js';
import { normalizeScore } from './evaluationDimensions.js';

export interface AiEvaluationScores {
  attitude: number;
  skill: number;
  result: number;
}

export interface AiEvaluationResult {
  scores: AiEvaluationScores;
  summary: string;
  suggestions: string[];
  source: 'agent' | 'local';
}

interface AgentPayload {
  achievement: {
    id: string;
    title: string;
    description: string;
    reflection: string | null;
    courseTitle: string | null;
    images: string[];
  };
  dimensions: Array<Pick<EvaluationDimension, 'key' | 'label' | 'description' | 'prompt' | 'weight'>>;
  instruction: string;
}

interface AgentResponse {
  scores?: Partial<Record<keyof AiEvaluationScores, unknown>>;
  summary?: unknown;
  suggestions?: unknown;
}

const getEvaluationEndpoint = () => {
  if (!AI_AGENT_BASE_URL) return '';
  return `${AI_AGENT_BASE_URL.replace(/\/$/, '')}/evaluate`;
};

const parseImages = (images: string) => {
  try {
    const parsed = JSON.parse(images) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const localScore = (text: string, base: number) => {
  const lengthBonus = text.length > 120 ? 1 : text.length > 60 ? 0.5 : 0;
  const reflectionBonus = /反思|收获|改进|困难|坚持|安全|步骤/.test(text) ? 0.5 : 0;
  return Math.min(5, Math.max(3, Math.round(base + lengthBonus + reflectionBonus)));
};

const fallbackEvaluation = (achievement: Achievement): AiEvaluationResult => {
  const text = `${achievement.title}\n${achievement.description}\n${achievement.reflection || ''}`;
  return {
    scores: {
      attitude: localScore(text, 3.4),
      skill: localScore(text, 3.1),
      result: localScore(text, 3.2),
    },
    summary: '已根据成果标题、描述和反思内容生成智能评价。建议配置 AI_AGENT_BASE_URL 对接正式智能体服务以获得更精准反馈。',
    suggestions: [
      '补充劳动过程中的关键步骤，让评价更能体现技能掌握情况。',
      '增加遇到的问题和改进方法，能帮助老师看到真实成长。',
    ],
    source: 'local',
  };
};

const normalizeAgentResult = (payload: AgentResponse): AiEvaluationResult | null => {
  const scores = payload.scores;
  if (!scores) return null;

  const attitude = normalizeScore(scores.attitude);
  const skill = normalizeScore(scores.skill);
  const result = normalizeScore(scores.result);
  if (!attitude || !skill || !result) return null;

  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions.filter((item): item is string => typeof item === 'string').slice(0, 5)
    : [];

  return {
    scores: { attitude, skill, result },
    summary: typeof payload.summary === 'string' ? payload.summary : 'AI 智能体已完成评价。',
    suggestions,
    source: 'agent',
  };
};

export const evaluateAchievementWithAgent = async (
  achievement: Achievement,
  dimensions: EvaluationDimension[]
): Promise<AiEvaluationResult> => {
  const evaluationEndpoint = getEvaluationEndpoint();
  if (!evaluationEndpoint) {
    return fallbackEvaluation(achievement);
  }

  const payload: AgentPayload = {
    achievement: {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      reflection: achievement.reflection,
      courseTitle: achievement.courseTitle,
      images: parseImages(achievement.images),
    },
    dimensions: dimensions.map(({ key, label, description, prompt, weight }) => ({
      key,
      label,
      description,
      prompt,
      weight,
    })),
    instruction: '请按照每个维度给出 1-5 的整数分，并返回 JSON：{ scores: { attitude, skill, result }, summary, suggestions }。',
  };

  try {
    const response = await fetch(evaluationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AI_AGENT_API_KEY ? { Authorization: `Bearer ${AI_AGENT_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return fallbackEvaluation(achievement);
    }

    const data = (await response.json()) as AgentResponse;
    return normalizeAgentResult(data) || fallbackEvaluation(achievement);
  } catch (error) {
    console.error('AI evaluation agent error:', error);
    return fallbackEvaluation(achievement);
  }
};
