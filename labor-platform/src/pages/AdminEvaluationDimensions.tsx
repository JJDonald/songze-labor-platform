import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import type { AiSettings, EvaluationDimension } from '@/features/admin/api/adminApi';

const dimensionTone: Record<EvaluationDimension['key'], string> = {
  attitude: 'from-emerald-50 to-lime-50 border-emerald-200',
  skill: 'from-sky-50 to-cyan-50 border-sky-200',
  result: 'from-amber-50 to-orange-50 border-amber-200',
};

interface AiSettingsEditorProps {
  initialSettings: AiSettings;
}

const AiSettingsEditor = ({ initialSettings }: AiSettingsEditorProps) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    enabled: initialSettings.enabled,
    provider: initialSettings.provider,
    baseUrl: initialSettings.baseUrl,
    model: initialSettings.model,
    endpointPath: initialSettings.endpointPath || '/evaluate',
    temperature: initialSettings.temperature,
    thinkingLevel: initialSettings.thinkingLevel || 'off',
    apiKey: '',
    clearApiKey: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const saveMutation = useMutation({
    mutationFn: adminApi.updateAiSettings,
    onSuccess: (response) => {
      setDraft({
        enabled: response.data.enabled,
        provider: response.data.provider,
        baseUrl: response.data.baseUrl,
        model: response.data.model,
        endpointPath: response.data.endpointPath || '/evaluate',
        temperature: response.data.temperature,
        thinkingLevel: response.data.thinkingLevel || 'off',
        apiKey: '',
        clearApiKey: false,
      });
      setMessage(response.message || 'AI 对接配置已保存。');
      queryClient.setQueryData(['admin', 'ai-settings'], response);
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : '保存 AI 配置失败，请检查网络或服务状态。'),
  });

  const testMutation = useMutation({
    mutationFn: adminApi.testAiSettings,
    onSuccess: (response) => {
      setMessage(response.message || '连接测试成功');
    },
    onError: () => setMessage('连接测试失败，请检查网络或服务状态。'),
  });

  const updateField = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setMessage(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setMessage(null);
    saveMutation.mutate({
      enabled: draft.enabled,
      provider: draft.provider,
      baseUrl: draft.baseUrl.trim(),
      model: draft.model.trim(),
      endpointPath: draft.endpointPath.trim() || '/evaluate',
      temperature: Number(draft.temperature),
      thinkingLevel: draft.thinkingLevel,
      apiKey: draft.apiKey.trim() || undefined,
      clearApiKey: draft.clearApiKey,
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">AI Connection</div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">🔌 AI 服务对接</h2>
          <p className="mt-1 text-sm text-gray-600">
            配置智能体 Base URL、API Key、Model 等参数。保存后立即生效；未配置或连接失败时会自动降级为本地规则评价。
          </p>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => updateField('enabled', event.target.checked)}
          />
          启用 AI 评价
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold">提供方 Provider</span>
          <select
            value={draft.provider}
            onChange={(event) => updateField('provider', event.target.value as AiSettings['provider'])}
            className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
          >
            <option value="custom">自定义 Agent（POST /evaluate）</option>
            <option value="openai_compatible">OpenAI 兼容（/chat/completions）</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold">服务地址 Base URL</span>
          <input
            value={draft.baseUrl}
            onChange={(event) => updateField('baseUrl', event.target.value)}
            placeholder="例如 https://api.example.com 或 http://127.0.0.1:8000"
            className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
            inputMode="url"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">模型 Model</span>
          <input
            value={draft.model}
            onChange={(event) => updateField('model', event.target.value)}
            placeholder="例如 gpt-4o-mini / qwen-plus"
            className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Temperature</span>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={draft.temperature}
            onChange={(event) => updateField('temperature', Number(event.target.value))}
            className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold">思考等级 Thinking Level</span>
          <select
            value={draft.thinkingLevel}
            onChange={(event) =>
              updateField('thinkingLevel', event.target.value as typeof draft.thinkingLevel)
            }
            className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
          >
            <option value="off">关闭（更快，适合简单成果）</option>
            <option value="low">低（轻量推理）</option>
            <option value="medium">中（推荐，评价更稳）</option>
            <option value="high">高（更深入，更慢更耗 token）</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            控制模型内部推理深度。关闭=直接给结果；越高越认真分析，但更慢、费用更高。部分模型不支持时会自动忽略。
          </p>
        </label>

        {draft.provider === 'custom' && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">接口路径 Endpoint Path</span>
            <input
              value={draft.endpointPath}
              onChange={(event) => updateField('endpointPath', event.target.value)}
              placeholder="/evaluate"
              className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
              autoComplete="off"
            />
          </label>
        )}

        <label className="block sm:col-span-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">API Key</span>
            <span className="text-xs text-gray-500">
              {initialSettings.hasApiKey
                ? `已配置：${initialSettings.apiKeyMasked || '******'}`
                : '尚未配置密钥'}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={draft.apiKey}
              onChange={(event) => {
                updateField('apiKey', event.target.value);
                if (event.target.value) updateField('clearApiKey', false);
              }}
              placeholder={initialSettings.hasApiKey ? '留空表示不修改现有密钥' : '请输入 API Key'}
              className="w-full flex-1 rounded-xl border border-indigo-100 bg-white px-4 py-2.5 outline-none focus:border-indigo-400"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((value) => !value)}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-50"
            >
              {showApiKey ? '隐藏' : '显示'}
            </button>
          </div>
          {initialSettings.hasApiKey && (
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={draft.clearApiKey}
                onChange={(event) => {
                  updateField('clearApiKey', event.target.checked);
                  if (event.target.checked) updateField('apiKey', '');
                }}
              />
              清除已保存的 API Key
            </label>
          )}
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-white/70 p-3 text-xs leading-5 text-gray-600 sm:text-sm">
        <div>
          当前生效来源：
          <strong className="mx-1">
            {initialSettings.source === 'database' ? '管理后台' : initialSettings.source === 'env' ? '环境变量' : '默认空配置'}
          </strong>
        </div>
        <div className="mt-1 break-all">
          实际请求地址：
          <span className="font-mono text-indigo-700">
            {draft.provider === 'openai_compatible'
              ? `${draft.baseUrl.replace(/\/$/, '') || '(未填 Base URL)'}/chat/completions`
              : draft.baseUrl
                ? `${draft.baseUrl.replace(/\/$/, '')}${draft.endpointPath.startsWith('/') ? draft.endpointPath : `/${draft.endpointPath}`}`
                : '(未填 Base URL)'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            testMutation.mutate();
          }}
          disabled={testMutation.isPending || saveMutation.isPending}
          className="rounded-full border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          {testMutation.isPending ? '测试中...' : '测试连接'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending || testMutation.isPending}
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? '保存中...' : '保存 AI 配置'}
        </button>
      </div>

      {message && (
        <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
          {message}
        </div>
      )}
    </section>
  );
};

interface DimensionsEditorProps {
  initialDimensions: EvaluationDimension[];
}

const DimensionsEditor = ({ initialDimensions }: DimensionsEditorProps) => {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState(() => initialDimensions);
  const [message, setMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: adminApi.updateEvaluationDimensions,
    onSuccess: (response) => {
      setDrafts(response.data);
      setMessage('评价维度已保存，AI 智能体下次评价会使用最新配置。');
      queryClient.setQueryData(['admin', 'evaluation-dimensions'], response);
    },
    onError: () => setMessage('保存失败，请检查网络或服务状态。'),
  });

  const resetMutation = useMutation({
    mutationFn: adminApi.resetEvaluationDimensions,
    onSuccess: (response) => {
      setDrafts(response.data);
      setMessage('已恢复默认评价维度。');
      queryClient.setQueryData(['admin', 'evaluation-dimensions'], response);
    },
    onError: () => setMessage('恢复默认配置失败，请检查网络或服务状态。'),
  });

  const updateDraft = <K extends keyof EvaluationDimension>(index: number, key: K, value: EvaluationDimension[K]) => {
    setMessage(null);
    setDrafts((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const handleSave = () => {
    setMessage(null);
    saveMutation.mutate(drafts);
  };

  const handleReset = () => {
    if (confirm('确定恢复默认评价维度吗？当前编辑内容会被覆盖。')) {
      setMessage(null);
      resetMutation.mutate();
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-emerald-700">AI Agent Rubric</div>
          <h2 className="text-2xl font-bold sm:text-3xl">🤖 评价维度配置</h2>
          <p className="mt-2 text-sm text-gray-600">
            管理 AI 智能体评价学生成果时使用的维度名称、说明、权重和提示词。系统会保留态度、技能、成果三类数据结构，避免影响现有评价统计。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending || saveMutation.isPending}
            className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {resetMutation.isPending ? '恢复中...' : '恢复默认'}
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || resetMutation.isPending || drafts.length === 0}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? '保存中...' : '保存维度配置'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5">
        {drafts.map((dimension, index) => (
          <section
            key={dimension.key}
            className={`rounded-2xl border bg-gradient-to-br ${dimensionTone[dimension.key]} p-4 shadow-sm sm:p-5`}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-gray-500">{dimension.key}</div>
                <h3 className="text-lg font-bold sm:text-xl">{dimension.label}</h3>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={dimension.isEnabled}
                  onChange={(event) => updateDraft(index, 'isEnabled', event.target.checked)}
                />
                启用
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">维度名称</span>
                <input
                  value={dimension.label}
                  onChange={(event) => updateDraft(index, 'label', event.target.value)}
                  className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold">权重</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={dimension.weight}
                  onChange={(event) => updateDraft(index, 'weight', Number(event.target.value))}
                  className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">维度说明</span>
              <textarea
                value={dimension.description}
                onChange={(event) => updateDraft(index, 'description', event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2.5 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">AI 提示词</span>
              <textarea
                value={dimension.prompt}
                onChange={(event) => updateDraft(index, 'prompt', event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2.5 outline-none focus:border-emerald-500"
              />
            </label>
          </section>
        ))}
      </div>

      {message && (
        <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
          {message}
        </div>
      )}
    </>
  );
};

export const AdminEvaluationDimensions = () => {
  const {
    data: dimensionsData,
    isLoading: dimensionsLoading,
    isError: dimensionsError,
  } = useQuery({
    queryKey: ['admin', 'evaluation-dimensions'],
    queryFn: adminApi.getEvaluationDimensions,
  });

  const {
    data: aiSettingsData,
    isLoading: aiLoading,
    isError: aiError,
  } = useQuery({
    queryKey: ['admin', 'ai-settings'],
    queryFn: adminApi.getAiSettings,
  });

  if (dimensionsLoading || aiLoading) {
    return <div className="min-h-screen bg-brand-cream p-4 sm:p-6">加载中...</div>;
  }

  if (dimensionsError || !dimensionsData?.data) {
    return (
      <div className="min-h-screen bg-brand-cream p-4 text-red-700 sm:p-6">
        {dimensionsData?.message || '评价维度加载失败，请检查服务状态后重试。'}
      </div>
    );
  }

  if (aiError || !aiSettingsData?.data) {
    return (
      <div className="min-h-screen bg-brand-cream p-4 text-red-700 sm:p-6">
        {aiSettingsData?.message || 'AI 配置加载失败，请检查服务状态后重试。'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">🤖 AI 评价管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            统一管理 AI 服务对接参数与评价维度。适合手机与微信内置浏览器操作。
          </p>
        </div>

        <AiSettingsEditor initialSettings={aiSettingsData.data} />
        <DimensionsEditor initialDimensions={dimensionsData.data} />
      </div>
    </div>
  );
};
