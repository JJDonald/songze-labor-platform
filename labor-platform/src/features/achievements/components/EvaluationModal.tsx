import { useCallback, useEffect, useState } from 'react';
import { Modal, Button } from '@/features/shared/components/ui';
import { cn } from '@/features/shared/lib';
import { achievementsApi } from '@/features/achievements/api';
import type { AiEvaluationResult, EvaluationDimension } from '@/features/achievements/api/achievementsApi';

interface Achievement {
  id: string;
  student: {
    id: string;
    nickname: string;
    avatarEmoji: string;
    gradeId: number;
    classCode: string;
  };
  course: {
    title: string;
    taskGroupId: string;
  } | null;
  title: string;
  description: string;
  reflection?: string;
  images: string[];
  evalAttitude: number;
  evalSkill: number;
  evalResult: number;
  avgAttitude: number;
  avgSkill: number;
  avgResult: number;
  evalCount: number;
  likesCount: number;
  createdAt: string;
  isLikedByMe: boolean;
  myEvaluation?: {
    attitude: number;
    skill: number;
    result: number;
  } | null;
  isOwner: boolean;
  evaluationDimensions?: EvaluationDimension[];
}

type ScoreKey = 'attitude' | 'skill' | 'result';

const fallbackDimensions: EvaluationDimension[] = [
  { id: 'attitude', key: 'attitude', label: '劳动态度', description: '投入、坚持与责任意识', prompt: '', weight: 1, sortOrder: 1, isEnabled: true },
  { id: 'skill', key: 'skill', label: '劳动技能', description: '方法、工具与步骤掌握', prompt: '', weight: 1, sortOrder: 2, isEnabled: true },
  { id: 'result', key: 'result', label: '劳动成果', description: '完成度、质量与表达', prompt: '', weight: 1, sortOrder: 3, isEnabled: true },
];

interface EvaluationModalProps {
  isOpen: boolean;
  achievementId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

import { API_ORIGIN } from '@/lib/api';

export const EvaluationModal = ({ isOpen, achievementId, onClose, onSuccess }: EvaluationModalProps) => {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [attitude, setAttitude] = useState(0);
  const [skill, setSkill] = useState(0);
  const [result, setResult] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<AiEvaluationResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasEvaluated, setHasEvaluated] = useState(false);

  const fetchAchievement = useCallback(async (resetAiResult = true) => {
    if (!achievementId) return;

    setIsLoading(true);
    try {
      const data = await achievementsApi.getById(achievementId);
      if (data) {
        setAchievement(data);
        if (data.myEvaluation) {
          setAttitude(data.myEvaluation.attitude);
          setSkill(data.myEvaluation.skill);
          setResult(data.myEvaluation.result);
          setHasEvaluated(true);
        } else {
          setAttitude(0);
          setSkill(0);
          setResult(0);
          setHasEvaluated(false);
        }
        if (resetAiResult) {
          setAiResult(null);
          setAiError(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [achievementId]);

  useEffect(() => {
    if (isOpen && achievementId) {
      void fetchAchievement();
    }
  }, [isOpen, achievementId, fetchAchievement]);

  const handleSubmit = async () => {
    if (!achievementId || attitude === 0 || skill === 0 || result === 0) return;
    
    setIsSubmitting(true);
    const success = await achievementsApi.evaluate(achievementId, attitude, skill, result);
    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  const scoreState: Record<ScoreKey, { value: number; setValue: (value: number) => void; average: number; ownerValue: number }> = {
    attitude: { value: attitude, setValue: setAttitude, average: achievement?.avgAttitude || 0, ownerValue: achievement?.evalAttitude || 0 },
    skill: { value: skill, setValue: setSkill, average: achievement?.avgSkill || 0, ownerValue: achievement?.evalSkill || 0 },
    result: { value: result, setValue: setResult, average: achievement?.avgResult || 0, ownerValue: achievement?.evalResult || 0 },
  };

  const dimensions = (achievement?.evaluationDimensions?.length ? achievement.evaluationDimensions : fallbackDimensions)
    .filter((dimension) => dimension.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAiEvaluate = async () => {
    if (!achievementId) return;

    setIsAiEvaluating(true);
    setAiError(null);
    try {
      const resultData = await achievementsApi.aiEvaluate(achievementId);
      if (!resultData) {
        setAiError('AI 评价失败，请检查服务状态后重试。');
        return;
      }

      setAttitude(resultData.scores.attitude);
      setSkill(resultData.scores.skill);
      setResult(resultData.scores.result);
      setAiResult(resultData);
      setHasEvaluated(true);
      await fetchAchievement(false);
      onSuccess();
    } catch {
      setAiError('AI 评价请求异常，请检查网络后重试。');
    } finally {
      setIsAiEvaluating(false);
    }
  };

  const renderStars = (value: number, onChange: (v: number) => void, disabled: boolean = false) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => !disabled && onChange(star)}
          className={cn(
            'text-3xl transition-all',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110',
            star <= value ? 'text-brand-yellow' : 'text-gray-300'
          )}
          disabled={disabled}
        >
          ★
        </button>
      ))}
    </div>
  );

  const hasRealImage = (images: string[]) => {
    return images.length > 0 && images[0].startsWith('/uploads');
  };

  if (!achievement) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={achievement.title}>
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-2xl">加载中...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 成果信息 */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="text-3xl">{achievement.student.avatarEmoji}</div>
            <div>
              <div className="font-semibold">{achievement.student.nickname}</div>
              <div className="text-xs text-text-muted">{achievement.student.classCode}</div>
            </div>
          </div>

          {/* 成果描述 */}
          <div>
            <p className="text-sm text-text-soft">{achievement.description}</p>
          </div>

          {/* 照片 */}
          {achievement.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {achievement.images.map((img, idx) => (
                hasRealImage([img]) ? (
                  <img
                    key={idx}
                    src={`${API_ORIGIN}${img}`}
                    alt={`照片 ${idx + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ) : (
                  <div key={idx} className="w-full aspect-square flex items-center justify-center text-3xl bg-brand-sand rounded-lg">
                    {img}
                  </div>
                )
              ))}
            </div>
          )}

          {/* 自己的评价（如果有） */}
          {achievement.isOwner && (
            <div className="bg-brand-green-pale rounded-xl p-4">
              <div className="text-sm font-semibold mb-2">我的自我评价</div>
              <div className="flex flex-wrap gap-4 text-sm">
                {dimensions.map((dimension) => (
                  <span key={dimension.key}>{dimension.label}: {'★'.repeat(scoreState[dimension.key].ownerValue)}</span>
                ))}
              </div>
            </div>
          )}

          {/* 平均评价 */}
          {achievement.evalCount > 0 && (
            <div className="bg-brand-cream rounded-xl p-4">
              <div className="text-sm font-semibold mb-2">
                大家评价 ({achievement.evalCount}人)
              </div>
              <div className="space-y-2">
                {dimensions.map((dimension) => {
                  const average = scoreState[dimension.key].average;
                  return (
                    <div key={dimension.key} className="flex items-center justify-between">
                      <span className="text-sm">{dimension.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-yellow">{'★'.repeat(Math.round(average))}{'☆'.repeat(5 - Math.round(average))}</span>
                        <span className="text-xs text-text-muted">{average.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 评价表单（非本人可评价） */}
          {!achievement.isOwner && (
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-3">
                {hasEvaluated ? '修改我的评价' : '给出你的评价'}
              </div>
              
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-emerald-800">AI 智能体评价</div>
                    <p className="mt-1 text-xs text-emerald-700">
                      根据管理员配置的维度自动分析成果描述、反思和图片信息，生成评分并保存为你的评价。
                    </p>
                  </div>
                  <button
                    onClick={handleAiEvaluate}
                    disabled={isAiEvaluating || isSubmitting}
                    className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isAiEvaluating ? '分析中...' : '一键 AI 评价'}
                  </button>
                </div>

                {aiError && (
                  <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {aiError}
                  </div>
                )}

                {aiResult && (
                  <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-emerald-900">
                    <div className="font-semibold">{aiResult.source === 'agent' ? '智能体反馈' : '本地智能反馈'}</div>
                    <p className="mt-1">{aiResult.summary}</p>
                    {aiResult.suggestions.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {aiResult.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {dimensions.map((dimension) => (
                  <div key={dimension.key} className="rounded-xl bg-white/70 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-semibold">{dimension.label}</span>
                        <p className="text-xs text-text-muted">{dimension.description}</p>
                      </div>
                      {renderStars(scoreState[dimension.key].value, scoreState[dimension.key].setValue)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button
                  variant="orange"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting || attitude === 0 || skill === 0 || result === 0}
                >
                  {isSubmitting ? '提交中...' : hasEvaluated ? '更新评价' : '提交评价'}
                </Button>
              </div>
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t">
            <span>来自「{achievement.course?.title || '劳动项目'}」</span>
            <span>❤️ {achievement.likesCount}</span>
          </div>
        </div>
      )}
    </Modal>
  );
};
