import { useState } from 'react';
import { Avatar, Stars } from '@/features/shared/components/ui';
import type { Achievement } from '../types';
import { LikeButton } from './LikeButton';
import { EvaluationModal } from './EvaluationModal';

interface AchievementCardProps {
  achievement: Achievement;
}

const API_BASE = 'http://localhost:3001';

export const AchievementCard = ({ achievement }: AchievementCardProps) => {
  const [showEvalModal, setShowEvalModal] = useState(false);

  const hasRealImage = (images: string[]) => {
    return images.length > 0 && images[0].startsWith('/uploads');
  };

  const handleEvalSuccess = () => {
    // 成功后刷新数据
  };
  
  return (
    <>
      <div 
        className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer break-inside-avoid mb-4"
        onClick={() => setShowEvalModal(true)}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar
            emoji={achievement.student.avatarEmoji}
            size="md"
            className="bg-brand-green-pale"
          />
          <div>
            <div className="text-sm font-semibold">{achievement.student.nickname}</div>
            <div className="text-xs text-text-muted">
              {achievement.student.classCode}
            </div>
          </div>
        </div>

        <div className="mb-2.5">
          <span className="text-xs text-text-muted">来自「{achievement.course.title}」</span>
        </div>

        <h3 className="text-base font-bold mb-2">{achievement.title}</h3>
        <p className="text-sm text-text-soft leading-relaxed mb-3">
          {achievement.description}
        </p>

        {achievement.images.length > 0 && (
          <div className="mb-3">
            {hasRealImage(achievement.images) ? (
              <img
                src={`${API_BASE}${achievement.images[0]}`}
                alt="成果照片"
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: '200px' }}
              />
            ) : (
              <div className="w-full rounded-xl bg-brand-sand h-32 flex items-center justify-center text-4xl">
                {achievement.images[0]}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Stars value={Math.round(achievement.avgAttitude ?? achievement.evalAttitude)} size="sm" />
            {(achievement.evalCount ?? 0) > 0 && (
              <span className="text-xs text-text-muted">({achievement.evalCount}人评)</span>
            )}
          </div>
          <LikeButton
            achievementId={achievement.id}
            likesCount={achievement.likesCount}
            isLiked={achievement.isLikedByMe}
          />
        </div>
      </div>

      <EvaluationModal
        isOpen={showEvalModal}
        achievementId={achievement.id}
        onClose={() => setShowEvalModal(false)}
        onSuccess={handleEvalSuccess}
      />
    </>
  );
};