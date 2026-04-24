import { useState, useEffect } from 'react';
import { Modal, Button } from '@/features/shared/components/ui';
import { cn } from '@/features/shared/lib';
import { achievementsApi } from '@/features/achievements/api';

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
}

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
  const [hasEvaluated, setHasEvaluated] = useState(false);

  useEffect(() => {
    if (isOpen && achievementId) {
      fetchAchievement();
    }
  }, [isOpen, achievementId]);

  const fetchAchievement = async () => {
    if (!achievementId) return;
    
    setIsLoading(true);
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
    }
    setIsLoading(false);
  };

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
              <div className="flex gap-4 text-sm">
                <span>态度: {'★'.repeat(achievement.evalAttitude)}</span>
                <span>技能: {'★'.repeat(achievement.evalSkill)}</span>
                <span>成果: {'★'.repeat(achievement.evalResult)}</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-sm">劳动态度</span>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-yellow">{'★'.repeat(Math.round(achievement.avgAttitude))}{'☆'.repeat(5 - Math.round(achievement.avgAttitude))}</span>
                    <span className="text-xs text-text-muted">{achievement.avgAttitude.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">劳动技能</span>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-yellow">{'★'.repeat(Math.round(achievement.avgSkill))}{'☆'.repeat(5 - Math.round(achievement.avgSkill))}</span>
                    <span className="text-xs text-text-muted">{achievement.avgSkill.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">劳动成果</span>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-yellow">{'★'.repeat(Math.round(achievement.avgResult))}{'☆'.repeat(5 - Math.round(achievement.avgResult))}</span>
                    <span className="text-xs text-text-muted">{achievement.avgResult.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 评价表单（非本人可评价） */}
          {!achievement.isOwner && (
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-3">
                {hasEvaluated ? '修改我的评价' : '给出你的评价'}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">劳动态度</span>
                  {renderStars(attitude, setAttitude)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">劳动技能</span>
                  {renderStars(skill, setSkill)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">劳动成果</span>
                  {renderStars(result, setResult)}
                </div>
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