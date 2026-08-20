import prisma from '../prisma.js';
import {
  AI_AGENT_API_KEY,
  AI_AGENT_BASE_URL,
  AI_AGENT_MODEL,
  AI_AGENT_PROVIDER,
} from '../config.js';

export type AiProvider = 'custom' | 'openai_compatible';
export type AiThinkingLevel = 'off' | 'low' | 'medium' | 'high';

export interface AiRuntimeSettings {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  endpointPath: string;
  temperature: number;
  thinkingLevel: AiThinkingLevel;
  enabled: boolean;
}

export interface AiPublicSettings {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  endpointPath: string;
  temperature: number;
  thinkingLevel: AiThinkingLevel;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
  source: 'database' | 'env' | 'default';
  evaluateUrl: string;
}

const SETTING_KEYS = {
  provider: 'ai.provider',
  baseUrl: 'ai.baseUrl',
  apiKey: 'ai.apiKey',
  model: 'ai.model',
  endpointPath: 'ai.endpointPath',
  temperature: 'ai.temperature',
  thinkingLevel: 'ai.thinkingLevel',
  enabled: 'ai.enabled',
} as const;

const maskSecret = (value: string) => {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 3)}${'*'.repeat(Math.min(12, value.length - 6))}${value.slice(-3)}`;
};

const parseProvider = (value?: string | null): AiProvider => {
  if (value === 'openai_compatible') return 'openai_compatible';
  return 'custom';
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
};

const parseTemperature = (value: string | undefined, fallback: number) => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2, Math.max(0, parsed));
};

export const parseThinkingLevel = (
  value?: string | null,
  fallback: AiThinkingLevel = 'off'
): AiThinkingLevel => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'off' || normalized === 'none' || normalized === 'disabled' || normalized === '0') {
    return 'off';
  }
  if (normalized === 'low' || normalized === 'minimal') return 'low';
  if (normalized === 'medium' || normalized === 'mid' || normalized === 'default') return 'medium';
  if (normalized === 'high' || normalized === 'max') return 'high';
  return fallback;
};

const DEFAULT_SETTINGS: AiRuntimeSettings = {
  provider: (AI_AGENT_PROVIDER as AiProvider) || 'custom',
  baseUrl: AI_AGENT_BASE_URL || '',
  apiKey: AI_AGENT_API_KEY || '',
  model: AI_AGENT_MODEL || '',
  endpointPath: '/evaluate',
  temperature: 0.3,
  thinkingLevel: parseThinkingLevel(process.env.AI_AGENT_THINKING_LEVEL, 'off'),
  enabled: Boolean(AI_AGENT_BASE_URL),
};

/** 把思考等级映射为常见厂商字段，便于 OpenAI 兼容接口透传 */
export const buildThinkingRequestFields = (level: AiThinkingLevel) => {
  if (level === 'off') {
    return {
      thinkingLevel: level,
      enable_thinking: false,
      reasoning_effort: 'none',
    };
  }

  return {
    thinkingLevel: level,
    enable_thinking: true,
    // OpenAI o 系列 / 兼容接口常用
    reasoning_effort: level,
    // 部分国内兼容接口（如 Qwen thinking）使用预算步数
    thinking_budget: level === 'low' ? 256 : level === 'medium' ? 512 : 1024,
  };
};

const normalizeEndpointPath = (value?: string | null) => {
  const raw = (value || '/evaluate').trim() || '/evaluate';
  if (/^https?:\/\//i.test(raw)) return '/evaluate';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const buildEvaluateUrl = (settings: AiRuntimeSettings) => {
  const path = normalizeEndpointPath(settings.endpointPath);
  if (/^https?:\/\//i.test(path)) return path;
  if (!settings.baseUrl.trim()) return '';
  return `${settings.baseUrl.replace(/\/$/, '')}${path}`;
};

const mapFromStore = (
  map: Record<string, string>,
  fallback: AiRuntimeSettings
): AiRuntimeSettings => {
  return {
    provider: parseProvider(map[SETTING_KEYS.provider] ?? fallback.provider),
    baseUrl: map[SETTING_KEYS.baseUrl] ?? fallback.baseUrl,
    apiKey: map[SETTING_KEYS.apiKey] ?? fallback.apiKey,
    model: map[SETTING_KEYS.model] ?? fallback.model,
    endpointPath: normalizeEndpointPath(map[SETTING_KEYS.endpointPath] ?? fallback.endpointPath),
    temperature: parseTemperature(map[SETTING_KEYS.temperature], fallback.temperature),
    thinkingLevel: parseThinkingLevel(map[SETTING_KEYS.thinkingLevel], fallback.thinkingLevel),
    enabled: parseBoolean(map[SETTING_KEYS.enabled], fallback.enabled),
  };
};

export const getAiRuntimeSettings = async (): Promise<AiRuntimeSettings> => {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: Object.values(SETTING_KEYS),
      },
    },
  });

  if (rows.length === 0) {
    return { ...DEFAULT_SETTINGS };
  }

  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return mapFromStore(map, DEFAULT_SETTINGS);
};

export const getAiPublicSettings = async (): Promise<AiPublicSettings> => {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: Object.values(SETTING_KEYS),
      },
    },
  });

  const source: AiPublicSettings['source'] = rows.length > 0
    ? 'database'
    : (AI_AGENT_BASE_URL || AI_AGENT_API_KEY || AI_AGENT_MODEL ? 'env' : 'default');

  const settings = rows.length > 0
    ? mapFromStore(Object.fromEntries(rows.map((row) => [row.key, row.value])), DEFAULT_SETTINGS)
    : { ...DEFAULT_SETTINGS };

  return {
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model,
    endpointPath: settings.endpointPath,
    temperature: settings.temperature,
    thinkingLevel: settings.thinkingLevel,
    enabled: settings.enabled,
    hasApiKey: Boolean(settings.apiKey),
    apiKeyMasked: maskSecret(settings.apiKey),
    source,
    evaluateUrl: buildEvaluateUrl(settings),
  };
};

export interface UpdateAiSettingsInput {
  provider?: AiProvider | string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  endpointPath?: string;
  temperature?: number | string;
  thinkingLevel?: AiThinkingLevel | string;
  enabled?: boolean;
  clearApiKey?: boolean;
}

export const updateAiSettings = async (input: UpdateAiSettingsInput): Promise<AiPublicSettings> => {
  const current = await getAiRuntimeSettings();

  const next: AiRuntimeSettings = {
    provider: parseProvider(input.provider ?? current.provider),
    baseUrl: typeof input.baseUrl === 'string' ? input.baseUrl.trim() : current.baseUrl,
    apiKey: input.clearApiKey
      ? ''
      : typeof input.apiKey === 'string' && input.apiKey.trim()
        ? input.apiKey.trim()
        : current.apiKey,
    model: typeof input.model === 'string' ? input.model.trim() : current.model,
    endpointPath: (() => {
      const raw = typeof input.endpointPath === 'string' ? input.endpointPath.trim() : current.endpointPath;
      if (/^https?:\/\//i.test(raw)) {
        throw new Error('接口路径不能填写完整 URL，请只填写相对路径，例如 /evaluate');
      }
      return normalizeEndpointPath(raw);
    })(),
    temperature: parseTemperature(
      input.temperature === undefined ? String(current.temperature) : String(input.temperature),
      current.temperature
    ),
    thinkingLevel: parseThinkingLevel(
      input.thinkingLevel === undefined ? current.thinkingLevel : String(input.thinkingLevel),
      current.thinkingLevel
    ),
    enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
  };

  if (next.enabled && !next.baseUrl) {
    throw new Error('启用 AI 评价时必须填写服务地址 Base URL');
  }

  const pairs: Array<[string, string]> = [
    [SETTING_KEYS.provider, next.provider],
    [SETTING_KEYS.baseUrl, next.baseUrl],
    [SETTING_KEYS.apiKey, next.apiKey],
    [SETTING_KEYS.model, next.model],
    [SETTING_KEYS.endpointPath, next.endpointPath],
    [SETTING_KEYS.temperature, String(next.temperature)],
    [SETTING_KEYS.thinkingLevel, next.thinkingLevel],
    [SETTING_KEYS.enabled, String(next.enabled)],
  ];

  await Promise.all(
    pairs.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return getAiPublicSettings();
};

export const getAiEvaluateUrl = (settings: AiRuntimeSettings) => buildEvaluateUrl(settings);

export const testAiConnection = async () => {
  const settings = await getAiRuntimeSettings();
  const evaluateUrl = buildEvaluateUrl(settings);

  if (!settings.enabled) {
    return {
      ok: false,
      message: 'AI 评价未启用',
      evaluateUrl,
      settings: await getAiPublicSettings(),
    };
  }

  if (!evaluateUrl) {
    return {
      ok: false,
      message: '未配置可用的 AI 服务地址',
      evaluateUrl: '',
      settings: await getAiPublicSettings(),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    if (settings.provider === 'openai_compatible') {
      // 兼容 OpenAI：尝试 models 列表，不行再退回 chat 探针
      const modelsUrl = `${settings.baseUrl.replace(/\/$/, '')}/models`;
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        signal: controller.signal,
      });

      if (response.ok) {
        return {
          ok: true,
          message: 'OpenAI 兼容接口连接成功',
          evaluateUrl,
          status: response.status,
          settings: await getAiPublicSettings(),
        };
      }

      return {
        ok: false,
        message: `连接失败：HTTP ${response.status}`,
        evaluateUrl,
        status: response.status,
        settings: await getAiPublicSettings(),
      };
    }

    const response = await fetch(evaluateUrl, {
      method: 'OPTIONS',
      signal: controller.signal,
      headers: {
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
    });

    // 有些自定义服务不支持 OPTIONS，改发一个轻量 POST 探测（忽略业务错误，只要网络通）
    if (response.status === 404 || response.status === 405) {
      const probe = await fetch(evaluateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({ probe: true }),
        signal: controller.signal,
      });

      return {
        ok: probe.status < 500,
        message: probe.status < 500
          ? `服务可达（HTTP ${probe.status}）`
          : `服务响应异常（HTTP ${probe.status}）`,
        evaluateUrl,
        status: probe.status,
        settings: await getAiPublicSettings(),
      };
    }

    return {
      ok: response.status < 500,
      message: response.status < 500
        ? `服务可达（HTTP ${response.status}）`
        : `服务响应异常（HTTP ${response.status}）`,
      evaluateUrl,
      status: response.status,
      settings: await getAiPublicSettings(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '连接失败';
    return {
      ok: false,
      message: message.includes('abort') ? '连接超时，请检查地址与网络' : `连接失败：${message}`,
      evaluateUrl,
      settings: await getAiPublicSettings(),
    };
  } finally {
    clearTimeout(timer);
  }
};
