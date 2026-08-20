import type { Achievement, EvaluationDimension } from '@prisma/client';
import { normalizeScore } from './evaluationDimensions.js';
import {
  buildThinkingRequestFields,
  getAiEvaluateUrl,
  getAiRuntimeSettings,
  type AiRuntimeSettings,
} from './aiSettings.js';

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
  model?: string;
  temperature?: number;
  thinkingLevel?: string;
  enable_thinking?: boolean;
  reasoning_effort?: string;
  thinking_budget?: number;
}

interface AgentResponse {
  scores?: Partial<Record<keyof AiEvaluationScores, unknown>>;
  summary?: unknown;
  suggestions?: unknown;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

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
    summary: '已根据成果标题、描述和反思内容生成智能评价。可在管理后台配置 AI URL / API Key / Model 后获得更精准反馈。',
    suggestions: [
      '补充劳动过程中的关键步骤，让评价更能体现技能掌握情况。',
      '增加遇到的问题和改进方法，能帮助老师看到真实成长。',
    ],
    source: 'local',
  };
};

const extractJsonObject = (content: string): AgentResponse | null => {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as AgentResponse;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as AgentResponse;
    } catch {
      return null;
    }
  }
};

const normalizeAgentResult = (payload: AgentResponse): AiEvaluationResult | null => {
  let scores = payload.scores;
  let summary = payload.summary;
  let suggestions = payload.suggestions;

  // OpenAI chat completion 兼容：内容可能包在 choices[0].message.content
  if (!scores && Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
    const content = payload.choices[0].message.content;
    if (typeof content === 'string') {
      const parsed = extractJsonObject(content);
      if (parsed) {
        scores = parsed.scores;
        summary = parsed.summary;
        suggestions = parsed.suggestions;
      }
    }
  }

  if (!scores) return null;

  const attitude = normalizeScore(scores.attitude);
  const skill = normalizeScore(scores.skill);
  const result = normalizeScore(scores.result);
  if (!attitude || !skill || !result) return null;

  const normalizedSuggestions = Array.isArray(suggestions)
    ? suggestions.filter((item): item is string => typeof item === 'string').slice(0, 5)
    : [];

  return {
    scores: { attitude, skill, result },
    summary: typeof summary === 'string' ? summary : 'AI 智能体已完成评价。',
    suggestions: normalizedSuggestions,
    source: 'agent',
  };
};

const buildAgentPayload = (
  achievement: Achievement,
  dimensions: EvaluationDimension[],
  settings: AiRuntimeSettings
): AgentPayload => ({
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
  model: settings.model || undefined,
  temperature: settings.temperature,
  ...buildThinkingRequestFields(settings.thinkingLevel),
});

const callCustomAgent = async (
  settings: AiRuntimeSettings,
  payload: AgentPayload
) => {
  const evaluationEndpoint = getAiEvaluateUrl(settings);
  if (!evaluationEndpoint) return null;

  const response = await fetch(evaluationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return null;
  return (await response.json()) as AgentResponse;
};

const callOpenAiCompatible = async (
  settings: AiRuntimeSettings,
  achievement: Achievement,
  dimensions: EvaluationDimension[]
) => {
  if (!settings.baseUrl || !settings.model) return null;

  const endpoint = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const thinking = buildThinkingRequestFields(settings.thinkingLevel);
  const thinkingHint = thinking.enable_thinking
    ? `请先进行${thinking.thinkingLevel === 'low' ? '简要' : thinking.thinkingLevel === 'high' ? '深入' : '适度'}内部推理，再给出评价。`
    : '请直接给出评价，无需冗长推理。';

  const systemPrompt = [
    '你是中学劳动教育课程的智能评价助手。',
    thinkingHint,
    '请只输出 JSON，不要 Markdown 代码块，不要额外解释。',
    '输出格式：{"scores":{"attitude":1-5整数,"skill":1-5整数,"result":1-5整数},"summary":"一句话总评","suggestions":["建议1","建议2"]}',
  ].join('\n');

  const userPrompt = {
    achievement: {
      title: achievement.title,
      description: achievement.description,
      reflection: achievement.reflection,
      courseTitle: achievement.courseTitle,
    },
    dimensions: dimensions.map(({ key, label, description, prompt, weight }) => ({
      key,
      label,
      description,
      prompt,
      weight,
    })),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model: settings.model,
      temperature: settings.temperature,
      // 透传思考等级相关字段（不同厂商可能识别不同键名）
      enable_thinking: thinking.enable_thinking,
      reasoning_effort: thinking.reasoning_effort,
      ...(thinking.enable_thinking ? { thinking_budget: thinking.thinking_budget } : {}),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPrompt) },
      ],
    }),
  });

  if (!response.ok) return null;
  return (await response.json()) as AgentResponse;
};

export const evaluateAchievementWithAgent = async (
  achievement: Achievement,
  dimensions: EvaluationDimension[]
): Promise<AiEvaluationResult> => {
  const settings = await getAiRuntimeSettings();

  if (!settings.enabled || !settings.baseUrl) {
    return fallbackEvaluation(achievement);
  }

  try {
    const payload = buildAgentPayload(achievement, dimensions, settings);
    const data = settings.provider === 'openai_compatible'
      ? await callOpenAiCompatible(settings, achievement, dimensions)
      : await callCustomAgent(settings, payload);

    if (!data) {
      return fallbackEvaluation(achievement);
    }

    return normalizeAgentResult(data) || fallbackEvaluation(achievement);
  } catch (error) {
    console.error('AI evaluation agent error:', error);
    return fallbackEvaluation(achievement);
  }
};
