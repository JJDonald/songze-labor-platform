import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import type { EvaluationDimension } from '@/features/admin/api/adminApi';

const dimensionTone: Record<EvaluationDimension['key'], string> = {
  attitude: 'from-emerald-50 to-lime-50 border-emerald-200',
  skill: 'from-sky-50 to-cyan-50 border-sky-200',
  result: 'from-amber-50 to-orange-50 border-amber-200',
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
      if (response.code !== 0 || !response.data) {
        setMessage(response.message || '保存失败，请稍后重试。');
        return;
      }

      setDrafts(response.data);
      setMessage('评价维度已保存，AI 智能体下次评价会使用最新配置。');
      queryClient.setQueryData(['admin', 'evaluation-dimensions'], response);
    },
    onError: () => setMessage('保存失败，请检查网络或服务状态。'),
  });

  const resetMutation = useMutation({
    mutationFn: adminApi.resetEvaluationDimensions,
    onSuccess: (response) => {
      if (response.code !== 0 || !response.data) {
        setMessage(response.message || '恢复默认配置失败，请稍后重试。');
        return;
      }

      setDrafts(response.data);
      setMessage('已恢复默认评价维度。');
      queryClient.setQueryData(['admin', 'evaluation-dimensions'], response);
    },
    onError: () => setMessage('恢复默认配置失败，请检查网络或服务状态。'),
  });

  const updateDraft = <K extends keyof EvaluationDimension>(index: number, key: K, value: EvaluationDimension[K]) => {
    setMessage(null);
    setDrafts((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
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
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold text-emerald-700">AI Agent Rubric</div>
          <h1 className="text-3xl font-bold">🤖 评价维度配置</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理 AI 智能体评价学生成果时使用的维度名称、说明、权重和提示词。系统会保留态度、技能、成果三类数据结构，避免影响现有评价统计。
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending || saveMutation.isPending}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {resetMutation.isPending ? '恢复中...' : '恢复默认'}
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || resetMutation.isPending || drafts.length === 0}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      <div className="grid gap-5">
        {drafts.map((dimension, index) => (
          <section
            key={dimension.key}
            className={`rounded-2xl border bg-gradient-to-br ${dimensionTone[dimension.key]} p-5 shadow-sm`}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-gray-500">{dimension.key}</div>
                <h2 className="text-xl font-bold">{dimension.label}</h2>
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">维度名称</span>
                <input
                  value={dimension.label}
                  onChange={(event) => updateDraft(index, 'label', event.target.value)}
                  className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2 outline-none focus:border-emerald-500"
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
                  className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">维度说明</span>
              <textarea
                value={dimension.description}
                onChange={(event) => updateDraft(index, 'description', event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">AI 提示词</span>
              <textarea
                value={dimension.prompt}
                onChange={(event) => updateDraft(index, 'prompt', event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/80 bg-white/90 px-4 py-2 outline-none focus:border-emerald-500"
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
  const { data: dimensionsData, isLoading, isError } = useQuery({
    queryKey: ['admin', 'evaluation-dimensions'],
    queryFn: adminApi.getEvaluationDimensions,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-brand-cream p-6">加载中...</div>;
  }

  if (isError || dimensionsData?.code !== 0 || !dimensionsData.data) {
    return (
      <div className="min-h-screen bg-brand-cream p-6 text-red-700">
        {dimensionsData?.message || '评价维度加载失败，请检查服务状态后重试。'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream py-8">
      <div className="mx-auto max-w-6xl px-6">
        <DimensionsEditor initialDimensions={dimensionsData.data} />
      </div>
    </div>
  );
};
